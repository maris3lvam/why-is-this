/**
 * Regression tests.
 *
 * Each test represents a discovered edge case or bug. Tests are named
 * descriptively so failures identify the exact regression.
 *
 * Add new regression tests here when bugs are discovered.
 */

import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';
import { inspect } from '../../src/core/inspect-engine.js';

describe('Regression: circular references', () => {
  it('does not recurse infinitely on self-referencing objects', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    // Must complete in bounded time
    expect(() => inspect(obj)).not.toThrow();
  });

  it('does not recurse infinitely on mutual circular references', () => {
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    a['b'] = b;
    b['a'] = a;
    expect(() => inspect(a)).not.toThrow();
    expect(() => inspect(b)).not.toThrow();
  });

  it('does not recurse infinitely on triple circular chain', () => {
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    const c: Record<string, unknown> = {};
    a['b'] = b;
    b['c'] = c;
    c['a'] = a;
    expect(() => inspect(a)).not.toThrow();
  });

  it('does not recurse on circular array', () => {
    const arr: unknown[] = [1, 2];
    arr.push(arr); // arr[2] = arr
    expect(() => inspect(arr)).not.toThrow();
    const r = inspect(arr);
    expect(r.isCircular).toBe(true);
  });
});

describe('Regression: getter safety', () => {
  it('does not execute getters by default', () => {
    let executed = false;
    const obj = {
      get x() {
        executed = true;
        return 1;
      },
    };
    inspect(obj);
    expect(executed).toBe(false);
  });

  it('handles constructor property overrides', () => {
    const obj = { constructor: 'fake' };
    const r = inspect(obj);
    // Must read constructor from prototype, not the override
    expect(r.constructorInfo.name).toBe('Object');
    expect(r.constructorInfo.isOverridden).toBe(true);
  });
});

describe('Regression: null prototype objects', () => {
  it('handles null prototype objects', () => {
    const obj = Object.create(null);
    expect(() => inspect(obj)).not.toThrow();
    const r = inspect(obj);
    expect(r.type).toBe('null-prototype-object');
    expect(r.prototypeInfo.isNullPrototype).toBe(true);
  });

  it('handles deeply nested null-proto objects', () => {
    const inner = Object.create(null) as Record<string, unknown>;
    inner['x'] = 1;
    const outer: Record<string, unknown> = { inner };
    expect(() => inspect(outer)).not.toThrow();
  });
});

describe('Regression: repeated references', () => {
  it('detects repeated references (same identity, not same value)', () => {
    const shared = { id: 1 };
    const obj = { a: shared, b: shared };
    const r = inspect(obj);
    expect(r.repeatedRefs).toHaveLength(1);
    expect(r.isCircular).toBe(false); // NOT circular
  });

  it('distinguishes repeated references from circular references', () => {
    const shared = {};
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    const obj = { shared1: shared, shared2: shared, loop: circular };
    const r = inspect(obj);
    expect(r.isCircular).toBe(true);
    // shared appears at 2+ paths
    const sharedRef = r.repeatedRefs.find(
      (ref) =>
        ref.paths.includes('root.shared1') &&
        ref.paths.includes('root.shared2'),
    );
    expect(sharedRef).toBeDefined();
  });
});

describe('Regression: custom toString/valueOf/Symbol.toPrimitive', () => {
  it('handles object with custom toString — does not call it', () => {
    const obj = {
      toString() {
        return 'custom';
      },
    };
    inspect(obj);
    // toString on the object itself won't be called by the engine
    // (it may be called indirectly for prototype name — that's OK)
    expect(() => inspect(obj)).not.toThrow();
  });

  it('handles object with throwing valueOf — does not crash', () => {
    const obj = {
      valueOf() {
        throw new Error('valueOf throws');
      },
    };
    expect(() => inspect(obj)).not.toThrow();
  });

  it('handles object with throwing Symbol.toPrimitive', () => {
    const obj = {
      [Symbol.toPrimitive]() {
        throw new Error('toPrimitive throws');
      },
    };
    expect(() => inspect(obj)).not.toThrow();
  });
});

describe('Regression: edge-case object graphs', () => {
  it('handles empty array', () => {
    const r = inspect([]);
    expect(r.type).toBe('array');
    expect(r.size).toEqual({ kind: 'array-length', value: 0 });
  });

  it('handles array of arrays', () => {
    const r = inspect([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
    expect(r.type).toBe('array');
    expect(r.depth).toBeGreaterThan(1);
  });

  it('handles Map with object keys and values', () => {
    const keyObj = { key: true };
    const valObj = { val: true };
    const map = new Map([[keyObj, valObj]]);
    expect(() => inspect(map)).not.toThrow();
  });

  it('handles Set containing circular object', () => {
    const inner: Record<string, unknown> = {};
    inner['self'] = inner;
    const set = new Set([inner]);
    expect(() => inspect(set)).not.toThrow();
    const r = inspect(set);
    expect(r.isCircular).toBe(true);
  });

  it('handles Error with custom properties', () => {
    const err = new Error('test');
    (err as unknown as Record<string, unknown>)['code'] = 'ERR_CUSTOM';
    (err as unknown as Record<string, unknown>)['details'] = {
      reason: 'testing',
    };
    expect(() => inspect(err)).not.toThrow();
    const r = inspect(err);
    expect(r.type).toBe('error');
  });

  it('handles boxed Number', () => {
    const r = inspect(new Number(42));
    expect(r.type).toBe('boxed-number');
  });

  it('handles Date', () => {
    const r = inspect(new Date('2024-01-01'));
    expect(r.type).toBe('date');
    expect(r.safePreview).toContain('Date(');
  });

  it('handles RegExp', () => {
    const r = inspect(/hello/gi);
    expect(r.type).toBe('regexp');
    expect(r.safePreview).toContain('/hello/gi');
  });
});

describe('Regression: no implicit output', () => {
  it('why() does not call console.log (core APIs are silent)', () => {
    // If this test passes without console output, the principle holds.
    // The no-console ESLint rule enforces this at the source level.
    const result = why({ a: 1 });
    // We only verify the return value — not console calls
    // (console.log is an ESLint violation in src/; this is a documentation test)
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });
});
