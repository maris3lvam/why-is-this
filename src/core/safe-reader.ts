/**
 * @fileoverview Safe property reading.
 *
 * All functions here access property descriptors WITHOUT executing getters.
 * This is a security-critical module: getter execution must remain
 * explicitly opt-in (which is not supported in V1).
 *
 * Safety guarantees:
 *   - No getter is ever called automatically
 *   - All operations are wrapped in try/catch (Proxy safety)
 *   - Errors are recorded as InspectionError, not thrown
 *   - User code (toString, valueOf, Symbol.toPrimitive) is never called
 */

import type {
  KeyInfo,
  SafeValue,
  InspectionError,
  DetectedType,
} from '../models/inspection-result.js';
import type { InspectionLimits } from './limits.js';
import { detectType } from './type-detector.js';

// ─────────────────────────────────────────────────────────────────────────────
// Key Reading
// ─────────────────────────────────────────────────────────────────────────────

export interface SafeReadKeysResult {
  readonly keys: KeyInfo[];
  readonly errors: InspectionError[];
}

/**
 * Safely reads all own property descriptors of an object.
 *
 * Includes string keys AND symbol keys.
 * Respects maxProperties limit.
 * Never executes getters.
 */
export function safeReadKeys(
  value: object,
  path: string,
  limits: InspectionLimits,
): SafeReadKeysResult {
  const keys: KeyInfo[] = [];
  const errors: InspectionError[] = [];
  let propCount = 0;

  // ── String keys ───────────────────────────────────────────────────────────
  let stringKeys: string[] = [];
  try {
    stringKeys = Object.getOwnPropertyNames(value);
  } catch (e) {
    errors.push({
      message: e instanceof Error ? e.message : String(e),
      path,
      kind: 'descriptor-error',
    });
    // Attempt to at least get symbol keys
  }

  for (const key of stringKeys) {
    if (propCount >= limits.maxProperties) break;
    const keyInfo = readKeyInfo(value, key, path, errors);
    if (keyInfo !== null) {
      keys.push(keyInfo);
      propCount++;
    }
  }

  // ── Symbol keys ───────────────────────────────────────────────────────────
  let symbolKeys: symbol[] = [];
  try {
    symbolKeys = Object.getOwnPropertySymbols(value);
  } catch (e) {
    errors.push({
      message: e instanceof Error ? e.message : String(e),
      path,
      kind: 'descriptor-error',
    });
  }

  for (const sym of symbolKeys) {
    if (propCount >= limits.maxProperties) break;
    const keyInfo = readKeyInfo(value, sym, path, errors);
    if (keyInfo !== null) {
      keys.push(keyInfo);
      propCount++;
    }
  }

  return { keys, errors };
}

function readKeyInfo(
  obj: object,
  key: string | symbol,
  path: string,
  errors: InspectionError[],
): KeyInfo | null {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(obj, key);
  } catch (e) {
    errors.push({
      message: e instanceof Error ? e.message : String(e),
      path,
      kind: 'descriptor-error',
    });
    return null;
  }

  if (descriptor === undefined) return null;

  const isAccessor = 'get' in descriptor || 'set' in descriptor;

  return {
    key,
    enumerable: descriptor.enumerable ?? false,
    writable: isAccessor ? null : (descriptor.writable ?? false),
    configurable: descriptor.configurable ?? false,
    kind: isAccessor ? 'accessor' : 'data',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Value Reading
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safely reads the value of a single own property.
 *
 * For accessor properties, returns { kind: 'accessor', evaluated: false }
 * WITHOUT executing the getter. This is intentional and non-negotiable.
 *
 * @param obj - The object to read from
 * @param key - The property key (string or symbol)
 * @param path - The current inspection path (for error reporting)
 * @param errors - Mutable array to push non-fatal errors into
 */
export function safeReadValue(
  obj: object,
  key: string | symbol,
  path: string,
  errors: InspectionError[],
): SafeValue {
  let descriptor: PropertyDescriptor | undefined;
  try {
    descriptor = Object.getOwnPropertyDescriptor(obj, key);
  } catch (e) {
    errors.push({
      message: e instanceof Error ? e.message : String(e),
      path,
      kind: 'proxy-error',
    });
    return { kind: 'unreadable', reason: 'could not read property descriptor' };
  }

  if (descriptor === undefined) {
    return { kind: 'unreadable', reason: 'property descriptor not found' };
  }

  // Accessor property — intentionally refuse to evaluate the getter
  if ('get' in descriptor || 'set' in descriptor) {
    return { kind: 'accessor', evaluated: false };
  }

  // Data property — safe to read the stored value
  return valueToSafeValue(descriptor.value as unknown);
}

// ─────────────────────────────────────────────────────────────────────────────
// Value → SafeValue conversion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts any raw JavaScript value to a SafeValue.
 *
 * Never calls toString(), valueOf(), or Symbol.toPrimitive.
 * Never executes getters (only called on data-descriptor values).
 */
export function valueToSafeValue(rawVal: unknown): SafeValue {
  if (rawVal === undefined) return { kind: 'primitive', value: undefined };
  if (rawVal === null) return { kind: 'primitive', value: null };

  const t = typeof rawVal;

  if (t === 'boolean') return { kind: 'primitive', value: rawVal as boolean };
  if (t === 'number') return { kind: 'primitive', value: rawVal as number };
  if (t === 'string') return { kind: 'primitive', value: rawVal as string };
  if (t === 'bigint') return { kind: 'bigint', value: rawVal as bigint };
  if (t === 'symbol') {
    return { kind: 'symbol', description: (rawVal as symbol).description };
  }

  if (t === 'function') {
    const functionKind = detectType(rawVal);
    let name: string | undefined;
    try {
      const rawName: unknown = (rawVal as Record<string, unknown>)['name'];
      if (typeof rawName === 'string' && rawName.length > 0) {
        name = rawName;
      }
    } catch {
      // Proxy may throw on .name access
    }
    return { kind: 'function', name, functionKind };
  }

  // Object types
  const type = detectType(rawVal);
  const preview = safeObjectPreview(rawVal, type);
  return { kind: 'object', type, preview };
}

// ─────────────────────────────────────────────────────────────────────────────
// Preview Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a safe, bounded string preview for an object-like value.
 *
 * Never executes user-defined methods (toString, valueOf, etc.).
 * Uses only safe built-in accessors.
 */
export function safeObjectPreview(value: unknown, type: DetectedType): string {
  try {
    switch (type) {
      case 'array': {
        const arr = value as unknown[];
        return `Array(${arr.length})`;
      }
      case 'date': {
        try {
          return `Date(${(value as Date).toISOString()})`;
        } catch {
          return 'Date(invalid)';
        }
      }
      case 'regexp': {
        try {
          // RegExp.prototype.toString() is safe — it's a well-known method
          // that reflects the literal source, not user code
          return String(value as RegExp);
        } catch {
          return 'RegExp';
        }
      }
      case 'error': {
        const err = value as Error;
        // .name and .message are standard data properties on Error
        const name = typeof err.name === 'string' ? err.name : 'Error';
        const msg =
          typeof err.message === 'string' ? err.message.slice(0, 50) : '';
        return `${name}(${msg})`;
      }
      case 'map': {
        return `Map(${(value as Map<unknown, unknown>).size})`;
      }
      case 'set': {
        return `Set(${(value as Set<unknown>).size})`;
      }
      case 'weakmap':
        return 'WeakMap';
      case 'weakset':
        return 'WeakSet';
      case 'promise':
        return 'Promise';
      case 'buffer':
        return `Buffer(${(value as Buffer).byteLength})`;
      case 'arraybuffer':
        return `ArrayBuffer(${(value as ArrayBuffer).byteLength})`;
      case 'typedarray': {
        const ta = value as { constructor: { name: string }; length: number };
        const ctorName = ta.constructor.name;
        return `${ctorName}(${ta.length})`;
      }
      case 'dataview':
        return `DataView(${(value as DataView).byteLength})`;
      case 'function':
      case 'async-function':
      case 'generator-function':
      case 'async-generator-function': {
        const fn = value as { name?: unknown };
        const name =
          typeof fn.name === 'string' && fn.name.length > 0
            ? fn.name
            : '(anonymous)';
        return `[Function: ${name}]`;
      }
      case 'generator':
        return '[Generator]';
      case 'async-generator':
        return '[AsyncGenerator]';
      case 'null-prototype-object':
        return '[Object: null prototype]';
      case 'class-instance': {
        try {
          const proto = Object.getPrototypeOf(value as object) as {
            constructor?: { name?: unknown };
          } | null;
          const ctorName = proto?.constructor?.name;
          return typeof ctorName === 'string' && ctorName.length > 0
            ? `[${ctorName}]`
            : '[Object]';
        } catch {
          return '[Object]';
        }
      }
      case 'boxed-boolean':
        return `Boolean(${String(value)})`;
      case 'boxed-number':
        return `Number(${String(value)})`;
      case 'boxed-string':
        return `String(${String(value)})`;
      case 'boxed-symbol':
        return '[Symbol Object]';
      case 'object':
        return '[Object]';
      default:
        return '[Unknown]';
    }
  } catch {
    return '[Preview unavailable]';
  }
}

/**
 * Generates a safe, bounded string preview for any value (including primitives).
 */
export function safePrimitivePreview(
  value: unknown,
  maxLength: number,
): string {
  try {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';

    const t = typeof value;
    if (t === 'boolean') return String(value);
    if (t === 'number') return String(value);
    if (t === 'bigint') return `${String(value as bigint)}n`;
    if (t === 'symbol') {
      const sym = value as symbol;
      return `Symbol(${sym.description ?? ''})`;
    }
    if (t === 'string') {
      const str = value as string;
      if (str.length + 2 <= maxLength) return `"${str}"`;
      return `"${str.slice(0, maxLength - 5)}..."`;
    }

    // Object / function
    const type = detectType(value);
    return safeObjectPreview(value, type);
  } catch {
    return '[Preview unavailable]';
  }
}
