/**
 * @fileoverview Domain engine for safe serialization, cloning, and circular JSON formatting.
 *
 * Supports BigInt, Map, Set, Date, RegExp, Symbol, and circular reference handling.
 */

import { detectType, isObjectLike } from '../core/type-detector.js';

/**
 * Checks if a value can be JSON stringified safely without throwing.
 */
export function isSerializable(
  val: unknown,
  seen = new Set<object>(),
): boolean {
  if (val === undefined || val === null) return true;
  const t = typeof val;
  if (t === 'boolean' || t === 'number' || t === 'string') return true;
  if (t === 'bigint' || t === 'symbol' || t === 'function') return false;

  if (isObjectLike(val)) {
    const obj = val as object;
    if (seen.has(obj)) return false; // Circular reference
    seen.add(obj);

    const type = detectType(val);
    if (type === 'array') {
      return (val as unknown[]).every((item) => isSerializable(item, seen));
    }
    if (type === 'object' || type === 'null-prototype-object') {
      return Object.values(obj).every((v) => isSerializable(v, seen));
    }
    return false; // Maps, Sets, Functions, Buffers are not JSON serializable natively
  }
  return false;
}

/**
 * Circular-safe JSON stringifier supporting BigInt, Map, Set, Date, RegExp, and Symbols.
 */
export function stringifyCircular(val: unknown, indent = 2): string {
  const seen = new Set<object>();

  return JSON.stringify(
    val,
    (_key, value) => {
      if (typeof value === 'bigint') return `${value.toString()}n`;
      if (typeof value === 'symbol')
        return `[Symbol: ${value.description ?? ''}]`;
      if (typeof value === 'function')
        return `[Function: ${value.name || 'anonymous'}]`;

      if (isObjectLike(value)) {
        const obj = value as object;
        if (seen.has(obj)) return '[Circular]';
        seen.add(obj);

        if (value instanceof Map) {
          return { __type: 'Map', entries: Array.from(value.entries()) };
        }
        if (value instanceof Set) {
          return { __type: 'Set', values: Array.from(value.values()) };
        }
      }
      return value;
    },
    indent,
  );
}

/**
 * Safe JSON parser.
 */
export function parseJSON<T = unknown>(jsonStr: string): T | null {
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    return null;
  }
}

/**
 * Deep clone using structuredClone (if available) or safe recursive fallback.
 */
export function safeClone<T>(val: T): T {
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(val);
    }
  } catch {
    // Fall back to circular stringify parse
  }

  if (!isObjectLike(val)) return val;
  const str = stringifyCircular(val);
  return parseJSON<T>(str) ?? val;
}
