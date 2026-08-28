/**
 * @fileoverview Domain engine for secret detection, masking, and object redaction.
 *
 * Local-only, zero network transmission. Automatically detects AWS keys, JWTs, Bearer tokens, and secrets.
 */

import type { SecretScanMatch, SecurityDiagnosticResult } from '../models/domain-results.js';
import { globalConfig } from '../core/config.js';
import { isObjectLike } from '../core/type-detector.js';

/**
 * Scans a string for known secret patterns.
 */
export function scanSecretString(input: string): SecretScanMatch[] {
  const matches: SecretScanMatch[] = [];
  const config = globalConfig.get().security;

  for (const { name, pattern } of config.secretPatterns) {
    if (pattern.test(input)) {
      matches.push({
        patternName: name,
        path: 'string',
        maskedValue: config.maskString,
      });
    }
  }

  return matches;
}

/**
 * Masks a secret string value.
 */
export function maskString(str: string): string {
  const config = globalConfig.get().security;
  if (str.length <= 8) return config.maskString;
  return `${str.slice(0, 3)}***${str.slice(-3)}`;
}

/**
 * Recursively creates a redacted clone of an object graph.
 */
export function redactObject<T>(obj: T, seen = new Set<object>()): T {
  if (!isObjectLike(obj)) return obj;

  const targetObj = obj as object;
  if (seen.has(targetObj)) return '[Circular]' as unknown as T;
  seen.add(targetObj);

  const config = globalConfig.get().security;
  const sensitiveKeyPattern = /(?:secret|password|passwd|key|token|auth|cookie|authorization)/i;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, seen)) as unknown as T;
  }

  const redacted: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(targetObj)) {
    if (sensitiveKeyPattern.test(k)) {
      redacted[k] = config.maskString;
    } else {
      redacted[k] = redactObject(v, seen);
    }
  }

  return redacted as T;
}

/**
 * Inspects security compliance and returns a SecurityDiagnosticResult.
 */
export function inspectSecurity(val: unknown): SecurityDiagnosticResult {
  const timestamp = Date.now();
  const secretsFound: SecretScanMatch[] = [];

  if (typeof val === 'string') {
    secretsFound.push(...scanSecretString(val));
  }

  const safe = secretsFound.length === 0;
  const redactedValue = redactObject(val);

  return Object.freeze({
    timestamp,
    domain: 'security',
    success: true,
    safe,
    secretsFound: Object.freeze(secretsFound),
    redactedValue,
  });
}
