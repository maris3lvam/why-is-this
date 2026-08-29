/**
 * @fileoverview API Doctor — IPC Server (App Side)
 *
 * Runs on the monitored application process.
 * Listens on a local TCP loopback port (default 5035) and serves:
 *   - GET /snapshot → full DiagnosticSnapshot JSON
 *   - GET /events   → Server-Sent Events stream of live request records
 *
 * Only binds to 127.0.0.1 — never exposed outside localhost.
 */

import { createServer, type Server, type Socket } from 'node:net';
import type { RequestRecord, DiagnosticSnapshot } from '../types.js';
import { buildSnapshot } from '../diagnostics/explanation-engine.js';
import type { BoundedRingBuffer } from '../storage/bounded-ring-buffer.js';

export const DEFAULT_IPC_PORT = 5035;

// ─── HTTP-over-raw-TCP helpers ────────────────────────────────────────────────
// We use raw net.Server (not http) to avoid requiring an HTTP server.
// The protocol is minimal HTTP/1.1 — enough for the CLI client to consume.

function sendHttpResponse(
  socket: Socket,
  statusCode: number,
  body: string,
  contentType = 'application/json'
): void {
  const response = [
    `HTTP/1.1 ${statusCode} ${statusCode === 200 ? 'OK' : 'Error'}`,
    `Content-Type: ${contentType}`,
    `Content-Length: ${Buffer.byteLength(body)}`,
    'Connection: close',
    'Access-Control-Allow-Origin: *',
    '',
    body,
  ].join('\r\n');
  socket.write(response);
  socket.end();
}

function sendSSEHeaders(socket: Socket): void {
  const headers = [
    'HTTP/1.1 200 OK',
    'Content-Type: text/event-stream',
    'Cache-Control: no-cache',
    'Connection: keep-alive',
    'Access-Control-Allow-Origin: *',
    '',
    '',
  ].join('\r\n');
  socket.write(headers);
}

function sendSSEEvent(socket: Socket, event: string, data: unknown): boolean {
  if (socket.destroyed) return false;
  try {
    socket.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch {
    return false;
  }
}

// ─── IPC Server ───────────────────────────────────────────────────────────────

export class IpcServer {
  private _server: Server | null = null;
  private readonly _sseClients: Set<Socket> = new Set();
  private _port: number;
  private _buffer: BoundedRingBuffer;
  private _maxRecentPerEndpoint: number;

  constructor(
    buffer: BoundedRingBuffer,
    port: number = DEFAULT_IPC_PORT,
    maxRecentPerEndpoint: number = 20
  ) {
    this._buffer = buffer;
    this._port = port;
    this._maxRecentPerEndpoint = maxRecentPerEndpoint;
  }

  /** Start listening. Resolves when the server is bound. */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = createServer((socket) => this._handleConnection(socket));

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          // Port already in use — another instance may be running
          // Silently skip, the CLI can try to connect
        }
        reject(err);
      });

      server.listen(this._port, '127.0.0.1', () => {
        this._server = server;
        resolve();
      });
    });
  }

  /** Push a new request record to all connected SSE clients. */
  broadcast(record: RequestRecord): void {
    for (const client of this._sseClients) {
      const ok = sendSSEEvent(client, 'request', record);
      if (!ok) {
        this._sseClients.delete(client);
      }
    }
  }

  /** Stop the IPC server and close all connections. */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const client of this._sseClients) {
        client.destroy();
      }
      this._sseClients.clear();

      if (this._server) {
        this._server.close(() => resolve());
        this._server = null;
      } else {
        resolve();
      }
    });
  }

  get isListening(): boolean {
    return this._server?.listening ?? false;
  }

  get port(): number {
    return this._port;
  }

  // ─── Request Routing ────────────────────────────────────────────────────────

  private _handleConnection(socket: Socket): void {
    let rawData = '';

    socket.on('data', (chunk) => {
      rawData += chunk.toString('utf8');

      // Simple HTTP request parsing — read until we see the header terminator
      if (!rawData.includes('\r\n\r\n') && !rawData.includes('\n\n')) return;

      const firstLine = rawData.split(/\r?\n/)[0] ?? '';
      const match = /^(GET|HEAD)\s+([^\s]+)\s+HTTP/.exec(firstLine);
      if (!match) {
        sendHttpResponse(socket, 400, JSON.stringify({ error: 'Bad Request' }));
        return;
      }

      const path = match[2]!.split('?')[0]!;

      if (path === '/snapshot') {
        this._serveSnapshot(socket);
      } else if (path === '/events') {
        this._serveEvents(socket);
      } else if (path === '/ping') {
        sendHttpResponse(socket, 200, JSON.stringify({ pong: true, ts: new Date().toISOString() }));
      } else {
        sendHttpResponse(socket, 404, JSON.stringify({ error: 'Not Found' }));
      }
    });

    socket.on('error', () => {
      this._sseClients.delete(socket);
    });

    socket.on('close', () => {
      this._sseClients.delete(socket);
    });
  }

  private _serveSnapshot(socket: Socket): void {
    const snapshot: DiagnosticSnapshot = buildSnapshot(
      this._buffer.getAll(),
      this._maxRecentPerEndpoint
    );
    sendHttpResponse(socket, 200, JSON.stringify(snapshot));
  }

  private _serveEvents(socket: Socket): void {
    sendSSEHeaders(socket);
    this._sseClients.add(socket);

    // Send current snapshot immediately as first event
    const snapshot: DiagnosticSnapshot = buildSnapshot(
      this._buffer.getAll(),
      this._maxRecentPerEndpoint
    );
    sendSSEEvent(socket, 'snapshot', snapshot);
  }
}
