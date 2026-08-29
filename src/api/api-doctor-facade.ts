/**
 * @fileoverview API Doctor — Public Facade
 *
 * Provides the `why.api.doctor(app, options?)` public API.
 * Validates options, wires up storage, sniffer, and IPC server,
 * and returns a handle for programmatic teardown.
 */

import { BoundedRingBuffer, parseSizeString } from '../api-doctor/storage/bounded-ring-buffer.js';
import { attachSniffer, type SupportedApp } from '../api-doctor/collector/http-sniffer.js';
import { IpcServer, DEFAULT_IPC_PORT } from '../api-doctor/transport/ipc-server.js';
import type { ApiDoctorOptions, RequestRecord } from '../api-doctor/types.js';

// ─── Handle returned to caller ────────────────────────────────────────────────

export interface ApiDoctorHandle {
  /** Stop monitoring and release all resources. */
  stop: () => Promise<void>;
  /** Current number of captured requests in the buffer. */
  readonly capturedCount: number;
  /** IPC server port (for use with `npx api-doctor --ipc-port <n>`). */
  readonly ipcPort: number;
}

// ─── Main Entry ───────────────────────────────────────────────────────────────

/**
 * Attach API Doctor to a running HTTP application.
 *
 * @param app   Express app, Node http.Server, or Fastify instance.
 * @param options  Optional configuration (storage size, IPC port, etc.)
 * @returns     A handle for programmatic teardown.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import why from '@debuglab/why-is-this';
 *
 * const app = express();
 * why.api.doctor(app);
 *
 * // In another terminal: npx api-doctor
 * ```
 */
export function apiDoctor(app: SupportedApp, options?: ApiDoctorOptions): ApiDoctorHandle {
  const storage = options?.storage ?? {};
  const maxBytes = parseSizeString(storage.maxSize ?? '100MB');
  const cleanupOnExit = storage.cleanupOnExit ?? true;
  const ipcPort = options?.ipcPort ?? DEFAULT_IPC_PORT;
  const maxRecentPerEndpoint = options?.maxRecentPerEndpoint ?? 20;

  // Initialize bounded ring-buffer storage
  const buffer = new BoundedRingBuffer(maxBytes, cleanupOnExit);

  // Initialize IPC server (runs in background, non-blocking)
  const ipcServer = new IpcServer(buffer, ipcPort, maxRecentPerEndpoint);

  // Start IPC server (non-blocking — silently skips if port unavailable)
  ipcServer.start().catch(() => {
    // IPC server could not start (port in use, etc.)
    // API Doctor continues to buffer data — dashboard will retry connection
  });

  // Attach HTTP sniffer
  const detachSniffer = attachSniffer(app, (record: RequestRecord) => {
    buffer.push(record);
    ipcServer.broadcast(record);
  });

  // ── Teardown ────────────────────────────────────────────────────────────────

  async function stop(): Promise<void> {
    detachSniffer();
    buffer.destroy();
    await ipcServer.stop();
  }

  return {
    stop,
    get capturedCount() { return buffer.size; },
    get ipcPort() { return ipcPort; },
  };
}

// ─── Public API namespace ─────────────────────────────────────────────────────

export const apiNamespace = {
  doctor: apiDoctor,
};
