/**
 * Property-based fuzz tests using fast-check.
 *
 * Verifies the primary invariant:
 *   inspect(arbitraryValue) must always terminate and must not
 *   unexpectedly throw because of the value being inspected.
 *
 * Focuses on the areas most likely to break:
 *   - Object graphs (circular, shared, deeply nested)
 *   - Symbol properties
 *   - Null prototypes
 *   - Unusual values
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { inspect } from '../../src/core/inspect-engine.js';
import why from '../../src/index.js';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generate any JavaScript primitive */
const primitiveArb = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.boolean(),
  fc.integer(),
  fc.double({ noNaN: true }),
  fc.string(),
  fc.bigInt(),
);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Fuzz: inspection terminates for any value', () => {
  it('terminates for arbitrary primitive values', () => {
    fc.assert(
      fc.property(primitiveArb, (value) => {
        expect(() => inspect(value)).not.toThrow();
        const result = inspect(value);
        expect(result.type).toBeDefined();
        expect(result.rawValue).toBe(value);
      }),
      { numRuns: 200 },
    );
  });

  it('terminates for arbitrary JSON-like objects', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        expect(() => inspect(value)).not.toThrow();
        const result = inspect(value as unknown);
        expect(result.type).toBeDefined();
      }),
      { numRuns: 200 },
    );
  });

  it('all public API methods terminate for arbitrary values', () => {
    fc.assert(
      fc.property(primitiveArb, (value) => {
        expect(() => why.type(value)).not.toThrow();
        expect(() => why.size(value)).not.toThrow();
        expect(() => why.depth(value)).not.toThrow();
        expect(() => why.circular(value)).not.toThrow();
        expect(() => why.references(value)).not.toThrow();
        expect(() => why.keys(value)).not.toThrow();
        expect(() => why.values(value)).not.toThrow();
        expect(() => why.entries(value)).not.toThrow();
        expect(() => why.prototype(value)).not.toThrow();
        expect(() => why.constructor(value)).not.toThrow();
        expect(() => why.describe(value)).not.toThrow();
        expect(() => why.explain(value)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });
});

describe('Fuzz: circular object graphs', () => {
  it('terminates for self-referencing objects with arbitrary extra properties', () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.integer()),
        (props) => {
          const obj = { ...props } as Record<string, unknown>;
          obj['self'] = obj; // Add circular reference
          expect(() => inspect(obj)).not.toThrow();
          const result = inspect(obj);
          expect(result.isCircular).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Fuzz: shared references', () => {
  it('correctly identifies shared vs. unique references', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { minLength: 1, maxLength: 10 }),
        (values) => {
          const shared = { id: values[0] };
          const obj: Record<string, unknown> = {};
          for (let i = 0; i < Math.min(values.length, 5); i++) {
            obj[`key${i}`] = shared; // all point to same shared object
          }
          expect(() => inspect(obj)).not.toThrow();
          const result = inspect(obj);
          // shared should appear as repeated ref
          if (Object.keys(obj).length >= 2) {
            expect(result.repeatedRefs.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Fuzz: deeply nested objects', () => {
  it('terminates for objects up to maxDepth deep', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 15 }), (depth) => {
        // Build a chain of objects depth levels deep
        let current: Record<string, unknown> = { leaf: true };
        for (let i = 0; i < depth; i++) {
          current = { child: current };
        }
        expect(() => inspect(current)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });
});

describe('Fuzz: arrays', () => {
  it('terminates for arrays of various lengths', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.string(), fc.constant(null)), {
          maxLength: 50,
        }),
        (arr) => {
          expect(() => inspect(arr)).not.toThrow();
          const result = inspect(arr);
          expect(result.type).toBe('array');
          expect(result.size.kind).toBe('array-length');
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Fuzz: Maps and Sets', () => {
  it('terminates for Maps with string keys and integer values', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.string({ maxLength: 10 }), fc.integer()), {
          maxLength: 20,
        }),
        (entries) => {
          const map = new Map(entries);
          expect(() => inspect(map)).not.toThrow();
          const result = inspect(map);
          expect(result.type).toBe('map');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('terminates for Sets with mixed values', () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(fc.integer(), fc.string()), { maxLength: 20 }),
        (values) => {
          const set = new Set(values);
          expect(() => inspect(set)).not.toThrow();
          const result = inspect(set);
          expect(result.type).toBe('set');
        },
      ),
      { numRuns: 100 },
    );
  });
});
