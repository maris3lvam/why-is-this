/**
 * @fileoverview Domain engine for process & environment diagnostics.
 *
 * Automatically redacts sensitive environment variable keys (PASS, KEY, SECRET, TOKEN, AUTH).
 */

import type { ProcessDiagnosticResult } from '../models/domain-results.js';
import { globalConfig } from '../core/config.js';

const SENSITIVE_KEY_PATTERN =
  /(?:secret|password|passwd|key|token|auth|cookie|private)/i;

/**
 * Returns redacted environment variables.
 */
export function getRedactedEnv(): Record<string, string> {
  const env = process.env;
  const redacted: Record<string, string> = {};
  const config = globalConfig.get().security;

  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) continue;
    if (config.autoRedact && SENSITIVE_KEY_PATTERN.test(k)) {
      redacted[k] = config.maskString;
    } else {
      redacted[k] = v;
    }
  }

  return redacted;
}

/**
 * Inspects process diagnostic metadata.
 */
export function inspectProcess(): ProcessDiagnosticResult {
  return Object.freeze({
    timestamp: Date.now(),
    domain: 'process',
    success: true,
    pid: process.pid,
    ppid: process.ppid || 0,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    uptimeSeconds: Math.floor(process.uptime()),
    cwd: process.cwd(),
    execPath: process.execPath,
    env: getRedactedEnv(),
  });
}
