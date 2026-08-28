/**
 * @fileoverview Domain engine for function metadata inspection and tracking wrappers.
 *
 * CRITICAL: Function inspection NEVER executes the function being inspected.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { FunctionDiagnosticResult } from '../models/domain-results.js';
import { detectType } from '../core/type-detector.js';

type AnyFunction = (...args: any[]) => any;

const trackedWrappers = new WeakMap<AnyFunction, { original: AnyFunction; callCount: number }>();
const originalFunctions = new WeakMap<AnyFunction, AnyFunction>();

/**
 * Safely inspects function metadata without executing it.
 */
export function inspectFunction(fn: unknown): FunctionDiagnosticResult {
  const timestamp = Date.now();

  if (typeof fn !== 'function') {
    return Object.freeze({
      timestamp,
      domain: 'function',
      success: false,
      name: '(not a function)',
      length: 0,
      isAsync: false,
      isGenerator: false,
      isArrow: false,
    });
  }

  const type = detectType(fn);
  const rawFn = fn as AnyFunction;
  const isAsync = type === 'async-function' || type === 'async-generator-function';
  const isGenerator = type === 'generator-function' || type === 'async-generator-function';

  let isArrow = false;
  try {
    const src = Function.prototype.toString.call(rawFn);
    isArrow = !src.startsWith('function') && !src.startsWith('async function') && src.includes('=>');
  } catch {
    // Proxy safety
  }

  const tracking = trackedWrappers.get(rawFn);

  return Object.freeze({
    timestamp,
    domain: 'function',
    success: true,
    name: rawFn.name || '(anonymous)',
    length: rawFn.length || 0,
    isAsync,
    isGenerator,
    isArrow,
    callCount: tracking ? tracking.callCount : undefined,
  });
}

/**
 * Wraps a function to track its call count and execution duration without altering behavior.
 */
export function wrapFunction<T extends AnyFunction>(fn: T): T {
  if (typeof fn !== 'function') return fn;

  const metadata = { original: fn, callCount: 0 };

  const wrapper = function (this: unknown, ...args: unknown[]) {
    metadata.callCount++;
    return fn.apply(this, args);
  } as unknown as T;

  trackedWrappers.set(wrapper, metadata);
  originalFunctions.set(wrapper, fn);

  return wrapper;
}

/**
 * Restores the original unwrapped function.
 */
export function unwrapFunction<T extends AnyFunction>(fn: T): T {
  const orig = originalFunctions.get(fn);
  return (orig as T) || fn;
}

export function getCallCount(fn: AnyFunction): number {
  const meta = trackedWrappers.get(fn);
  return meta ? meta.callCount : 0;
}
