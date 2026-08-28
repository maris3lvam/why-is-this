/**
 * @fileoverview Domain engine for async operations, Promise inspection, and event loop utilities.
 *
 * Safe Promise state detection without false certainty.
 */

import type { PromiseStateResult } from '../models/domain-results.js';
import { valueToSafeValue } from '../core/safe-reader.js';

/**
 * Creates a non-blocking delay promise.
 */
export function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Inspects a Promise state safely using Promise.race with a sentinel value.
 */
export async function inspectPromiseState(
  p: unknown,
): Promise<PromiseStateResult> {
  const timestamp = Date.now();

  if (!(p instanceof Promise)) {
    return Object.freeze({
      timestamp,
      domain: 'async',
      success: false,
      state: 'unknown',
    });
  }

  const sentinel = Symbol('sentinel');
  try {
    const res = await Promise.race([p, Promise.resolve(sentinel)]);
    if (res === sentinel) {
      return Object.freeze({
        timestamp,
        domain: 'async',
        success: true,
        state: 'pending',
      });
    }
    return Object.freeze({
      timestamp,
      domain: 'async',
      success: true,
      state: 'fulfilled',
      value: valueToSafeValue(res),
    });
  } catch (err) {
    return Object.freeze({
      timestamp,
      domain: 'async',
      success: true,
      state: 'rejected',
      reason: valueToSafeValue(err),
    });
  }
}

/**
 * Wraps a promise with a safe timeout limit.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMsg = 'Operation timed out',
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutMsg)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timer),
  );
}
