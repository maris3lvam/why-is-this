/**
 * Detects objects that are referenced from multiple paths in the structure.
 *
 * Returns an array of RepeatedRefInfo — each entry has a `paths` array
 * containing all paths where the same object identity appears.
 *
 * Distinguishes:
 *   - Same reference:  obj.a === obj.b (detected here)
 *   - Same value:      obj.a deep-equals obj.b but are different objects (not detected)
 *
 * Circular references are a subset of repeated references where the
 * repeated path is an ancestor in the traversal.
 *
 * @example
 * const shared = { id: 1 };
 * const data = { a: shared, b: shared };
 * why.references(data)
 * // [{ paths: ['root.a', 'root.b'] }]
 *
 * const obj: any = {}; obj.self = obj;
 * why.references(obj)
 * // [{ paths: ['root', 'root.self'] }]  — also circular
 */

import type { RepeatedRefInfo } from '../models/inspection-result.js';
import { inspect as inspectEngine } from '../core/inspect-engine.js';

export function apiReferences(value: unknown): RepeatedRefInfo[] {
  const result = inspectEngine(value);
  return [...result.repeatedRefs];
}
