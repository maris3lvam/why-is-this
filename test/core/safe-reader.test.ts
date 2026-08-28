import { describe, it, expect } from 'vitest';
import {
  safeReadKeys,
  safeReadValue,
  valueToSafeValue,
  safePrimitivePreview,
} from '../../src/core/safe-reader.js';
import { DEFAULT_LIMITS } from '../../src/core/limits.js';
import type { InspectionError } from '../../src/models/inspection-result.js';

// ─────────────────────────────────────────────────────────────────────────────
// safeReadKeys
// ─────────────────────────────────────────────────────────────────────────────

describe('safeReadKeys', () => {
  it('returns empty for empty object', () => {
    const { keys, errors } = safeReadKeys({}, 'root', DEFAULT_LIMITS);
    expect(keys).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it('reads string keys', () => {
    const { keys } = safeReadKeys({ a: 1, b: 2 }, 'root', DEFAULT_LIMITS);
    expect(keys.map((k) => k.key)).toEqual(['a', 'b']);
  });

  it('marks data properties as kind: data', () => {
    const { keys } = safeReadKeys({ x: 42 }, 'root', DEFAULT_LIMITS);
    expect(keys[0]?.kind).toBe('data');
  });

  it('marks accessor properties as kind: accessor', () => {
    const obj = {
      get x() {
        return 1;
      },
    };
    const { keys } = safeReadKeys(obj, 'root', DEFAULT_LIMITS);
    const k = keys.find((ki) => ki.key === 'x');
    expect(k?.kind).toBe('accessor');
  });

  it('sets writable to null for accessor properties', () => {
    const obj = {
      get x() {
        return 1;
      },
    };
    const { keys } = safeReadKeys(obj, 'root', DEFAULT_LIMITS);
    const k = keys.find((ki) => ki.key === 'x');
    expect(k?.writable).toBe(null);
  });

  it('marks enumerable properties correctly', () => {
    const obj = {};
    Object.defineProperty(obj, 'hidden', {
      value: 42,
      enumerable: false,
      configurable: true,
      writable: true,
    });
    const { keys } = safeReadKeys(obj, 'root', DEFAULT_LIMITS);
    const k = keys.find((ki) => ki.key === 'hidden');
    expect(k?.enumerable).toBe(false);
  });

  it('marks writable correctly', () => {
    const obj = {};
    Object.defineProperty(obj, 'readOnly', {
      value: 1,
      enumerable: true,
      configurable: true,
      writable: false,
    });
    const { keys } = safeReadKeys(obj, 'root', DEFAULT_LIMITS);
    const k = keys.find((ki) => ki.key === 'readOnly');
    expect(k?.writable).toBe(false);
  });

  it('reads symbol keys', () => {
    const sym = Symbol('test');
    const obj = { [sym]: 'value', a: 1 };
    const { keys } = safeReadKeys(obj, 'root', DEFAULT_LIMITS);
    expect(keys.some((k) => k.key === sym)).toBe(true);
  });

  it('respects maxProperties limit', () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 300; i++) obj[`key${i}`] = i;
    const limits = { ...DEFAULT_LIMITS, maxProperties: 50 };
    const { keys } = safeReadKeys(obj, 'root', limits);
    expect(keys.length).toBeLessThanOrEqual(50);
  });

  it('includes both enumerable and non-enumerable keys', () => {
    const obj = {};
    Object.defineProperty(obj, 'visible', { value: 1, enumerable: true });
    Object.defineProperty(obj, 'hidden', { value: 2, enumerable: false });
    const { keys } = safeReadKeys(obj, 'root', DEFAULT_LIMITS);
    expect(keys.map((k) => k.key)).toContain('visible');
    expect(keys.map((k) => k.key)).toContain('hidden');
  });

  it('handles prototype pollution keys safely', () => {
    const obj = Object.create(null) as Record<string, unknown>;
    obj['__proto__'] = 'attack';
    obj['constructor'] = 'fake';
    const { keys } = safeReadKeys(obj, 'root', DEFAULT_LIMITS);
    // Keys should be readable without any prototype mutation
    expect(keys.some((k) => k.key === '__proto__')).toBe(true);
    expect(keys.some((k) => k.key === 'constructor')).toBe(true);
    // Object.prototype must not be mutated
    expect(Object.prototype.toString).toBeTypeOf('function');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// safeReadValue — CRITICAL: getter safety
// ─────────────────────────────────────────────────────────────────────────────

describe('safeReadValue — getter safety (CRITICAL)', () => {
  it('does NOT execute getter for accessor property', () => {
    let executed = false;
    const obj = {
      get dangerous() {
        executed = true;
        return 42;
      },
    };
    const errors: InspectionError[] = [];
    const result = safeReadValue(obj, 'dangerous', 'root.dangerous', errors);

    expect(result.kind).toBe('accessor');
    expect(executed).toBe(false); // ← THE CRITICAL ASSERTION
  });

  it('does NOT execute throwing getter', () => {
    const obj = {
      get explosive() {
        throw new Error('BOOM — should never run');
      },
    };
    const errors: InspectionError[] = [];
    // Must not throw — getter must not be called
    expect(() =>
      safeReadValue(obj, 'explosive', 'root.explosive', errors),
    ).not.toThrow();
    const result = safeReadValue(obj, 'explosive', 'root.explosive', errors);
    expect(result.kind).toBe('accessor');
  });

  it('returns { kind: accessor, evaluated: false } for getter', () => {
    const obj = {
      get x() {
        return 99;
      },
    };
    const errors: InspectionError[] = [];
    const result = safeReadValue(obj, 'x', 'root.x', errors);
    expect(result).toEqual({ kind: 'accessor', evaluated: false });
  });

  it('reads data property value safely', () => {
    const errors: InspectionError[] = [];
    const result = safeReadValue({ x: 42 }, 'x', 'root.x', errors);
    expect(result).toEqual({ kind: 'primitive', value: 42 });
    expect(errors).toHaveLength(0);
  });

  it('returns unreadable for nonexistent property', () => {
    const errors: InspectionError[] = [];
    const result = safeReadValue({}, 'nonexistent', 'root.nonexistent', errors);
    expect(result.kind).toBe('unreadable');
  });

  it('handles string property value', () => {
    const errors: InspectionError[] = [];
    const result = safeReadValue(
      { name: 'Alice' },
      'name',
      'root.name',
      errors,
    );
    expect(result).toEqual({ kind: 'primitive', value: 'Alice' });
  });

  it('handles null property value', () => {
    const errors: InspectionError[] = [];
    const result = safeReadValue({ x: null }, 'x', 'root.x', errors);
    expect(result).toEqual({ kind: 'primitive', value: null });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// valueToSafeValue
// ─────────────────────────────────────────────────────────────────────────────

describe('valueToSafeValue', () => {
  it('handles undefined', () =>
    expect(valueToSafeValue(undefined)).toEqual({
      kind: 'primitive',
      value: undefined,
    }));
  it('handles null', () =>
    expect(valueToSafeValue(null)).toEqual({ kind: 'primitive', value: null }));
  it('handles boolean', () =>
    expect(valueToSafeValue(true)).toEqual({ kind: 'primitive', value: true }));
  it('handles number', () =>
    expect(valueToSafeValue(42)).toEqual({ kind: 'primitive', value: 42 }));
  it('handles string', () =>
    expect(valueToSafeValue('hi')).toEqual({ kind: 'primitive', value: 'hi' }));
  it('handles bigint', () =>
    expect(valueToSafeValue(42n)).toEqual({ kind: 'bigint', value: 42n }));
  it('handles symbol', () => {
    const sym = Symbol('test');
    const result = valueToSafeValue(sym);
    expect(result).toEqual({ kind: 'symbol', description: 'test' });
  });
  it('handles symbol without description', () => {
    const sym = Symbol();
    const result = valueToSafeValue(sym);
    expect(result).toEqual({ kind: 'symbol', description: undefined });
  });
  it('handles function', () => {
    function myFn() {}
    const result = valueToSafeValue(myFn);
    expect(result.kind).toBe('function');
    if (result.kind === 'function') {
      expect(result.name).toBe('myFn');
    }
  });
  it('handles plain object', () => {
    const result = valueToSafeValue({ a: 1 });
    expect(result.kind).toBe('object');
    if (result.kind === 'object') {
      expect(result.type).toBe('object');
    }
  });
  it('handles array', () => {
    const result = valueToSafeValue([1, 2, 3]);
    expect(result.kind).toBe('object');
    if (result.kind === 'object') {
      expect(result.type).toBe('array');
      expect(result.preview).toBe('Array(3)');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// safePrimitivePreview
// ─────────────────────────────────────────────────────────────────────────────

describe('safePrimitivePreview', () => {
  it('renders undefined', () =>
    expect(safePrimitivePreview(undefined, 256)).toBe('undefined'));
  it('renders null', () =>
    expect(safePrimitivePreview(null, 256)).toBe('null'));
  it('renders boolean', () =>
    expect(safePrimitivePreview(true, 256)).toBe('true'));
  it('renders number', () => expect(safePrimitivePreview(42, 256)).toBe('42'));
  it('renders bigint', () =>
    expect(safePrimitivePreview(99n, 256)).toBe('99n'));
  it('renders string with quotes', () =>
    expect(safePrimitivePreview('hello', 256)).toBe('"hello"'));
  it('truncates long strings', () => {
    const long = 'a'.repeat(300);
    const preview = safePrimitivePreview(long, 50);
    expect(preview.length).toBeLessThanOrEqual(55); // quote overhead
    expect(preview).toContain('...');
  });
  it('renders symbol', () =>
    expect(safePrimitivePreview(Symbol('x'), 256)).toBe('Symbol(x)'));
  it('renders array preview', () =>
    expect(safePrimitivePreview([1, 2], 256)).toBe('Array(2)'));
});
