import { describe, it, expect } from 'vitest';
import { inspect } from '../../src/core/inspect-engine.js';

describe('inspect — primitives', () => {
  it('handles undefined', () => {
    const r = inspect(undefined);
    expect(r.type).toBe('undefined');
    expect(r.rawValue).toBe(undefined);
    expect(r.depth).toBe(0);
    expect(r.isCircular).toBe(false);
    expect(r.entries).toHaveLength(0);
  });

  it('handles null', () => {
    const r = inspect(null);
    expect(r.type).toBe('null');
    expect(r.rawValue).toBe(null);
  });

  it('handles number', () => {
    const r = inspect(42);
    expect(r.type).toBe('number');
    expect(r.safePreview).toBe('42');
  });

  it('handles string', () => {
    const r = inspect('hello');
    expect(r.type).toBe('string');
    expect(r.size).toEqual({ kind: 'string-length', value: 5 });
  });

  it('handles bigint', () => {
    const r = inspect(99n);
    expect(r.type).toBe('bigint');
    expect(r.safePreview).toBe('99n');
  });

  it('handles symbol', () => {
    const r = inspect(Symbol('test'));
    expect(r.type).toBe('symbol');
  });
});

describe('inspect — objects', () => {
  it('handles plain object', () => {
    const r = inspect({ a: 1, b: 2 });
    expect(r.type).toBe('object');
    expect(r.depth).toBe(1);
    expect(r.entries).toHaveLength(2);
  });

  it('handles empty object', () => {
    const r = inspect({});
    expect(r.type).toBe('object');
    expect(r.depth).toBe(0);
    expect(r.entries).toHaveLength(0);
  });

  it('handles nested object', () => {
    const r = inspect({ a: { b: { c: 1 } } });
    expect(r.type).toBe('object');
    expect(r.depth).toBe(3);
  });

  it('handles null-prototype object', () => {
    const r = inspect(Object.create(null));
    expect(r.type).toBe('null-prototype-object');
    expect(r.prototypeInfo.isNullPrototype).toBe(true);
  });

  it('handles class instance', () => {
    class User {
      name = 'Alice';
    }
    const r = inspect(new User());
    expect(r.type).toBe('class-instance');
    expect(r.constructorInfo.name).toBe('User');
  });
});

describe('inspect — collections', () => {
  it('handles array', () => {
    const r = inspect([1, 2, 3]);
    expect(r.type).toBe('array');
    expect(r.size).toEqual({ kind: 'array-length', value: 3 });
  });

  it('handles Map', () => {
    const r = inspect(new Map([['k', 'v']]));
    expect(r.type).toBe('map');
    expect(r.size).toEqual({ kind: 'collection-size', value: 1 });
  });

  it('handles Set', () => {
    const r = inspect(new Set([1, 2, 3]));
    expect(r.type).toBe('set');
    expect(r.size).toEqual({ kind: 'collection-size', value: 3 });
  });
});

describe('inspect — circular references', () => {
  it('handles direct circular reference safely', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    expect(() => inspect(obj)).not.toThrow();
    const r = inspect(obj);
    expect(r.isCircular).toBe(true);
    expect(r.circularPaths[0]?.path).toBe('root.self');
  });

  it('handles deep circular reference safely', () => {
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    a['b'] = b;
    b['a'] = a;
    expect(() => inspect(a)).not.toThrow();
    const r = inspect(a);
    expect(r.isCircular).toBe(true);
  });

  it('handles multiple circular references', () => {
    const root: Record<string, unknown> = {};
    root['loop1'] = root;
    root['loop2'] = root;
    expect(() => inspect(root)).not.toThrow();
    const r = inspect(root);
    expect(r.isCircular).toBe(true);
  });
});

describe('inspect — prototype and constructor', () => {
  it('returns correct constructor name for plain object', () => {
    const r = inspect({});
    expect(r.constructorInfo.name).toBe('Object');
  });

  it('returns correct constructor for Date', () => {
    const r = inspect(new Date());
    expect(r.constructorInfo.name).toBe('Date');
  });

  it('returns correct constructor for custom class', () => {
    class Foo {}
    const r = inspect(new Foo());
    expect(r.constructorInfo.name).toBe('Foo');
  });

  it('detects overridden constructor', () => {
    const obj = { constructor: 'fake' };
    const r = inspect(obj);
    expect(r.constructorInfo.isOverridden).toBe(true);
    expect(r.constructorInfo.name).toBe('Object'); // reads from prototype
  });

  it('handles null-prototype object constructor', () => {
    const r = inspect(Object.create(null));
    expect(r.constructorInfo.name).toBe(null);
  });

  it('returns prototype chain for nested class', () => {
    class Animal {}
    class Dog extends Animal {}
    const r = inspect(new Dog());
    expect(r.prototypeInfo.chain).toContain('Dog');
    expect(r.prototypeInfo.chain).toContain('Animal');
  });
});

describe('inspect — result is frozen', () => {
  it('InspectionResult is frozen', () => {
    const r = inspect({ a: 1 });
    expect(Object.isFrozen(r)).toBe(true);
  });
});

describe('inspect — rawValue', () => {
  it('rawValue is the exact same reference', () => {
    const obj = { x: 1 };
    const r = inspect(obj);
    expect(r.rawValue).toBe(obj); // same reference, not a clone
  });
});
