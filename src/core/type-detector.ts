/**
 * @fileoverview Robust JavaScript runtime type detection.
 *
 * Handles the full spectrum of JavaScript types without relying solely
 * on `typeof`. Specifically:
 *   - Correctly identifies null (typeof null === 'object')
 *   - Distinguishes Array from plain Object
 *   - Identifies Node.js Buffer (before TypedArray check)
 *   - Detects all TypedArray variants via the abstract TypedArray base
 *   - Detects generator functions, async functions
 *   - Detects boxed primitives (new Boolean(), new Number(), etc.)
 *   - Detects null-prototype objects (Object.create(null))
 *   - Detects class instances vs. plain objects
 *
 * All detection is wrapped in try/catch to handle Proxy objects safely.
 *
 * NOTE: These are JavaScript *runtime* types only. TypeScript compile-time
 * types that are erased at runtime cannot be detected here.
 */

import type { DetectedType } from '../models/inspection-result.js';

// ─── Pre-computed prototype references ───────────────────────────────────────
// Cached once at module load to avoid repeated property access.

const AsyncFunctionProto: object = Object.getPrototypeOf(async () => {});
const GeneratorFunctionProto: object = Object.getPrototypeOf(function* () {});
const AsyncGeneratorFunctionProto: object = Object.getPrototypeOf(
  async function* () {},
);

/**
 * The abstract TypedArray base (not directly accessible by name).
 * All TypedArray variants (Int8Array, Uint8Array, Float64Array, etc.)
 * inherit from this, as does Buffer.
 */
const TypedArrayBase = Object.getPrototypeOf(Uint8Array) as new (
  ...args: unknown[]
) => object;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely call Object.prototype.toString without triggering user-defined
 * Symbol.toStringTag getters (errors are caught and a fallback returned).
 */
function safeToStringTag(value: unknown): string {
  try {
    return Object.prototype.toString.call(value);
  } catch {
    return '[object Unknown]';
  }
}

/**
 * Detect the runtime type of any JavaScript value.
 *
 * @param value - Any JavaScript value
 * @returns A DetectedType string literal
 */
export function detectType(value: unknown): DetectedType {
  // ── Primitives ─────────────────────────────────────────────────────────────
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';

  const primitiveKind = typeof value;

  if (primitiveKind === 'boolean') return 'boolean';
  if (primitiveKind === 'number') return 'number';
  if (primitiveKind === 'bigint') return 'bigint';
  if (primitiveKind === 'string') return 'string';
  if (primitiveKind === 'symbol') return 'symbol';

  // ── Functions ──────────────────────────────────────────────────────────────
  if (primitiveKind === 'function') {
    try {
      const proto = Object.getPrototypeOf(value as object);
      if (proto === AsyncGeneratorFunctionProto)
        return 'async-generator-function';
      if (proto === GeneratorFunctionProto) return 'generator-function';
      if (proto === AsyncFunctionProto) return 'async-function';
    } catch {
      // Proxy may throw on getPrototypeOf — fall through to 'function'
    }
    return 'function';
  }

  // ── Objects ────────────────────────────────────────────────────────────────
  // At this point typeof value === 'object' (null already handled above)

  // Array — check early, it is very common
  if (Array.isArray(value)) return 'array';

  // Node.js Buffer — must precede TypedArray since Buffer extends Uint8Array
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return 'buffer';

  // TypedArray — via the abstract TypedArray base class
  try {
    if (value instanceof TypedArrayBase) return 'typedarray';
  } catch {
    // Proxy may throw
  }

  // instanceof checks for well-known built-ins
  try {
    if (value instanceof ArrayBuffer) return 'arraybuffer';
    if (value instanceof DataView) return 'dataview';
    if (value instanceof Date) return 'date';
    if (value instanceof RegExp) return 'regexp';
    if (value instanceof Map) return 'map';
    if (value instanceof Set) return 'set';
    if (value instanceof WeakMap) return 'weakmap';
    if (value instanceof WeakSet) return 'weakset';
    if (value instanceof Error) return 'error';
    if (value instanceof Promise) return 'promise';
    // Boxed primitives
    if (value instanceof Boolean) return 'boxed-boolean';
    if (value instanceof Number) return 'boxed-number';
    if (value instanceof String) return 'boxed-string';
  } catch {
    // Proxy with non-function Symbol.hasInstance can throw
  }

  // Object.prototype.toString tag for remaining cases
  const tag = safeToStringTag(value);

  // Boxed Symbol — Object(Symbol()) instanceof Symbol === false, use tag
  if (tag === '[object Symbol]') return 'boxed-symbol';

  // Generator / AsyncGenerator instances
  if (tag === '[object Generator]') return 'generator';
  if (tag === '[object AsyncGenerator]') return 'async-generator';

  // Prototype-based structural checks
  try {
    const proto = Object.getPrototypeOf(value as object);

    // Null prototype — Object.create(null)
    if (proto === null) return 'null-prototype-object';

    // Plain object — prototype is exactly Object.prototype
    if (proto === Object.prototype) return 'object';
  } catch {
    // Proxy may throw on getPrototypeOf
  }

  // Class instance — has a prototype other than Object.prototype and not null
  return 'class-instance';
}

/**
 * Returns true if the value is an object or function (non-primitive, non-null).
 */
export function isObjectLike(value: unknown): value is object {
  return (
    value !== null && (typeof value === 'object' || typeof value === 'function')
  );
}

/**
 * Returns true if the detected type represents a primitive value.
 */
export function isPrimitiveType(type: DetectedType): boolean {
  return (
    type === 'undefined' ||
    type === 'null' ||
    type === 'boolean' ||
    type === 'number' ||
    type === 'bigint' ||
    type === 'string' ||
    type === 'symbol'
  );
}

/**
 * Returns true if the type should be traversed for child properties.
 *
 * Non-traversable types:
 *   - All primitives
 *   - Functions (may have properties, but treated as leaves)
 *   - WeakMap / WeakSet (cannot be iterated)
 *   - Promise / generators (not meaningfully traversable)
 *   - Binary types (ArrayBuffer, TypedArray, Buffer, DataView)
 *   - Boxed primitives
 */
export function isTraversableType(type: DetectedType): boolean {
  switch (type) {
    case 'undefined':
    case 'null':
    case 'boolean':
    case 'number':
    case 'bigint':
    case 'string':
    case 'symbol':
    case 'function':
    case 'async-function':
    case 'generator-function':
    case 'async-generator-function':
    case 'weakmap':
    case 'weakset':
    case 'promise':
    case 'generator':
    case 'async-generator':
    case 'typedarray':
    case 'buffer':
    case 'arraybuffer':
    case 'dataview':
    case 'boxed-boolean':
    case 'boxed-number':
    case 'boxed-string':
    case 'boxed-symbol':
      return false;
    default:
      // array, map, set, date, regexp, error, object,
      // null-prototype-object, class-instance
      return true;
  }
}
