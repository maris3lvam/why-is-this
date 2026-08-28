import { describe, it, expect } from 'vitest';
import why, { why as namedWhy } from '../../src/index.js';

describe('why — default and named exports', () => {
  it('default export is callable', () => {
    expect(typeof why).toBe('function');
    const result = why(42);
    expect(result.type).toBe('number');
  });

  it('named export is callable and identical to default', () => {
    expect(typeof namedWhy).toBe('function');
    expect(namedWhy).toBe(why);
  });

  it('returns InspectionResult (no console output)', () => {
    const result = why({ a: 1 });
    expect(result).toBeDefined();
    expect(result.type).toBe('object');
    expect(result.rawValue).toEqual({ a: 1 });
  });
});

describe('why — all methods exist', () => {
  it('has why.inspect', () => expect(typeof why.inspect).toBe('function'));
  it('has why.explain', () => expect(typeof why.explain).toBe('function'));
  it('has why.describe', () => expect(typeof why.describe).toBe('function'));
  it('has why.type', () => expect(typeof why.type).toBe('function'));
  it('has why.value', () => expect(typeof why.value).toBe('function'));
  it('has why.keys', () => expect(typeof why.keys).toBe('function'));
  it('has why.values', () => expect(typeof why.values).toBe('function'));
  it('has why.entries', () => expect(typeof why.entries).toBe('function'));
  it('has why.size', () => expect(typeof why.size).toBe('function'));
  it('has why.depth', () => expect(typeof why.depth).toBe('function'));
  it('has why.prototype', () => expect(typeof why.prototype).toBe('function'));
  it('has why.constructor', () =>
    expect(typeof why.constructor).toBe('function'));
  it('has why.references', () =>
    expect(typeof why.references).toBe('function'));
  it('has why.circular', () => expect(typeof why.circular).toBe('function'));
});

describe('why — callable result matches why.inspect result', () => {
  it('why(value) returns same result as why.inspect(value)', () => {
    const value = { x: 1, y: 2 };
    const direct = why(value);
    const via = why.inspect(value);
    // Same structure (though different frozen objects)
    expect(direct.type).toBe(via.type);
    expect(direct.depth).toBe(via.depth);
    expect(direct.isCircular).toBe(via.isCircular);
  });
});
