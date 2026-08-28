/**
 * Security tests: getter safety.
 *
 * The primary security invariant: inspection never executes getter properties.
 * This is enforced structurally by reading PropertyDescriptors and only
 * accessing the `value` field of data descriptors.
 */

import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';
import { safeReadValue } from '../../src/core/safe-reader.js';
import type { InspectionError } from '../../src/models/inspection-result.js';

describe('Getter safety — inspection never executes getters', () => {
  it('why() does not execute getter on inspected object', () => {
    let called = false;
    const obj = {
      get secret() {
        called = true;
        return 'LEAKED';
      },
    };
    why(obj);
    expect(called).toBe(false);
  });

  it('why.inspect() does not execute getter', () => {
    let called = false;
    const obj = {
      get sensitive() {
        called = true;
        return 42;
      },
    };
    why.inspect(obj);
    expect(called).toBe(false);
  });

  it('why.keys() does not execute getter', () => {
    let called = false;
    const obj = {
      get x() {
        called = true;
        return 1;
      },
    };
    why.keys(obj);
    expect(called).toBe(false);
  });

  it('why.values() does not execute getter', () => {
    let called = false;
    const obj = {
      get data() {
        called = true;
        return 'leak';
      },
    };
    why.values(obj);
    expect(called).toBe(false);
  });

  it('why.entries() does not execute getter', () => {
    let called = false;
    const obj = {
      get val() {
        called = true;
        return 99;
      },
    };
    why.entries(obj);
    expect(called).toBe(false);
  });

  it('throwing getter does not crash inspection', () => {
    const obj = {
      get bomb() {
        throw new Error('BOOM');
      },
    };
    expect(() => why.inspect(obj)).not.toThrow();
    const result = why.inspect(obj);
    // The entry for 'bomb' should be marked as accessor
    const entry = result.entries.find((e) => e.key === 'bomb');
    expect(entry?.value.kind).toBe('accessor');
  });

  it('getter on deeply nested object is not executed', () => {
    let called = false;
    const obj = {
      level1: {
        level2: {
          get dangerous() {
            called = true;
            return 'secret';
          },
        },
      },
    };
    why.inspect(obj);
    expect(called).toBe(false);
  });

  it('safeReadValue returns accessor sentinel without evaluating', () => {
    let called = false;
    const obj = {
      get val() {
        called = true;
        return 42;
      },
    };
    const errors: InspectionError[] = [];
    const result = safeReadValue(obj, 'val', 'root.val', errors);
    expect(result.kind).toBe('accessor');
    expect(called).toBe(false);
  });

  it('inspection of object with only getters completes successfully', () => {
    const obj = Object.create(null) as Record<string, unknown>;
    Object.defineProperties(obj, {
      a: {
        get() {
          return 1;
        },
        enumerable: true,
      },
      b: {
        get() {
          return 2;
        },
        enumerable: true,
      },
      c: {
        get() {
          return 3;
        },
        enumerable: true,
      },
    });
    expect(() => why.inspect(obj)).not.toThrow();
    const result = why.inspect(obj);
    expect(result.entries.every((e) => e.value.kind === 'accessor')).toBe(true);
  });
});
