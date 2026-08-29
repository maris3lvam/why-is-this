/**
 * @fileoverview Example 04: Type Checking & Equality
 *
 * Covers: why.is() · why.same() · why.strictEqual() · why.equal() · why.deepEqual()
 *
 * JavaScript equality is full of traps.
 * These APIs replace `===`, `==`, `typeof`, and `instanceof` with
 * explicit, well-typed, debuggable alternatives.
 */

import why from '../src/index.js';

// ─── Section 1: why.is() — Precise Type & Constructor Check ──────────────────

console.log('─── 1. why.is() — Type String Check ───');

// Primitive type strings
console.log(why.is(42, 'number')); // → true
console.log(why.is('hello', 'string')); // → true
console.log(why.is(null, 'null')); // → true   (typeof null === 'object' — trap!)
console.log(why.is(undefined, 'undefined')); // → true
console.log(why.is([], 'array')); // → true   (typeof [] === 'object' — trap!)
console.log(why.is(new Map(), 'map')); // → true
console.log(why.is(async () => {}, 'async-function')); // → true
console.log(why.is(function* gen() {}, 'generator-function')); // → true
console.log(why.is(Buffer.from('x'), 'buffer')); // → true

// Constructor check (instanceof semantics)
class Vehicle {}
class Car extends Vehicle {}
const car = new Car();

console.log('\n─── 1b. why.is() — Constructor Check ───');
console.log(why.is(car, Car)); // → true
console.log(why.is(car, Vehicle)); // → true  (inheritance)
console.log(why.is(new Date(), Date)); // → true
console.log(why.is(new Error(), Error)); // → true
console.log(why.is(/abc/, RegExp)); // → true

// ─── Section 2: why.same() — Object.is() Identity ────────────────────────────

console.log('\n─── 2. why.same() — Object.is() Strict Identity ───');

// NaN trap: NaN !== NaN in standard JS
console.log(why.same(NaN, NaN)); // → true   (Object.is handles this correctly)
console.log((NaN as number) === (NaN as number)); // → false  (standard === is broken for NaN)

// Signed zero trap: -0 and +0 are === but not same
console.log(why.same(0, -0)); // → false  (Object.is distinguishes them)
console.log(0 === -0); // → true   (standard === misses this)

// Reference identity
const obj = { a: 1 };
console.log(why.same(obj, obj)); // → true   (same reference)
console.log(why.same(obj, { a: 1 })); // → false (different objects)

// ─── Section 3: why.strictEqual() — Strict === Equality ──────────────────────

console.log('\n─── 3. why.strictEqual() — Strict Type + Value Check ───');

console.log(why.strictEqual(1, 1)); // → true
console.log(why.strictEqual(1, '1')); // → false  (type mismatch)
console.log(why.strictEqual(null, undefined)); // → false  (different types)
console.log(why.strictEqual(null, null)); // → true

// ─── Section 4: why.equal() — Loose Equality ─────────────────────────────────

console.log('\n─── 4. why.equal() — Loose Abstract Equality (==) ───');

// These are equal under == but NOT ===
console.log(why.equal(1, '1')); // → true   (type coercion)
console.log(why.equal(null, undefined)); // → true   (null == undefined)
console.log(why.equal(0, false)); // → true   (0 == false)
console.log(why.equal(0, null)); // → false  (0 != null in ==)

// ─── Section 5: why.deepEqual() — Structural Deep Equality ───────────────────

console.log('\n─── 5. why.deepEqual() — Deep Structural Equality ───');

// Nested objects
const config1 = { db: { host: 'localhost', port: 5432 }, timeout: 3000 };
const config2 = { db: { host: 'localhost', port: 5432 }, timeout: 3000 };
console.log('deep equal objects:', why.deepEqual(config1, config2)); // → true

// Arrays
console.log('deep equal arrays:', why.deepEqual([1, [2, 3]], [1, [2, 3]])); // → true
console.log('different arrays:', why.deepEqual([1, 2], [1, 3])); // → false

// Maps and Sets
const m1 = new Map([['key', 'val']]);
const m2 = new Map([['key', 'val']]);
console.log('deep equal maps:', why.deepEqual(m1, m2)); // → true

const s1 = new Set([1, 2, 3]);
const s2 = new Set([1, 2, 3]);
console.log('deep equal sets:', why.deepEqual(s1, s2)); // → true

// Dates
console.log(
  'deep equal dates:',
  why.deepEqual(new Date('2024-01-01'), new Date('2024-01-01')),
); // → true
console.log(
  'different dates:',
  why.deepEqual(new Date('2024-01-01'), new Date('2025-01-01')),
); // → false

// Circular references — must not hang indefinitely
const ca: Record<string, unknown> = { id: 1 };
const cb: Record<string, unknown> = { id: 1 };
ca['self'] = ca;
cb['self'] = cb;
console.log('circular deep equal:', why.deepEqual(ca, cb)); // → true (structurally equal loops)

// Getters must NOT be executed during deep equality comparison
const withGetter = {
  safe: 42,
  get dangerous() {
    throw new Error('Should NOT be called during deepEqual!');
  },
};
const withGetter2 = {
  safe: 42,
  get dangerous() {
    throw new Error('Should NOT be called during deepEqual!');
  },
};
// If getters were called, this would throw. It should be handled gracefully.
try {
  const r = why.deepEqual(withGetter, withGetter2);
  console.log('getter-safe deepEqual result:', r); // → true or false, but no throw
} catch (e) {
  console.log('BUG: getter was called!', e);
}
