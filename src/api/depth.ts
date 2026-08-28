/**
 * Returns the maximum nesting depth of a value's structure.
 *
 * Depth = the longest chain of object-valued properties from the root.
 * Primitives have depth 0. A flat object { a: 1 } has depth 1.
 * { a: { b: { c: 1 } } } has depth 3.
 *
 * Circular references are handled safely — the traversal stops at
 * the back-edge rather than recurring infinitely.
 *
 * Bounded by DEFAULT_LIMITS.maxDepth (10). Returns up to that value.
 *
 * @example
 * why.depth(42)                          // 0
 * why.depth({ a: 1 })                    // 1
 * why.depth({ a: { b: { c: 1 } } })     // 3
 * why.depth([1, [2, [3]]])               // 3
 *
 * const obj: any = {}; obj.self = obj;
 * why.depth(obj)                         // 1 (stops at cycle)
 */

import { inspect as inspectEngine } from '../core/inspect-engine.js';

export function apiDepth(value: unknown): number {
  const result = inspectEngine(value);
  return result.depth;
}
