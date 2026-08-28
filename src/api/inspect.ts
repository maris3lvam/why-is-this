/**
 * Performs a deep inspection of a value and returns the complete
 * InspectionResult.
 *
 * This is the raw structured result consumed by all other API methods.
 * It contains type, prototype chain, constructor, keys, size, depth,
 * circular/repeated reference data, and per-property entries.
 *
 * Core APIs never write to stdout/stderr.
 *
 * @example
 * import { why } from 'why-is-this';
 *
 * const result = why.inspect({ a: 1, b: { c: 2 } });
 * result.type;        // 'object'
 * result.depth;       // 2
 * result.isCircular;  // false
 */

import type { InspectionResult } from '../models/inspection-result.js';
import { inspect as inspectEngine } from '../core/inspect-engine.js';

export function apiInspect(value: unknown): InspectionResult {
  return inspectEngine(value);
}
