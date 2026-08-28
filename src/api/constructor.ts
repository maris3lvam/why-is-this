/**
 * Safely identifies the constructor of a value.
 *
 * Reads the constructor from the value's PROTOTYPE (not from the value itself),
 * avoiding the common `constructor` property override trap.
 *
 * Also detects when the object has its own `constructor` property that
 * shadows the prototype's constructor.
 *
 * @example
 * why.constructor({})
 * // { name: 'Object', isOverridden: false, isSafe: true }
 *
 * why.constructor(new Date())
 * // { name: 'Date', isOverridden: false, isSafe: true }
 *
 * why.constructor(Object.create(null))
 * // { name: null, isOverridden: false, isSafe: true }
 *
 * // Overridden constructor:
 * const obj = { constructor: 'I am not a constructor' };
 * why.constructor(obj)
 * // { name: 'Object', isOverridden: true, isSafe: true }
 */

import type { ConstructorInfo } from '../models/inspection-result.js';
import { inspect as inspectEngine } from '../core/inspect-engine.js';

export function apiConstructor(value: unknown): ConstructorInfo {
  const result = inspectEngine(value);
  return result.constructorInfo;
}
