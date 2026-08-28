import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';
import { WhyAssertionError } from '../../src/domains/equality-engine.js';

describe('Equality Engine', () => {
  it('why.is detects types by string and constructor', () => {
    expect(why.is('hello', 'string')).toBe(true);
    expect(why.is([], 'array')).toBe(true);
    expect(why.is(new Date(), Date)).toBe(true);
  });

  it('why.strictEqual uses Object.is / ===', () => {
    expect(why.strictEqual(42, 42)).toBe(true);
    expect(why.strictEqual(NaN, NaN)).toBe(false);
    expect(why.same(NaN, NaN)).toBe(true);
  });

  it('why.deepEqual handles nested structures and circular refs', () => {
    const a = { x: 1, y: [1, 2] };
    const b = { x: 1, y: [1, 2] };
    expect(why.deepEqual(a, b)).toBe(true);

    const circA: Record<string, unknown> = {};
    circA['self'] = circA;
    const circB: Record<string, unknown> = {};
    circB['self'] = circB;

    expect(() => why.deepEqual(circA, circB)).not.toThrow();
    expect(why.deepEqual(circA, circB)).toBe(true);
  });

  it('why.assert throws WhyAssertionError on false', () => {
    expect(() => why.assert(true)).not.toThrow();
    expect(() => why.assert(false, 'failed')).toThrow(WhyAssertionError);
  });

  it('why.expect returns non-throwing diagnostic', () => {
    const res = why.expect(42, 42);
    expect(res.pass).toBe(true);
    const fail = why.expect(42, 99);
    expect(fail.pass).toBe(false);
  });

  it('why.valid and why.invalid detect invalid values', () => {
    expect(why.valid(42).valid).toBe(true);
    expect(why.valid(null).valid).toBe(false);
    expect(why.valid(undefined).valid).toBe(false);
    expect(why.invalid(NaN).valid).toBe(true);
  });
});
