/**
 * @fileoverview API Doctor — Request Tracker
 *
 * Generates unique request IDs, tracks timing using performance.now(),
 * and redacts sensitive HTTP headers before storage.
 */

import { performance } from 'node:perf_hooks';
import type { RequestRecord } from '../types.js';

// ─── ID Generation ────────────────────────────────────────────────────────────

let _counter = 0;

function generateRequestId(): string {
  _counter = (_counter + 1) % 10_000;
  const ts = Date.now();
  const seq = String(_counter).padStart(4, '0');
  return `req-${ts}-${seq}`;
}

// ─── Header Redaction ────────────────────────────────────────────────────────

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-access-token',
  'x-secret',
  'password',
  'token',
  'api-key',
  'apikey',
  'secret',
  'proxy-authorization',
]);

export function redactHeaders(
  raw: Record<string, string | string[] | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const lk = key.toLowerCase();
    if (SENSITIVE_HEADERS.has(lk)) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = Array.isArray(val) ? val.join(', ') : (val ?? '');
    }
  }
  return out;
}

// ─── Path Sanitization ───────────────────────────────────────────────────────

/** Strip query strings and normalize path for grouping. */
export function sanitizePath(rawUrl: string | undefined): string {
  if (!rawUrl) return '/';
  try {
    const url = new URL(rawUrl, 'http://localhost');
    return url.pathname || '/';
  } catch {
    // Not a full URL — treat as path directly
    return rawUrl.split('?')[0] ?? '/';
  }
}

// ─── Request Timer ────────────────────────────────────────────────────────────

export interface TrackedRequest {
  id: string;
  method: string;
  path: string;
  timestamp: string;
  startMark: number;
  headers: Record<string, string>;
  reqSizeBytes: number;
}

export function startTracking(
  method: string,
  rawPath: string,
  rawHeaders: Record<string, string | string[] | undefined>,
  contentLength?: number
): TrackedRequest {
  return {
    id: generateRequestId(),
    method: method.toUpperCase(),
    path: sanitizePath(rawPath),
    timestamp: new Date().toISOString(),
    startMark: performance.now(),
    headers: redactHeaders(rawHeaders),
    reqSizeBytes: contentLength ?? 0,
  };
}

export function finishTracking(
  tracked: TrackedRequest,
  statusCode: number,
  resSizeBytes: number,
  error?: { message: string; code?: string }
): RequestRecord {
  const durationMs = Math.round((performance.now() - tracked.startMark) * 100) / 100;

  return {
    id: tracked.id,
    method: tracked.method,
    path: tracked.path,
    timestamp: tracked.timestamp,
    durationMs,
    statusCode,
    reqSizeBytes: tracked.reqSizeBytes,
    resSizeBytes,
    headers: tracked.headers,
    ...(error ? { error } : {}),
  };
}
