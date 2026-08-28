/**
 * Returns the detected runtime type of a value as a DetectedType string.
 *
 * Handles all JavaScript types robustly — including the `typeof null === 'object'`
 * trap, Buffer vs TypedArray distinction, boxed primitives, and more.
 *
 * @example
 * why.type(null)           // 'null'
 * why.type([])             // 'array'
 * why.type(new Map())      // 'map'
 * why.type(() => {})       // 'function'
 * why.type(async () => {}) // 'async-function'
 * why.type(Buffer.from('')) // 'buffer'
 * why.type(new Boolean())   // 'boxed-boolean'
 */

import type { DetectedType } from '../models/inspection-result.js';
import { detectType } from '../core/type-detector.js';

export function apiType(value: unknown): DetectedType {
  return detectType(value);
}
