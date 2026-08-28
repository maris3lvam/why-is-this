/**
 * Returns safe values for a value's own properties.
 *
 * Returns an array of SafeValue — a discriminated union that safely
 * represents each property value without executing getters.
 * Accessor properties produce { kind: 'accessor', evaluated: false }.
 *
 * @example
 * why.values({ a: 1, b: 'hello', c: null })
 * // [
 * //   { kind: 'primitive', value: 1 },
 * //   { kind: 'primitive', value: 'hello' },
 * //   { kind: 'primitive', value: null },
 * // ]
 *
 * const obj = { get x() { return 42; } };
 * why.values(obj)
 * // [{ kind: 'accessor', evaluated: false }]
 */

import type { SafeValue } from '../models/inspection-result.js';
import { inspect as inspectEngine } from '../core/inspect-engine.js';

export function apiValues(value: unknown): SafeValue[] {
  const result = inspectEngine(value);
  return result.entries.map((e) => e.value);
}
