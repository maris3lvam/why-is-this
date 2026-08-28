/**
 * @fileoverview Domain engine for property inspection, nested path resolution, and undefined debugging.
 *
 * Never executes getters during property resolution.
 */

import type { PropertyPathResult } from '../models/domain-results.js';
import type { SafeValue } from '../models/inspection-result.js';
import { safeReadValue, valueToSafeValue } from '../core/safe-reader.js';
import { isObjectLike } from '../core/type-detector.js';

/**
 * Checks if a value is strictly undefined.
 */
export function isUndefined(val: unknown): boolean {
  return val === undefined;
}

/**
 * Checks if a value is strictly null.
 */
export function isNull(val: unknown): boolean {
  return val === null;
}

/**
 * Checks if an own property key exists on an object (distinguishes { x: undefined } from {}).
 */
export function hasKey(obj: unknown, key: string | symbol): boolean {
  if (!isObjectLike(obj)) return false;
  try {
    return Object.prototype.hasOwnProperty.call(obj, key);
  } catch {
    return false;
  }
}

/**
 * Safely reads a single property from an object without getter execution.
 */
export function getProp(obj: unknown, key: string | symbol): SafeValue {
  if (!isObjectLike(obj)) {
    return { kind: 'unreadable', reason: 'target is not object-like' };
  }
  return safeReadValue(obj as object, key, String(key), []);
}

/**
 * Safely resolves a nested property path (e.g. "a.b.c") without getter execution.
 */
export function resolvePath(target: unknown, pathStr: string): PropertyPathResult {
  const timestamp = Date.now();
  if (!pathStr || typeof pathStr !== 'string') {
    return Object.freeze({
      timestamp,
      domain: 'property-path',
      success: false,
      path: pathStr,
      exists: false,
      value: { kind: 'unreadable' as const, reason: 'invalid path string' },
      failureReason: 'path must be a non-empty string',
    });
  }

  const segments = pathStr.split('.').map((s) => s.trim()).filter(Boolean);
  let current: unknown = target;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (!isObjectLike(current)) {
      return Object.freeze({
        timestamp,
        domain: 'property-path',
        success: true,
        path: pathStr,
        exists: false,
        value: { kind: 'primitive' as const, value: undefined },
        failureReason: `failed at segment "${seg}" — intermediate value is not an object`,
      });
    }

    const obj = current as object;
    if (!hasKey(obj, seg)) {
      return Object.freeze({
        timestamp,
        domain: 'property-path',
        success: true,
        path: pathStr,
        exists: false,
        value: { kind: 'primitive' as const, value: undefined },
        failureReason: `property "${seg}" does not exist on target`,
      });
    }

    const safeVal = safeReadValue(obj, seg, segments.slice(0, i + 1).join('.'), []);
    if (safeVal.kind === 'accessor') {
      return Object.freeze({
        timestamp,
        domain: 'property-path',
        success: true,
        path: pathStr,
        exists: true,
        value: safeVal,
        failureReason: `segment "${seg}" is an un-evaluated getter`,
      });
    }

    if (i === segments.length - 1) {
      return Object.freeze({
        timestamp,
        domain: 'property-path',
        success: true,
        path: pathStr,
        exists: true,
        value: safeVal,
      });
    }

    // Traverse next level if data descriptor
    const desc = Object.getOwnPropertyDescriptor(obj, seg);
    current = desc?.value;
  }

  return Object.freeze({
    timestamp,
    domain: 'property-path',
    success: true,
    path: pathStr,
    exists: true,
    value: valueToSafeValue(current),
  });
}

export function existsPath(target: unknown, pathStr: string): boolean {
  return resolvePath(target, pathStr).exists;
}

export function missingPath(target: unknown, pathStr: string): string | undefined {
  return resolvePath(target, pathStr).failureReason;
}

export function optionalPath(target: unknown, pathStr: string, defaultValue?: unknown): { value: unknown; exists: boolean } {
  const res = resolvePath(target, pathStr);
  if (res.exists && res.value.kind === 'primitive') {
    return { value: res.value.value ?? defaultValue, exists: true };
  }
  return { value: defaultValue, exists: res.exists };
}
