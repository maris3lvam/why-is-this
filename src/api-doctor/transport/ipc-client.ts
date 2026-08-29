/**
 * @fileoverview API Doctor — IPC Client (CLI Side)
 *
 * Connects to the monitored application's IPC server (127.0.0.1:5035).
 * Fetches snapshot data and subscribes to the live SSE event stream.
 * Re-bridges incoming events as Server-Sent Events to the dashboard HTML page.
 */

import { createConnection, type Socket } from 'node:net';
import { EventEmitter } from 'node:events';
import type { DiagnosticSnapshot, RequestRecord } from '../types.js';

export interface IpcClientEvents {
  snapshot: (snapshot: DiagnosticSnapshot) => void;
  request: (record: RequestRecord) => void;
  connected: () => void;
  disconnected: () => void;
  error: (err: Error) => void;
}

export class IpcClient extends EventEmitter {
  private _port: number;
  private _host: string;
  private _socket: Socket | null = null;
  private _buffer = '';
  private _connected = false;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _destroyed = false;
  private _reconnectDelay = 2000;

  constructor(port: number, host = '127.0.0.1') {
    super();
    this._port = port;
    this._host = host;
  }

  get isConnected(): boolean {
    return this._connected;
  }

  /** Connect and start streaming events. Automatically reconnects on disconnect. */
  connect(): void {
    if (this._destroyed) return;
    this._openEventStream();
  }

  /** Fetch the current snapshot once (non-streaming). */
  async fetchSnapshot(): Promise<DiagnosticSnapshot | null> {
    return new Promise((resolve) => {
      const socket = createConnection(this._port, this._host);
      let raw = '';
      let timedOut = false;

      const timeout = setTimeout(() => {
        timedOut = true;
        socket.destroy();
        resolve(null);
      }, 5000);

      socket.once('connect', () => {
        socket.write('GET /snapshot HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n');
      });

      socket.on('data', (chunk) => {
        raw += chunk.toString('utf8');
      });

      socket.once('end', () => {
        if (timedOut) return;
        clearTimeout(timeout);
        try {
          const bodyStart = raw.indexOf('\r\n\r\n');
          const body = bodyStart >= 0 ? raw.slice(bodyStart + 4) : raw;
          resolve(JSON.parse(body) as DiagnosticSnapshot);
        } catch {
          resolve(null);
        }
      });

      socket.once('error', () => {
        if (!timedOut) {
          clearTimeout(timeout);
          resolve(null);
        }
      });
    });
  }

  /** Disconnect and stop reconnecting. */
  destroy(): void {
    this._destroyed = true;
    this._connected = false;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._socket) {
      this._socket.destroy();
      this._socket = null;
    }
  }

  // ─── Internal SSE Stream ─────────────────────────────────────────────────────

  private _openEventStream(): void {
    if (this._destroyed) return;

    const socket = createConnection(this._port, this._host);
    this._socket = socket;

    socket.once('connect', () => {
      socket.write('GET /events HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: keep-alive\r\n\r\n');
      this._connected = true;
      this.emit('connected');
    });

    socket.on('data', (chunk) => {
      this._buffer += chunk.toString('utf8');
      this._parseSSEBuffer();
    });

    socket.once('end', () => {
      this._handleDisconnect();
    });

    socket.once('close', () => {
      this._handleDisconnect();
    });

    socket.once('error', (err) => {
      this.emit('error', err);
      this._handleDisconnect();
    });
  }

  private _handleDisconnect(): void {
    if (this._destroyed) return;
    this._connected = false;
    this._socket = null;
    this._buffer = '';
    this.emit('disconnected');

    // Auto-reconnect after delay
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._openEventStream();
    }, this._reconnectDelay);
  }

  private _parseSSEBuffer(): void {
    // Strip HTTP headers from the first response chunk
    if (this._buffer.startsWith('HTTP/')) {
      const headerEnd = this._buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return; // Headers not yet complete
      this._buffer = this._buffer.slice(headerEnd + 4);
    }

    // Parse SSE event blocks separated by double newlines
    const events = this._buffer.split(/\n\n/);
    // Keep the last potentially incomplete event in the buffer
    this._buffer = events.pop() ?? '';

    for (const eventBlock of events) {
      const lines = eventBlock.split('\n');
      let eventType = 'message';
      let data = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          data = line.slice(6).trim();
        }
      }

      if (!data) continue;

      try {
        const parsed = JSON.parse(data);
        if (eventType === 'snapshot') {
          this.emit('snapshot', parsed as DiagnosticSnapshot);
        } else if (eventType === 'request') {
          this.emit('request', parsed as RequestRecord);
        }
      } catch {
        // Silently skip malformed SSE data
      }
    }
  }
}
