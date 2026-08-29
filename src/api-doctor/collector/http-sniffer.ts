/**
 * @fileoverview API Doctor — HTTP Sniffer
 *
 * Intercepts HTTP requests without mutating application business logic.
 * Supports:
 *   - Node.js `http.Server`
 *   - Express / Connect `app` (has `.use()` method)
 *   - Fastify instance (has `.addHook()` method)
 *   - Raw request handler functions
 *
 * The sniffer wraps the request lifecycle and emits completed RequestRecord
 * objects to a callback, which feeds them into BoundedRingBuffer storage.
 */

import type { IncomingMessage, ServerResponse, Server as HttpServer } from 'node:http';
import { startTracking, finishTracking } from './request-tracker.js';
import type { RequestRecord } from '../types.js';

// ─── Supported App Types ──────────────────────────────────────────────────────

/** An Express/Connect-compatible app with a .use() method */
interface ConnectLike {
  use: (
    fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void
  ) => unknown;
}

/** A Fastify-compatible instance with .addHook() method */
interface FastifyLike {
  addHook: (event: string, fn: (...args: unknown[]) => unknown) => unknown;
}

/** A raw Node http.Server */
type NodeHttpServer = HttpServer;

export type SupportedApp = ConnectLike | FastifyLike | NodeHttpServer;

// ─── Type Guards ──────────────────────────────────────────────────────────────

function isConnectLike(app: unknown): app is ConnectLike {
  return typeof app === 'object' && app !== null && typeof (app as ConnectLike).use === 'function';
}

function isFastifyLike(app: unknown): app is FastifyLike {
  return (
    typeof app === 'object' &&
    app !== null &&
    typeof (app as FastifyLike).addHook === 'function'
  );
}

function isNodeHttpServer(app: unknown): app is NodeHttpServer {
  return (
    typeof app === 'object' &&
    app !== null &&
    typeof (app as NodeHttpServer).on === 'function' &&
    typeof (app as NodeHttpServer).listen === 'function'
  );
}

// ─── HTTP Sniffer ─────────────────────────────────────────────────────────────

export type OnRecord = (record: RequestRecord) => void;

/**
 * Attach the HTTP sniffer to any supported app/server.
 * Returns a detach() function to remove the listener (for testing).
 */
export function attachSniffer(app: SupportedApp, onRecord: OnRecord): () => void {
  if (isFastifyLike(app)) {
    return attachFastifySniffer(app, onRecord);
  }

  if (isConnectLike(app)) {
    return attachConnectSniffer(app, onRecord);
  }

  if (isNodeHttpServer(app)) {
    return attachNodeServerSniffer(app, onRecord);
  }

  throw new Error(
    '[why.api.doctor] Unsupported app type. Pass an Express app, Node http.Server, or Fastify instance.'
  );
}

// ─── Connect/Express Middleware ───────────────────────────────────────────────

function attachConnectSniffer(app: ConnectLike, onRecord: OnRecord): () => void {
  function middleware(req: IncomingMessage, res: ServerResponse, next: () => void): void {
    const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
    const contentLength = parseInt(req.headers['content-length'] ?? '0', 10) || 0;

    const tracked = startTracking(req.method ?? 'GET', req.url ?? '/', headers, contentLength);

    const originalEnd = res.end.bind(res);

    // Patch res.end to capture completion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.end = function patchedEnd(...args: any[]): any {
      res.end = originalEnd;
      const result = originalEnd(...args);

      const resSizeBytes = parseInt(res.getHeader('content-length') as string ?? '0', 10) || 0;
      const error =
        res.statusCode >= 400
          ? { message: `HTTP ${res.statusCode}` }
          : undefined;

      const record = finishTracking(tracked, res.statusCode, resSizeBytes, error);
      onRecord(record);
      return result;
    };

    next();
  }

  app.use(middleware);

  // No reliable way to remove Connect middleware; return no-op detach
  return () => { /* middleware cannot be removed from Connect pipelines */ };
}

// ─── Node http.Server Listener ────────────────────────────────────────────────

function attachNodeServerSniffer(server: NodeHttpServer, onRecord: OnRecord): () => void {
  function requestListener(req: IncomingMessage, res: ServerResponse): void {
    const headers = (req.headers ?? {}) as Record<string, string | string[] | undefined>;
    const contentLength = parseInt(req.headers['content-length'] ?? '0', 10) || 0;

    const tracked = startTracking(req.method ?? 'GET', req.url ?? '/', headers, contentLength);

    const originalEnd = res.end.bind(res);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res.end = function patchedEnd(...args: any[]): any {
      res.end = originalEnd;
      const result = originalEnd(...args);

      const resSizeBytes = parseInt(res.getHeader('content-length') as string ?? '0', 10) || 0;
      const error =
        res.statusCode >= 400
          ? { message: `HTTP ${res.statusCode}` }
          : undefined;

      const record = finishTracking(tracked, res.statusCode, resSizeBytes, error);
      onRecord(record);
      return result;
    };
  }

  server.on('request', requestListener);

  return () => {
    server.off('request', requestListener);
  };
}

// ─── Fastify Hooks ────────────────────────────────────────────────────────────

function attachFastifySniffer(app: FastifyLike, onRecord: OnRecord): () => void {
  // Fastify uses lifecycle hooks; we cannot easily detach per-hook
  // Use onRequest + onSend pair

  // Store per-request timing in a WeakMap via the request object
  const timings = new WeakMap<object, ReturnType<typeof startTracking>>();

  // Use broad function signatures to satisfy FastifyLike's (...args: unknown[]) => unknown
  app.addHook('onRequest', (...args: unknown[]) => {
    const [request, , done] = args;
    const req = request as { method?: string; url?: string; headers?: Record<string, string | string[]> };
    const rawHeaders = (req?.headers ?? {}) as Record<string, string | string[] | undefined>;
    const contentLength = parseInt((rawHeaders['content-length'] as string) ?? '0', 10) || 0;
    const tracked = startTracking(req?.method ?? 'GET', req?.url ?? '/', rawHeaders, contentLength);
    timings.set(request as object, tracked);
    if (typeof done === 'function') (done as () => void)();
  });

  app.addHook('onSend', (...args: unknown[]) => {
    const [request, reply, payload, done] = args;
    const tracked = timings.get(request as object);
    if (tracked) {
      const rep = reply as { statusCode?: number; getHeader?: (h: string) => string | undefined };
      const statusCode = rep?.statusCode ?? 200;
      const resSizeBytes = parseInt(rep?.getHeader?.('content-length') ?? '0', 10) || 0;
      const error = statusCode >= 400 ? { message: `HTTP ${statusCode}` } : undefined;
      const record = finishTracking(tracked, statusCode, resSizeBytes, error);
      onRecord(record);
      timings.delete(request as object);
    }
    if (typeof done === 'function') (done as (err: unknown, val: unknown) => void)(null, payload);
  });

  return () => { /* Fastify hooks cannot be removed once registered */ };
}
