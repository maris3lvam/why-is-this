/**
 * Security tests: prototype pollution safety.
 *
 * The inspection engine must safely handle objects with keys that could
 * be exploited for prototype pollution: __proto__, constructor, prototype.
 * No prototype mutation must occur.
 */

import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Prototype pollution safety', () => {
  it('handles __proto__ as a data key on null-prototype object', () => {
    const obj = Object.create(null) as Record<string, unknown>;
    obj['__proto__'] = 'malicious';

    // Must not throw, must not mutate Object.prototype
    expect(() => why.inspect(obj)).not.toThrow();

    // Verify Object.prototype was not polluted
    expect(({} as Record<string, unknown>)['__proto__']).not.toBe('malicious');
    expect(Object.prototype.toString).toBeTypeOf('function');
  });

  it('handles constructor key override without affecting real constructors', () => {
    const obj = { constructor: 'I am not a real constructor' };
    expect(() => why.inspect(obj)).not.toThrow();

    const result = why.constructor(obj);
    // Reads constructor from prototype, not from obj.constructor
    expect(result.name).toBe('Object');
    expect(result.isOverridden).toBe(true);

    // Real Object constructor must be intact
    expect({} instanceof Object).toBe(true);
  });

  it('handles prototype key as own property safely', () => {
    const obj: Record<string, unknown> = { prototype: 'fake prototype' };
    expect(() => why.inspect(obj)).not.toThrow();

    // Object.prototype must not be replaced
    expect(Object.prototype.hasOwnProperty).toBeTypeOf('function');
  });

  it('handles __defineGetter__ key safely', () => {
    const obj = Object.create(null) as Record<string, unknown>;
    obj['__defineGetter__'] = () => {};
    expect(() => why.inspect(obj)).not.toThrow();
  });

  it('handles object with all dangerous keys combined', () => {
    const obj = Object.create(null) as Record<string, unknown>;
    obj['__proto__'] = 'evil';
    obj['constructor'] = 'evil';
    obj['prototype'] = 'evil';
    obj['__defineGetter__'] = 'evil';
    obj['__defineSetter__'] = 'evil';

    expect(() => why.inspect(obj)).not.toThrow();

    // Verify no damage to global prototypes
    expect(Object.prototype.toString).toBeTypeOf('function');
    expect(Array.prototype.map).toBeTypeOf('function');
  });

  it('inspection result does not mutate the inspected object', () => {
    const original = { a: 1, b: 2 };
    const originalKeys = Object.keys(original);
    why.inspect(original);
    // Object must be unchanged after inspection
    expect(Object.keys(original)).toEqual(originalKeys);
    expect((original as Record<string, unknown>)['a']).toBe(1);
  });
});
