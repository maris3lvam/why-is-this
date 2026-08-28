/**
 * Returns a concise human-readable description of a value.
 *
 * Generated from structured InspectionResult — no duplicate analysis.
 *
 * @example
 * why.describe({ a: 1, b: 2, c: 3 })
 * // "Object with 3 properties — Depth: 1"
 *
 * why.describe(new Map([['x', 1]]))
 * // "Map with 1 entry"
 *
 * const obj: any = {}; obj.self = obj;
 * why.describe(obj)
 * // "Object with 0 properties — Depth: 1 — ⚠ Contains circular reference"
 */

import { inspect as inspectEngine } from '../core/inspect-engine.js';

export function apiDescribe(value: unknown): string {
  const result = inspectEngine(value);
  const parts: string[] = [];

  // Type
  parts.push(capitalize(result.type));

  // Size
  if (result.size.kind !== 'none') {
    switch (result.size.kind) {
      case 'property-count': {
        const n = result.size.value;
        parts.push(`with ${n} ${n === 1 ? 'property' : 'properties'}`);
        break;
      }
      case 'array-length': {
        const n = result.size.value;
        parts.push(`with ${n} ${n === 1 ? 'element' : 'elements'}`);
        break;
      }
      case 'collection-size': {
        const n = result.size.value;
        parts.push(`with ${n} ${n === 1 ? 'entry' : 'entries'}`);
        break;
      }
      case 'byte-length':
        parts.push(`(${result.size.value} bytes)`);
        break;
      case 'string-length':
        parts.push(`(${result.size.value} characters)`);
        break;
    }
  }

  // Prototype (skip 'Object' — obvious for plain objects)
  if (
    result.prototypeInfo.name !== null &&
    result.prototypeInfo.name !== 'Object'
  ) {
    parts.push(`— Prototype: ${result.prototypeInfo.name}`);
  }

  // Null prototype
  if (result.prototypeInfo.isNullPrototype) {
    parts.push('— [null prototype]');
  }

  // Depth (only meaningful for objects with children)
  if (result.depth > 0) {
    parts.push(`— Depth: ${result.depth}`);
  }

  // Circular reference
  if (result.isCircular) {
    parts.push('— ⚠ Contains circular reference');
  }

  // Truncated
  if (result.truncated) {
    parts.push('— ⚠ Truncated');
  }

  return parts.join(' ');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
