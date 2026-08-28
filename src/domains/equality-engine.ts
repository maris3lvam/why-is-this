/**
 * @fileoverview Domain engine for type testing, assertions, and deep equality.
 *
 * Safe, circular-aware deep equality comparison.
 * Never executes getters during deep equality checks.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-function-type */

import type {
  ExpectResult,
  ValidationResult,
} from '../models/domain-results.js';
import { detectType } from '../core/type-detector.js';

export class WhyAssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WhyAssertionError';
  }
}

export type ConstructorType =
  | (new (...args: any[]) => any)
  | (abstract new (...args: any[]) => any)
  | Function;

/**
 * Checks if a value matches an expected type name or constructor function.
 */
export function is(
  value: unknown,
  expected: string | ConstructorType,
): boolean {
  if (typeof expected === 'string') {
    return detectType(value) === expected.toLowerCase();
  }
  if (typeof expected === 'function') {
    try {
      return value instanceof (expected as new (...args: any[]) => any);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Strict identity equality: Object.is(a, b).
 */
export function same(a: unknown, b: unknown): boolean {
  return Object.is(a, b);
}

/**
 * Strict equality check: a === b.
 */
export function strictEqual(a: unknown, b: unknown): boolean {
  return a === b;
}

/**
 * Loose / semantic equality.
 */
export function equal(a: unknown, b: unknown): boolean {
  return a == b;
}

/**
 * Deep equality check. Safe against circular references and getters.
 */
export function deepEqual(
  a: unknown,
  b: unknown,
  seen = new Map<object, object>(),
): boolean {
  if (Object.is(a, b)) return true;

  const typeA = detectType(a);
  const typeB = detectType(b);
  if (typeA !== typeB) return false;

  if (
    typeof a !== 'object' ||
    a === null ||
    typeof b !== 'object' ||
    b === null
  ) {
    return false;
  }

  const objA = a as object;
  const objB = b as object;

  // Circular reference check
  if (seen.get(objA) === objB) return true;
  seen.set(objA, objB);

  if (typeA === 'date') {
    return (a as Date).getTime() === (b as Date).getTime();
  }
  if (typeA === 'regexp') {
    return String(a) === String(b);
  }
  if (typeA === 'array') {
    const arrA = a as unknown[];
    const arrB = b as unknown[];
    if (arrA.length !== arrB.length) return false;
    for (let i = 0; i < arrA.length; i++) {
      if (!deepEqual(arrA[i], arrB[i], seen)) return false;
    }
    return true;
  }

  if (typeA === 'map') {
    const mapA = a as Map<unknown, unknown>;
    const mapB = b as Map<unknown, unknown>;
    if (mapA.size !== mapB.size) return false;
    for (const [k, v] of mapA) {
      if (!mapB.has(k) || !deepEqual(v, mapB.get(k), seen)) return false;
    }
    return true;
  }

  if (typeA === 'set') {
    const setA = a as Set<unknown>;
    const setB = b as Set<unknown>;
    if (setA.size !== setB.size) return false;
    for (const item of setA) {
      let found = false;
      for (const targetItem of setB) {
        if (deepEqual(item, targetItem, seen)) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  }

  // Plain objects & class instances — inspect own data property keys safely
  const keysA = Object.getOwnPropertyNames(objA);
  const keysB = Object.getOwnPropertyNames(objB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    const descA = Object.getOwnPropertyDescriptor(objA, key);
    const descB = Object.getOwnPropertyDescriptor(objB, key);
    if (!descB) return false;

    // Refuse getter execution
    if (descA?.get || descB?.get) {
      if (descA?.get !== descB?.get) return false;
      continue;
    }

    if (!deepEqual(descA?.value, descB?.value, seen)) return false;
  }

  return true;
}

/**
 * Asserts a condition; throws WhyAssertionError if false.
 */
export function assert(
  condition: unknown,
  message = 'Assertion failed',
): asserts condition {
  if (!condition) {
    throw new WhyAssertionError(message);
  }
}

/**
 * Non-throwing expectation check.
 */
export function expectVal(value: unknown, expected: unknown): ExpectResult {
  const pass = deepEqual(value, expected);
  return Object.freeze({
    timestamp: Date.now(),
    domain: 'equality',
    success: true,
    pass,
    actual: value,
    expected,
    message: pass
      ? 'Value matches expectation'
      : 'Value does not match expectation',
  });
}

/**
 * Structural validity check (non-null, non-undefined, non-NaN).
 */
export function valid(value: unknown): ValidationResult {
  const isInvalid =
    value === undefined || value === null || Number.isNaN(value);
  return Object.freeze({
    timestamp: Date.now(),
    domain: 'validation',
    success: true,
    valid: !isInvalid,
    reason: isInvalid ? `Value is ${String(value)}` : undefined,
  });
}

export function invalid(value: unknown): ValidationResult {
  const v = valid(value);
  return Object.freeze({
    timestamp: Date.now(),
    domain: 'validation',
    success: true,
    valid: !v.valid,
    reason: v.valid ? 'Value is valid' : v.reason,
  });
}

/**
 * Explicit safe coercion helper.
 */
export function coerce(
  value: unknown,
  target: 'string' | 'number' | 'boolean',
): unknown {
  try {
    switch (target) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        return Boolean(value);
    }
  } catch {
    return value;
  }
}
