import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Property Engine — Comprehensive Domain Tests', () => {
  describe('why.undefined() & why.null()', () => {
    it('why.undefined tests for undefined strictly', () => {
      expect(why.undefined(undefined)).toBe(true);
      expect(why.undefined(null)).toBe(false);
      expect(why.undefined(0)).toBe(false);
      expect(why.undefined('')).toBe(false);
      expect(why.undefined(false)).toBe(false);
    });

    it('why.null tests for null strictly', () => {
      expect(why.null(null)).toBe(true);
      expect(why.null(undefined)).toBe(false);
      expect(why.null(0)).toBe(false);
      expect(why.null('')).toBe(false);
    });
  });

  describe('why.has() & why.get()', () => {
    it('why.has distinguishes { x: undefined } from {}', () => {
      expect(why.has({ x: undefined }, 'x')).toBe(true);
      expect(why.has({}, 'x')).toBe(false);
    });

    it('why.has detects symbol properties', () => {
      const sym = Symbol('key');
      expect(why.has({ [sym]: 42 }, sym)).toBe(true);
    });

    it('why.get reads property value without executing getters', () => {
      let executed = false;
      const obj = {
        name: 'Alice',
        get secret() {
          executed = true;
          return 'hidden';
        },
      };

      const nameVal = why.get(obj, 'name');
      expect(nameVal).toEqual({ kind: 'primitive', value: 'Alice' });

      const secretVal = why.get(obj, 'secret');
      expect(secretVal.kind).toBe('accessor');
      expect(executed).toBe(false);
    });

    it('why.get handles non-object target safely', () => {
      const res = why.get(42, 'x');
      expect(res.kind).toBe('unreadable');
    });
  });

  describe('why.path() & why.resolve()', () => {
    it('resolves valid nested path successfully', () => {
      const user = { profile: { address: { city: 'New York' } } };
      const res = why.path(user, 'profile.address.city');
      expect(res.exists).toBe(true);
      expect(res.value).toEqual({ kind: 'primitive', value: 'New York' });
    });

    it('handles missing intermediate property gracefully', () => {
      const user = { profile: null };
      const res = why.path(user, 'profile.address.city');
      expect(res.exists).toBe(false);
      expect(res.failureReason).toContain(
        'intermediate value is not an object',
      );
    });

    it('handles nonexistent key at leaf', () => {
      const user = { profile: { name: 'Alice' } };
      const res = why.path(user, 'profile.age');
      expect(res.exists).toBe(false);
      expect(res.failureReason).toContain('does not exist');
    });

    it('handles invalid path string input', () => {
      const res = why.path({ a: 1 }, '');
      expect(res.exists).toBe(false);
      expect(res.failureReason).toContain('non-empty string');
    });

    it('why.resolve is alias of why.path', () => {
      const user = { a: { b: 42 } };
      expect(why.resolve(user, 'a.b')).toEqual(why.path(user, 'a.b'));
    });
  });

  describe('why.exists() & why.missing() & why.optional()', () => {
    it('why.exists returns boolean path existence', () => {
      const data = { a: { b: 1 } };
      expect(why.exists(data, 'a.b')).toBe(true);
      expect(why.exists(data, 'a.c')).toBe(false);
    });

    it('why.missing returns diagnostic failure message for missing path', () => {
      const data = { a: { b: 1 } };
      expect(why.missing(data, 'a.b')).toBeUndefined();
      expect(why.missing(data, 'a.c')).toContain('does not exist');
    });

    it('why.optional returns resolved value or default fallback', () => {
      const data = { a: { b: 'hello' } };
      expect(why.optional(data, 'a.b', 'default')).toEqual({
        value: 'hello',
        exists: true,
      });
      expect(why.optional(data, 'a.c', 'default')).toEqual({
        value: 'default',
        exists: false,
      });
    });
  });
});
