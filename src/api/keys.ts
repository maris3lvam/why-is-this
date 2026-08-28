/**
 * Returns key metadata for a value's own properties.
 *
 * Includes all own properties: enumerable and non-enumerable, string and symbol.
 * Each KeyInfo records the key, enumerability, writability, configurability,
 * and whether it is a data property or accessor (getter/setter).
 *
 * For non-object values (primitives), returns an empty array.
 *
 * @example
 * why.keys({ a: 1, b: 2 })
 * // [
 * //   { key: 'a', enumerable: true, writable: true, configurable: true, kind: 'data' },
 * //   { key: 'b', enumerable: true, writable: true, configurable: true, kind: 'data' },
 * // ]
 *
 * const obj = {};
 * Object.defineProperty(obj, 'hidden', { value: 42, enumerable: false });
 * why.keys(obj)
 * // [{ key: 'hidden', enumerable: false, ... }]
 */

import type { KeyInfo } from '../models/inspection-result.js';
import { inspect as inspectEngine } from '../core/inspect-engine.js';

export function apiKeys(value: unknown): KeyInfo[] {
  const result = inspectEngine(value);
  return [...result.keys];
}
