import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';
import { WhyAssertionError } from '../../src/domains/equality-engine.js';

describe('Equality Engine — Comprehensive Domain Tests', () => {
  describe('why.is()', () => {
    it('matches string primitives', () => expect(why.is('hello', 'string')).toBe(true));
    it('matches number primitives', () => expect(why.is(42, 'number')).toBe(true));
    it('matches bigint primitives', () => expect(why.is(100n, 'bigint')).toBe(true));
    it('matches boolean primitives', () => expect(why.is(true, 'boolean')).toBe(true));
    it('matches symbol primitives', () => expect(why.is(Symbol('x'), 'symbol')).toBe(true));
    it('matches null', () => expect(why.is(null, 'null')).toBe(true));
    it('matches undefined', () => expect(why.is(undefined, 'undefined')).toBe(true));
    it('matches array', () => expect(why.is([1, 2], 'array')).toBe(true));
    it('matches plain object', () => expect(why.is({}, 'object')).toBe(true));
    it('matches Map collection', () => expect(why.is(new Map(), 'map')).toBe(true));
    it('matches Set collection', () => expect(why.is(new Set(), 'set')).toBe(true));
    it('matches Date object', () => expect(why.is(new Date(), 'date')).toBe(true));
    it('matches RegExp object', () => expect(why.is(/abc/, 'regexp')).toBe(true));
    it('matches Error object', () => expect(why.is(new Error(), 'error')).toBe(true));
    it('matches Buffer', () => expect(why.is(Buffer.from('hi'), 'buffer')).toBe(true));
    it('matches constructor Date', () => expect(why.is(new Date(), Date)).toBe(true));
    it('matches constructor RegExp', () => expect(why.is(/test/, RegExp)).toBe(true));
    it('matches constructor Error', () => expect(why.is(new Error(), Error)).toBe(true));
    it('matches custom class constructor', () => {
      class CustomClass {}
      expect(why.is(new CustomClass(), CustomClass)).toBe(true);
    });
    it('returns false on mismatched type string', () => expect(why.is('hello', 'number')).toBe(false));
    it('returns false on mismatched constructor', () => expect(why.is({}, Date)).toBe(false));
    it('returns false for primitive against object constructor', () => expect(why.is(42, Object)).toBe(false));
  });

  describe('why.same(), why.strictEqual(), why.equal()', () => {
    it('why.same respects Object.is NaN equality', () => expect(why.same(NaN, NaN)).toBe(true));
    it('why.same respects Object.is signed zero distinction', () => expect(why.same(+0, -0)).toBe(false));
    it('why.same checks object identity', () => {
      const obj = { a: 1 };
      expect(why.same(obj, obj)).toBe(true);
      expect(why.same({ a: 1 }, { a: 1 })).toBe(false);
    });

    it('why.strictEqual uses === semantics', () => {
      expect(why.strictEqual(42, 42)).toBe(true);
      expect(why.strictEqual('42', 42)).toBe(false);
      expect(why.strictEqual(NaN, NaN)).toBe(false);
    });

    it('why.equal uses loose == semantics', () => {
      expect(why.equal('42', 42)).toBe(true);
      expect(why.equal(null, undefined)).toBe(true);
      expect(why.equal(0, false)).toBe(true);
      expect(why.equal('', 0)).toBe(true);
      expect(why.equal('hello', 'world')).toBe(false);
    });
  });

  describe('why.deepEqual()', () => {
    it('compares identical primitives', () => {
      expect(why.deepEqual(10, 10)).toBe(true);
      expect(why.deepEqual('a', 'b')).toBe(false);
      expect(why.deepEqual(true, false)).toBe(false);
    });

    it('compares flat objects', () => {
      expect(why.deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(why.deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(why.deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it('compares nested arrays', () => {
      expect(why.deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
      expect(why.deepEqual([1, [2, 3]], [1, [2, 4]])).toBe(false);
      expect(why.deepEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it('compares Date and RegExp objects', () => {
      expect(why.deepEqual(new Date('2024-01-01'), new Date('2024-01-01'))).toBe(true);
      expect(why.deepEqual(new Date('2024-01-01'), new Date('2025-01-01'))).toBe(false);
      expect(why.deepEqual(/abc/i, /abc/i)).toBe(true);
      expect(why.deepEqual(/abc/i, /abc/g)).toBe(false);
    });

    it('compares Maps and Sets', () => {
      expect(why.deepEqual(new Map([['a', 1]]), new Map([['a', 1]]))).toBe(true);
      expect(why.deepEqual(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false);
      expect(why.deepEqual(new Set([1, 2]), new Set([1, 2]))).toBe(true);
      expect(why.deepEqual(new Set([1, 2]), new Set([1, 3]))).toBe(false);
    });

    it('is safe against circular graphs', () => {
      const circA: Record<string, unknown> = { x: 1 };
      circA['self'] = circA;
      const circB: Record<string, unknown> = { x: 1 };
      circB['self'] = circB;

      expect(() => why.deepEqual(circA, circB)).not.toThrow();
      expect(why.deepEqual(circA, circB)).toBe(true);
    });

    it('never executes getter properties during deep equal check', () => {
      let executed = false;
      const objA = {
        get secret() {
          executed = true;
          return 'leak';
        },
      };
      const objB = {
        get secret() {
          executed = true;
          return 'leak';
        },
      };

      why.deepEqual(objA, objB);
      expect(executed).toBe(false);
    });
  });

  describe('why.assert() & why.expect()', () => {
    it('why.assert passes on truthy conditions', () => {
      expect(() => why.assert(true)).not.toThrow();
      expect(() => why.assert(1 < 2, 'custom')).not.toThrow();
    });

    it('why.assert throws WhyAssertionError on falsy conditions', () => {
      expect(() => why.assert(false)).toThrow(WhyAssertionError);
      expect(() => why.assert(0, 'custom message')).toThrow('custom message');
    });

    it('why.expect returns structured diagnostic outcome', () => {
      const passRes = why.expect({ a: 1 }, { a: 1 });
      expect(passRes.pass).toBe(true);
      expect(passRes.message).toContain('matches');

      const failRes = why.expect({ a: 1 }, { a: 2 });
      expect(failRes.pass).toBe(false);
      expect(failRes.actual).toEqual({ a: 1 });
      expect(failRes.expected).toEqual({ a: 2 });
    });
  });

  describe('why.valid(), why.invalid(), why.coerce()', () => {
    it('why.valid validates numbers, strings, arrays, objects', () => {
      expect(why.valid(42).valid).toBe(true);
      expect(why.valid('hello').valid).toBe(true);
      expect(why.valid([]).valid).toBe(true);
      expect(why.valid({}).valid).toBe(true);
    });

    it('why.valid flags null, undefined, NaN as invalid', () => {
      expect(why.valid(null).valid).toBe(false);
      expect(why.valid(undefined).valid).toBe(false);
      expect(why.valid(NaN).valid).toBe(false);
      expect(why.valid(null).reason).toContain('null');
    });

    it('why.invalid returns true for invalid values', () => {
      expect(why.invalid(null).valid).toBe(true);
      expect(why.invalid(undefined).valid).toBe(true);
      expect(why.invalid(NaN).valid).toBe(true);
      expect(why.invalid(42).valid).toBe(false);
    });

    it('why.coerce safely converts types', () => {
      expect(why.coerce(123, 'string')).toBe('123');
      expect(why.coerce('456', 'number')).toBe(456);
      expect(why.coerce(1, 'boolean')).toBe(true);
      expect(why.coerce(0, 'boolean')).toBe(false);
    });
  });
});
