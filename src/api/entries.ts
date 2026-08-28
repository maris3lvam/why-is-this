/**
 * Returns structured key/value entry pairs for a value's own properties.
 *
 * Each EntryInfo contains:
 *   - key: string | symbol
 *   - value: SafeValue (no getter execution)
 *   - keyInfo: KeyInfo (enumerable, writable, configurable, kind)
 *
 * This gives enough metadata to distinguish enumerable from non-enumerable
 * properties, data properties from accessors, string from symbol keys.
 *
 * @example
 * why.entries({ name: 'John', age: 25 })
 * // [
 * //   { key: 'name', value: { kind: 'primitive', value: 'John' }, keyInfo: {...} },
 * //   { key: 'age',  value: { kind: 'primitive', value: 25 },     keyInfo: {...} },
 * // ]
 */

import type { EntryInfo } from '../models/inspection-result.js';
import { inspect as inspectEngine } from '../core/inspect-engine.js';

export function apiEntries(value: unknown): EntryInfo[] {
  const result = inspectEngine(value);
  return [...result.entries];
}
