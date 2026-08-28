/**
 * Detects circular references in a value's structure.
 *
 * Uses reference identity (===), NOT JSON serialization.
 * Returns the paths of all detected circular back-edges.
 *
 * A circular reference is where an object is its own ancestor in the
 * object graph — i.e. you can reach object X by following properties
 * starting from X itself.
 *
 * @example
 * const obj: any = { name: 'John' };
 * obj.self = obj;
 * why.circular(obj)
 * // { isCircular: true, paths: [{ path: 'root.self', targetPath: 'root' }] }
 *
 * why.circular({ a: 1 })
 * // { isCircular: false, paths: [] }
 *
 * // Deep circular:
 * const a: any = {}; const b: any = {};
 * a.b = b; b.a = a;
 * why.circular(a)
 * // { isCircular: true, paths: [{ path: 'root.b.a', targetPath: 'root' }] }
 */

import type { CircularResult } from '../models/inspection-result.js';
import { inspect as inspectEngine } from '../core/inspect-engine.js';

export function apiCircular(value: unknown): CircularResult {
  const result = inspectEngine(value);
  return {
    isCircular: result.isCircular,
    paths: [...result.circularPaths],
  };
}
