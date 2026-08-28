import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('why.type', () => {
  it('returns null for null', () => expect(why.type(null)).toBe('null'));
  it('returns undefined for undefined', () =>
    expect(why.type(undefined)).toBe('undefined'));
  it('returns boolean', () => expect(why.type(true)).toBe('boolean'));
  it('returns number', () => expect(why.type(42)).toBe('number'));
  it('returns bigint', () => expect(why.type(42n)).toBe('bigint'));
  it('returns string', () => expect(why.type('')).toBe('string'));
  it('returns symbol', () => expect(why.type(Symbol())).toBe('symbol'));
  it('returns function', () => expect(why.type(() => {})).toBe('function'));
  it('returns async-function', () =>
    expect(why.type(async () => {})).toBe('async-function'));
  it('returns generator-function', () =>
    expect(why.type(function* () {})).toBe('generator-function'));
  it('returns array for []', () => expect(why.type([])).toBe('array'));
  it('returns object for {}', () => expect(why.type({})).toBe('object'));
  it('returns map', () => expect(why.type(new Map())).toBe('map'));
  it('returns set', () => expect(why.type(new Set())).toBe('set'));
  it('returns date', () => expect(why.type(new Date())).toBe('date'));
  it('returns error', () => expect(why.type(new Error())).toBe('error'));
  it('returns buffer', () => expect(why.type(Buffer.alloc(0))).toBe('buffer'));
  it('returns null-prototype-object', () =>
    expect(why.type(Object.create(null))).toBe('null-prototype-object'));
  it('returns class-instance', () => {
    class Foo {}
    expect(why.type(new Foo())).toBe('class-instance');
  });
  it('returns boxed-boolean', () =>
    expect(why.type(new Boolean())).toBe('boxed-boolean'));
  it('returns boxed-number', () =>
    expect(why.type(new Number())).toBe('boxed-number'));
  it('returns boxed-string', () =>
    expect(why.type(new String())).toBe('boxed-string'));
});

describe('why.value', () => {
  it('returns primitive for number', () => {
    expect(why.value(42)).toEqual({ kind: 'primitive', value: 42 });
  });
  it('returns primitive for null', () => {
    expect(why.value(null)).toEqual({ kind: 'primitive', value: null });
  });
  it('returns bigint', () => {
    expect(why.value(5n)).toEqual({ kind: 'bigint', value: 5n });
  });
  it('returns symbol', () => {
    const s = Symbol('hi');
    const r = why.value(s);
    expect(r.kind).toBe('symbol');
    if (r.kind === 'symbol') expect(r.description).toBe('hi');
  });
  it('returns object for plain object', () => {
    const r = why.value({});
    expect(r.kind).toBe('object');
  });
  it('returns function for function', () => {
    const r = why.value(function namedFn() {});
    expect(r.kind).toBe('function');
    if (r.kind === 'function') expect(r.name).toBe('namedFn');
  });
});

describe('why.keys', () => {
  it('returns empty for primitive', () => expect(why.keys(42)).toHaveLength(0));
  it('returns empty for null', () => expect(why.keys(null)).toHaveLength(0));
  it('returns string keys', () => {
    const keys = why.keys({ a: 1, b: 2 });
    expect(keys.map((k) => k.key)).toEqual(['a', 'b']);
  });
  it('includes non-enumerable keys', () => {
    const obj = {};
    Object.defineProperty(obj, 'hidden', { value: 1, enumerable: false });
    const keys = why.keys(obj);
    expect(keys.some((k) => k.key === 'hidden')).toBe(true);
  });
  it('includes symbol keys', () => {
    const sym = Symbol('s');
    const obj = { [sym]: 1 };
    const keys = why.keys(obj);
    expect(keys.some((k) => k.key === sym)).toBe(true);
  });
  it('correctly marks accessor as kind: accessor', () => {
    const obj = {
      get x() {
        return 1;
      },
    };
    const keys = why.keys(obj);
    expect(keys.find((k) => k.key === 'x')?.kind).toBe('accessor');
  });
});

describe('why.values', () => {
  it('returns empty for primitive', () =>
    expect(why.values(42)).toHaveLength(0));
  it('returns safe values', () => {
    const vals = why.values({ a: 1, b: 'hello' });
    expect(vals).toContainEqual({ kind: 'primitive', value: 1 });
    expect(vals).toContainEqual({ kind: 'primitive', value: 'hello' });
  });
  it('returns accessor sentinel for getter — no execution', () => {
    let executed = false;
    const obj = {
      get x() {
        executed = true;
        return 42;
      },
    };
    const vals = why.values(obj);
    expect(executed).toBe(false); // getter NOT executed
    expect(vals[0]).toEqual({ kind: 'accessor', evaluated: false });
  });
});

describe('why.entries', () => {
  it('returns empty for null', () => expect(why.entries(null)).toHaveLength(0));
  it('returns entries with key, value, keyInfo', () => {
    const entries = why.entries({ name: 'Alice' });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.key).toBe('name');
    expect(entries[0]?.value).toEqual({ kind: 'primitive', value: 'Alice' });
    expect(entries[0]?.keyInfo.enumerable).toBe(true);
  });
});

describe('why.size', () => {
  it('returns string-length for string', () =>
    expect(why.size('hello')).toEqual({ kind: 'string-length', value: 5 }));
  it('returns array-length for array', () =>
    expect(why.size([1, 2, 3])).toEqual({ kind: 'array-length', value: 3 }));
  it('returns collection-size for Map', () =>
    expect(why.size(new Map([['a', 1]]))).toEqual({
      kind: 'collection-size',
      value: 1,
    }));
  it('returns collection-size for Set', () =>
    expect(why.size(new Set([1, 2]))).toEqual({
      kind: 'collection-size',
      value: 2,
    }));
  it('returns byte-length for Buffer', () =>
    expect(why.size(Buffer.from('hi'))).toEqual({
      kind: 'byte-length',
      value: 2,
    }));
  it('returns byte-length for ArrayBuffer', () =>
    expect(why.size(new ArrayBuffer(8))).toEqual({
      kind: 'byte-length',
      value: 8,
    }));
  it('returns byte-length for TypedArray', () =>
    expect(why.size(new Uint32Array(4))).toEqual({
      kind: 'byte-length',
      value: 16,
    }));
  it('returns property-count for object', () =>
    expect(why.size({ a: 1, b: 2 })).toEqual({
      kind: 'property-count',
      value: 2,
    }));
  it('returns none for number', () =>
    expect(why.size(42)).toEqual({ kind: 'none', value: 0 }));
  it('returns none for function', () =>
    expect(why.size(() => {})).toEqual({ kind: 'none', value: 0 }));
});

describe('why.depth', () => {
  it('returns 0 for primitive', () => expect(why.depth(42)).toBe(0));
  it('returns 0 for empty object', () => expect(why.depth({})).toBe(0));
  it('returns 1 for flat object', () => expect(why.depth({ a: 1 })).toBe(1));
  it('returns 3 for three-level nesting', () =>
    expect(why.depth({ a: { b: { c: 1 } } })).toBe(3));
  it('is safe for circular object', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    expect(() => why.depth(obj)).not.toThrow();
  });
});

describe('why.prototype', () => {
  it('returns null prototype for Object.create(null)', () => {
    const r = why.prototype(Object.create(null));
    expect(r.isNullPrototype).toBe(true);
    expect(r.name).toBe(null);
    expect(r.chain).toHaveLength(0);
  });
  it('returns Object for plain object', () => {
    const r = why.prototype({});
    expect(r.name).toBe('Object');
    expect(r.isNullPrototype).toBe(false);
  });
  it('returns Date in chain for Date instance', () => {
    const r = why.prototype(new Date());
    expect(r.name).toBe('Date');
    expect(r.chain).toContain('Date');
  });
  it('returns null info for primitive', () => {
    const r = why.prototype(42);
    expect(r.name).toBe(null);
  });
});

describe('why.constructor', () => {
  it('returns Object for plain object', () => {
    expect(why.constructor({}).name).toBe('Object');
  });
  it('returns Date for Date', () => {
    expect(why.constructor(new Date()).name).toBe('Date');
  });
  it('returns class name for class instance', () => {
    class MyClass {}
    expect(why.constructor(new MyClass()).name).toBe('MyClass');
  });
  it('returns null for null-proto object', () => {
    expect(why.constructor(Object.create(null)).name).toBe(null);
  });
  it('detects constructor override', () => {
    const obj = { constructor: 'fake' };
    const r = why.constructor(obj);
    expect(r.isOverridden).toBe(true);
    expect(r.name).toBe('Object'); // reads from prototype
  });
  it('returns null for primitives', () => {
    expect(why.constructor(42).name).toBe(null);
  });
});

describe('why.references', () => {
  it('returns empty for non-shared object', () => {
    expect(why.references({ a: { x: 1 }, b: { y: 2 } })).toHaveLength(0);
  });
  it('detects shared reference', () => {
    const shared = { id: 1 };
    const refs = why.references({ a: shared, b: shared });
    expect(refs).toHaveLength(1);
    expect(refs[0]?.paths).toHaveLength(2);
  });
  it('returns empty for primitive', () => {
    expect(why.references(42)).toHaveLength(0);
  });
});

describe('why.circular', () => {
  it('returns isCircular: false for acyclic object', () => {
    const r = why.circular({ a: 1 });
    expect(r.isCircular).toBe(false);
    expect(r.paths).toHaveLength(0);
  });
  it('detects direct circular reference', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    const r = why.circular(obj);
    expect(r.isCircular).toBe(true);
    expect(r.paths[0]?.path).toBe('root.self');
    expect(r.paths[0]?.targetPath).toBe('root');
  });
  it('is safe for circular object — never throws', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    expect(() => why.circular(obj)).not.toThrow();
  });
  it('returns isCircular: false for primitives', () => {
    expect(why.circular(42).isCircular).toBe(false);
    expect(why.circular(null).isCircular).toBe(false);
  });
});

describe('why.explain', () => {
  it('returns ExplainResult with summary, type, findings, reasons', () => {
    const r = why.explain({ a: 1 });
    expect(typeof r.summary).toBe('string');
    expect(r.type).toBe('object');
    expect(Array.isArray(r.findings)).toBe(true);
    expect(Array.isArray(r.reasons)).toBe(true);
  });
  it('toString() returns a string', () => {
    const r = why.explain({ a: 1 });
    expect(typeof r.toString()).toBe('string');
  });
  it('flags circular reference in findings', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    const r = why.explain(obj);
    expect(r.findings.some((f) => f.kind === 'circular')).toBe(true);
  });
  it('flags boxed primitive', () => {
    const r = why.explain(new Boolean(true));
    expect(r.findings.some((f) => f.kind === 'boxed')).toBe(true);
  });
  it('flags null prototype', () => {
    const r = why.explain(Object.create(null));
    expect(r.findings.some((f) => f.kind === 'null-proto')).toBe(true);
  });
  it('flags accessor properties', () => {
    const obj = {
      get x() {
        return 1;
      },
    };
    const r = why.explain(obj);
    expect(r.findings.some((f) => f.kind === 'accessor')).toBe(true);
  });
});

describe('why.describe', () => {
  it('returns a non-empty string', () => {
    expect(typeof why.describe({ a: 1 })).toBe('string');
    expect(why.describe({ a: 1 }).length).toBeGreaterThan(0);
  });
  it('mentions circular for circular object', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    const desc = why.describe(obj);
    expect(desc.toLowerCase()).toContain('circular');
  });
  it('mentions property count for objects', () => {
    const desc = why.describe({ a: 1, b: 2, c: 3 });
    expect(desc).toContain('3');
  });
  it('mentions null prototype', () => {
    const desc = why.describe(Object.create(null));
    expect(desc.toLowerCase()).toContain('null');
  });
});
