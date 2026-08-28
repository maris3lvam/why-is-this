/**
 * Returns size information for a value.
 *
 * The SizeInfo.kind tells you what the size represents:
 *   - 'string-length'    — string character count
 *   - 'array-length'     — array .length
 *   - 'collection-size'  — Map.size or Set.size
 *   - 'byte-length'      — Buffer/ArrayBuffer/TypedArray/DataView byte count
 *   - 'property-count'   — enumerable own property count (plain objects, errors, etc.)
 *   - 'none'             — value has no meaningful size (functions, primitives, etc.)
 *
 * NOTE: 'property-count' is NOT a memory footprint. It counts enumerable
 * own properties only, consistent with Object.keys() semantics.
 *
 * @example
 * why.size([1, 2, 3])           // { kind: 'array-length', value: 3 }
 * why.size(new Map())           // { kind: 'collection-size', value: 0 }
 * why.size(Buffer.from('hi'))   // { kind: 'byte-length', value: 2 }
 * why.size({ a: 1, b: 2 })     // { kind: 'property-count', value: 2 }
 * why.size('hello')             // { kind: 'string-length', value: 5 }
 * why.size(42)                  // { kind: 'none', value: 0 }
 */

import type { SizeInfo } from '../models/inspection-result.js';
import { inspect as inspectEngine } from '../core/inspect-engine.js';

export function apiSize(value: unknown): SizeInfo {
  const result = inspectEngine(value);
  return result.size;
}
