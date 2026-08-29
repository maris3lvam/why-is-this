/**
 * @fileoverview API Doctor — Dashboard Server (CLI Side)
 *
 * HTTP server for the `npx api-doctor` CLI. Listens on port 5034.
 * Serves the single-page HTML UI and proxies data from the app's IPC server.
 *
 * Routes:
 *   GET /         → Single-page HTML dashboard
 *   GET /api/data → Current diagnostic snapshot (JSON)
 *   GET /api/events → SSE stream (live updates + snapshot)
 */

import { createServer, type Server as HttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { getSinglePageUI } from './single-page-ui.js';
import { IpcClient } from '../transport/ipc-client.js';
import type { DiagnosticSnapshot, RequestRecord } from '../types.js';

export const DEFAULT_DASHBOARD_PORT = 5034;

// ─── SSE Client Registry ──────────────────────────────────────────────────────

interface SseClient {
  res: ServerResponse;
  id: string;
}

let _sseClientCounter = 0;

// ─── Dashboard Server ─────────────────────────────────────────────────────────

export class DashboardServer {
  private _httpServer: HttpServer | null = null;
  private readonly _sseClients: Map<string, SseClient> = new Map();
  private readonly _ipcClient: IpcClient;
  private readonly _dashboardPort: number;
  private readonly _ipcPort: number;
  private _latestSnapshot: DiagnosticSnapshot | null = null;

  constructor(dashboardPort: number = DEFAULT_DASHBOARD_PORT, ipcPort: number) {
    this._dashboardPort = dashboardPort;
    this._ipcPort = ipcPort;
    this._ipcClient = new IpcClient(ipcPort);
  }

  /** Start the dashboard HTTP server and connect to IPC. */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => this._handleRequest(req, res));

      server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(
            new Error(
              `Port ${this._dashboardPort} is already in use. Is another api-doctor instance running?\n` +
              `Try: npx api-doctor --port <other-port>`
            )
          );
        } else {
          reject(err);
        }
      });

      server.listen(this._dashboardPort, () => {
        this._httpServer = server;
        this._connectToIpc();
        resolve();
      });
    });
  }

  /** Stop the dashboard server and IPC connection. */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      this._ipcClient.destroy();

      for (const client of this._sseClients.values()) {
        try { client.res.end(); } catch { /* ignore */ }
      }
      this._sseClients.clear();

      if (this._httpServer) {
        this._httpServer.close(() => resolve());
        this._httpServer = null;
      } else {
        resolve();
      }
    });
  }

  get isListening(): boolean {
    return this._httpServer?.listening ?? false;
  }

  // ─── HTTP Request Handling ─────────────────────────────────────────────────

  private _handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = (req.url ?? '/').split('?')[0]!;

    // CORS headers for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (url === '/' || url === '/index.html') {
      this._serveUI(res);
    } else if (url === '/api/data') {
      this._serveSnapshot(res);
    } else if (url === '/api/events') {
      this._serveSSE(req, res);
    } else if (url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ts: new Date().toISOString() }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }

  private _serveUI(res: ServerResponse): void {
    const html = getSinglePageUI(this._ipcPort);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Length': Buffer.byteLength(html),
      'Cache-Control': 'no-cache, no-store',
    });
    res.end(html);
  }

  private _serveSnapshot(res: ServerResponse): void {
    const body = JSON.stringify(this._latestSnapshot ?? {});
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  }

  private _serveSSE(req: IncomingMessage, res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('\n'); // Flush headers

    const clientId = `sse-${++_sseClientCounter}`;
    const client: SseClient = { res, id: clientId };
    this._sseClients.set(clientId, client);

    // Send current snapshot immediately if available
    if (this._latestSnapshot) {
      this._sendSSEEvent(res, 'snapshot', this._latestSnapshot);
    }

    req.on('close', () => {
      this._sseClients.delete(clientId);
    });

    req.on('error', () => {
      this._sseClients.delete(clientId);
    });
  }

  // ─── SSE Broadcasting ──────────────────────────────────────────────────────

  private _sendSSEEvent(res: ServerResponse, event: string, data: unknown): boolean {
    try {
      if (!res.writable) return false;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      return true;
    } catch {
      return false;
    }
  }

  private _broadcastToAll(event: string, data: unknown): void {
    const dead: string[] = [];
    for (const [id, client] of this._sseClients.entries()) {
      const ok = this._sendSSEEvent(client.res, event, data);
      if (!ok) dead.push(id);
    }
    for (const id of dead) this._sseClients.delete(id);
  }

  // ─── IPC Connection ────────────────────────────────────────────────────────

  private _connectToIpc(): void {
    this._ipcClient.on('connected', () => {
      // IPC connected
    });

    this._ipcClient.on('snapshot', (snap: DiagnosticSnapshot) => {
      this._latestSnapshot = snap;
      this._broadcastToAll('snapshot', snap);
    });

    this._ipcClient.on('request', (record: RequestRecord) => {
      // Forward new request to browser clients
      this._broadcastToAll('request', record);

      // Also periodically send updated snapshots — fetch async
      this._ipcClient.fetchSnapshot().then((snap) => {
        if (snap) {
          this._latestSnapshot = snap;
          this._broadcastToAll('update', snap);
        }
      }).catch(() => { /* silently ignore */ });
    });

    this._ipcClient.on('disconnected', () => {
      // IPC disconnected — auto-reconnect will happen
    });

    this._ipcClient.on('error', () => {
      // Connection failure — IpcClient will auto-reconnect
    });

    this._ipcClient.connect();
  }
}
