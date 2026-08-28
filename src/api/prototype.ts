/**
 * Returns prototype chain information for a value.
 *
 * Returns a PrototypeInfo with:
 *   - name:           name of the immediate prototype, or null
 *   - chain:          full prototype chain names (nearest to farthest)
 *   - isNullPrototype: true if Object.create(null)
 *
 * Never executes custom prototype methods.
 *
 * @example
 * why.prototype({})
 * // { name: 'Object', chain: ['Object'], isNullPrototype: false }
 *
 * why.prototype(Object.create(null))
 * // { name: null, chain: [], isNullPrototype: true }
 *
 * why.prototype(new Date())
 * // { name: 'Date', chain: ['Date', 'Object'], isNullPrototype: false }
 *
 * class Animal {}
 * class Dog extends Animal {}
 * why.prototype(new Dog())
 * // { name: 'Dog', chain: ['Dog', 'Animal', 'Object'], isNullPrototype: false }
 */

import type { PrototypeInfo } from '../models/inspection-result.js';
import { inspect as inspectEngine } from '../core/inspect-engine.js';

export function apiPrototype(value: unknown): PrototypeInfo {
  const result = inspectEngine(value);
  return result.prototypeInfo;
}
