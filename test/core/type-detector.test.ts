import { describe, it, expect } from 'vitest';
import {
  detectType,
  isObjectLike,
  isPrimitiveType,
  isTraversableType,
} from '../../src/core/type-detector.js';

describe('detectType — primitives', () => {
  it('detects undefined', () =>
    expect(detectType(undefined)).toBe('undefined'));
  it('detects null — NOT confused with object', () => {
    expect(detectType(null)).toBe('null');
    expect(detectType(null)).not.toBe('object');
  });
  it('detects boolean true', () => expect(detectType(true)).toBe('boolean'));
  it('detects boolean false', () => expect(detectType(false)).toBe('boolean'));
  it('detects positive number', () => expect(detectType(42)).toBe('number'));
  it('detects negative number', () => expect(detectType(-3.14)).toBe('number'));
  it('detects NaN as number', () => expect(detectType(NaN)).toBe('number'));
  it('detects Infinity as number', () =>
    expect(detectType(Infinity)).toBe('number'));
  it('detects -Infinity as number', () =>
    expect(detectType(-Infinity)).toBe('number'));
  it('detects zero as number', () => expect(detectType(0)).toBe('number'));
  it('detects bigint', () => expect(detectType(42n)).toBe('bigint'));
  it('detects zero bigint', () => expect(detectType(0n)).toBe('bigint'));
  it('detects string', () => expect(detectType('hello')).toBe('string'));
  it('detects empty string', () => expect(detectType('')).toBe('string'));
  it('detects symbol with description', () =>
    expect(detectType(Symbol('foo'))).toBe('symbol'));
  it('detects symbol without description', () =>
    expect(detectType(Symbol())).toBe('symbol'));
  it('detects Symbol.iterator as symbol', () =>
    expect(detectType(Symbol.iterator)).toBe('symbol'));
});

describe('detectType — functions', () => {
  it('detects arrow function', () =>
    expect(detectType(() => {})).toBe('function'));
  it('detects named function', () =>
    expect(detectType(function foo() {})).toBe('function'));
  it('detects anonymous function expression', () =>
    expect(detectType(function () {})).toBe('function'));
  it('detects class as function', () =>
    expect(detectType(class Foo {})).toBe('function'));
  it('detects async arrow function', () =>
    expect(detectType(async () => {})).toBe('async-function'));
  it('detects async named function', () =>
    expect(detectType(async function foo() {})).toBe('async-function'));
  it('detects generator function', () =>
    expect(detectType(function* () {})).toBe('generator-function'));
  it('detects named generator function', () =>
    expect(detectType(function* gen() {})).toBe('generator-function'));
  it('detects async generator function', () =>
    expect(detectType(async function* () {})).toBe('async-generator-function'));
});

describe('detectType — arrays', () => {
  it('detects empty array', () => expect(detectType([])).toBe('array'));
  it('detects non-empty array', () =>
    expect(detectType([1, 2, 3])).toBe('array'));
  it('detects array with mixed types', () =>
    expect(detectType([null, undefined, 1, 'a'])).toBe('array'));
  it('detects sparse array', () => {
    const sparse = new Array(10);
    expect(detectType(sparse)).toBe('array');
  });
});

describe('detectType — built-in objects', () => {
  it('detects Date', () => expect(detectType(new Date())).toBe('date'));
  it('detects invalid Date', () =>
    expect(detectType(new Date('invalid'))).toBe('date'));
  it('detects RegExp literal', () =>
    expect(detectType(/foo/gi)).toBe('regexp'));
  it('detects RegExp constructor', () =>
    expect(detectType(new RegExp('foo', 'i'))).toBe('regexp'));
  it('detects Map', () => expect(detectType(new Map())).toBe('map'));
  it('detects non-empty Map', () =>
    expect(detectType(new Map([['k', 'v']]))).toBe('map'));
  it('detects Set', () => expect(detectType(new Set())).toBe('set'));
  it('detects non-empty Set', () =>
    expect(detectType(new Set([1, 2, 3]))).toBe('set'));
  it('detects WeakMap', () =>
    expect(detectType(new WeakMap())).toBe('weakmap'));
  it('detects WeakSet', () =>
    expect(detectType(new WeakSet())).toBe('weakset'));
  it('detects Error', () =>
    expect(detectType(new Error('oops'))).toBe('error'));
  it('detects TypeError', () =>
    expect(detectType(new TypeError())).toBe('error'));
  it('detects RangeError', () =>
    expect(detectType(new RangeError())).toBe('error'));
  it('detects custom Error subclass', () => {
    class MyError extends Error {}
    expect(detectType(new MyError())).toBe('error');
  });
  it('detects Promise', () =>
    expect(detectType(Promise.resolve())).toBe('promise'));
  it('detects rejected Promise', () => {
    const p = Promise.reject(new Error('ignored'));
    p.catch(() => {}); // suppress unhandled rejection
    expect(detectType(p)).toBe('promise');
  });
});

describe('detectType — Node.js Buffer', () => {
  it('detects Buffer', () =>
    expect(detectType(Buffer.from('hello'))).toBe('buffer'));
  it('detects empty Buffer', () =>
    expect(detectType(Buffer.alloc(0))).toBe('buffer'));
  it('Buffer is NOT typedarray', () =>
    expect(detectType(Buffer.alloc(4))).not.toBe('typedarray'));
});

describe('detectType — binary types', () => {
  it('detects ArrayBuffer', () =>
    expect(detectType(new ArrayBuffer(8))).toBe('arraybuffer'));
  it('detects empty ArrayBuffer', () =>
    expect(detectType(new ArrayBuffer(0))).toBe('arraybuffer'));
  it('detects DataView', () =>
    expect(detectType(new DataView(new ArrayBuffer(8)))).toBe('dataview'));
  it('detects Uint8Array', () =>
    expect(detectType(new Uint8Array(4))).toBe('typedarray'));
  it('detects Int8Array', () =>
    expect(detectType(new Int8Array(4))).toBe('typedarray'));
  it('detects Uint16Array', () =>
    expect(detectType(new Uint16Array(4))).toBe('typedarray'));
  it('detects Int16Array', () =>
    expect(detectType(new Int16Array(4))).toBe('typedarray'));
  it('detects Uint32Array', () =>
    expect(detectType(new Uint32Array(4))).toBe('typedarray'));
  it('detects Int32Array', () =>
    expect(detectType(new Int32Array(4))).toBe('typedarray'));
  it('detects Float32Array', () =>
    expect(detectType(new Float32Array(4))).toBe('typedarray'));
  it('detects Float64Array', () =>
    expect(detectType(new Float64Array(4))).toBe('typedarray'));
  it('detects BigInt64Array', () =>
    expect(detectType(new BigInt64Array(4))).toBe('typedarray'));
  it('detects BigUint64Array', () =>
    expect(detectType(new BigUint64Array(4))).toBe('typedarray'));
  it('detects Uint8ClampedArray', () =>
    expect(detectType(new Uint8ClampedArray(4))).toBe('typedarray'));
});

describe('detectType — boxed primitives', () => {
  it('detects boxed Boolean', () =>
    expect(detectType(new Boolean(true))).toBe('boxed-boolean'));
  it('detects boxed Boolean (false)', () =>
    expect(detectType(new Boolean(false))).toBe('boxed-boolean'));
  it('detects boxed Number', () =>
    expect(detectType(new Number(42))).toBe('boxed-number'));
  it('detects boxed String', () =>
    expect(detectType(new String('hi'))).toBe('boxed-string'));
  it('detects boxed Symbol', () =>
    expect(detectType(Object(Symbol()))).toBe('boxed-symbol'));
});

describe('detectType — generators', () => {
  it('detects generator instance', () => {
    function* gen() {
      yield 1;
    }
    expect(detectType(gen())).toBe('generator');
  });
  it('detects async generator instance', () => {
    async function* agen() {
      yield 1;
    }
    expect(detectType(agen())).toBe('async-generator');
  });
});

describe('detectType — object structural types', () => {
  it('detects plain object', () => expect(detectType({})).toBe('object'));
  it('detects Object.create(Object.prototype)', () => {
    expect(detectType(Object.create(Object.prototype))).toBe('object');
  });
  it('detects null-prototype object', () => {
    expect(detectType(Object.create(null))).toBe('null-prototype-object');
  });
  it('detects class instance', () => {
    class Dog {
      name = 'Rex';
    }
    expect(detectType(new Dog())).toBe('class-instance');
  });
  it('detects subclass instance as class-instance', () => {
    class Animal {}
    class Dog extends Animal {}
    expect(detectType(new Dog())).toBe('class-instance');
  });
});

describe('isObjectLike', () => {
  it('returns false for null', () => expect(isObjectLike(null)).toBe(false));
  it('returns false for undefined', () =>
    expect(isObjectLike(undefined)).toBe(false));
  it('returns false for number', () => expect(isObjectLike(42)).toBe(false));
  it('returns false for string', () => expect(isObjectLike('hi')).toBe(false));
  it('returns true for object', () => expect(isObjectLike({})).toBe(true));
  it('returns true for array', () => expect(isObjectLike([])).toBe(true));
  it('returns true for function', () =>
    expect(isObjectLike(() => {})).toBe(true));
});

describe('isPrimitiveType', () => {
  it('returns true for undefined', () =>
    expect(isPrimitiveType('undefined')).toBe(true));
  it('returns true for null', () => expect(isPrimitiveType('null')).toBe(true));
  it('returns true for string', () =>
    expect(isPrimitiveType('string')).toBe(true));
  it('returns false for object', () =>
    expect(isPrimitiveType('object')).toBe(false));
  it('returns false for array', () =>
    expect(isPrimitiveType('array')).toBe(false));
});

describe('isTraversableType', () => {
  it('returns false for undefined', () =>
    expect(isTraversableType('undefined')).toBe(false));
  it('returns false for null', () =>
    expect(isTraversableType('null')).toBe(false));
  it('returns false for function', () =>
    expect(isTraversableType('function')).toBe(false));
  it('returns false for weakmap', () =>
    expect(isTraversableType('weakmap')).toBe(false));
  it('returns false for weakset', () =>
    expect(isTraversableType('weakset')).toBe(false));
  it('returns false for promise', () =>
    expect(isTraversableType('promise')).toBe(false));
  it('returns false for buffer', () =>
    expect(isTraversableType('buffer')).toBe(false));
  it('returns false for typedarray', () =>
    expect(isTraversableType('typedarray')).toBe(false));
  it('returns true for object', () =>
    expect(isTraversableType('object')).toBe(true));
  it('returns true for array', () =>
    expect(isTraversableType('array')).toBe(true));
  it('returns true for map', () => expect(isTraversableType('map')).toBe(true));
  it('returns true for set', () => expect(isTraversableType('set')).toBe(true));
  it('returns true for error', () =>
    expect(isTraversableType('error')).toBe(true));
  it('returns true for class-instance', () =>
    expect(isTraversableType('class-instance')).toBe(true));
  it('returns true for null-prototype-object', () =>
    expect(isTraversableType('null-prototype-object')).toBe(true));
});
