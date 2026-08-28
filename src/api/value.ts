/**
 * Returns a safe, getter-free representation of a value.
 *
 * Returns a SafeValue discriminated union — never evaluates getters,
 * never calls toString/valueOf/Symbol.toPrimitive.
 *
 * @example
 * why.value(42)          // { kind: 'primitive', value: 42 }
 * why.value(42n)         // { kind: 'bigint', value: 42n }
 * why.value(Symbol('x')) // { kind: 'symbol', description: 'x' }
 * why.value([1,2])       // { kind: 'object', type: 'array', preview: 'Array(2)' }
 *
 * const obj = { get secret() { return 'hidden'; } };
 * why.value(obj)  // { kind: 'object', type: 'object', preview: '[Object]' }
 * // The object itself is represented, not the getter value
 */

import type { SafeValue } from '../models/inspection-result.js';
import { valueToSafeValue } from '../core/safe-reader.js';

export function apiValue(value: unknown): SafeValue {
  return valueToSafeValue(value);
}
