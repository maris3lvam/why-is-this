/**
 * @fileoverview Example 01: Core Inspection APIs
 *
 * Covers: why() · why.inspect() · why.explain() · why.describe() · why.type()
 *
 * The five foundational APIs that answer:
 * "What exactly IS this value at runtime?"
 */

import why from '../src/index.js';

// ─── Section 1: why() — Callable Inspection ──────────────────────────────────

console.log('─── 1. why(value) — Basic Inspection ───');

const result1 = why(42);
console.log('type:', result1.type); // → 'number'
console.log('isCircular:', result1.isCircular); // → false

const result2 = why(null);
console.log('null type:', result2.type); // → 'null'

// ─── Section 2: why.inspect() — Same as why() with alias ─────────────────────

console.log('\n─── 2. why.inspect() — Alias of why() ───');

const obj = { name: 'Alice', age: 30, role: 'admin' };
const inspected = why.inspect(obj);

console.log('type:', inspected.type); // → 'object'
console.log('propertyCount:', inspected.keys.length); // → 3
console.log('depth:', inspected.depth); // → 1

// ─── Section 3: why.explain() — Structural Findings ─────────────────────────

console.log('\n─── 3. why.explain() — Diagnostic Explanation ───');

// Boxed Boolean — classic JavaScript trap.
// `new Boolean(false)` is truthy because it is an object.
const boxed = new Boolean(false);
const exp = why.explain(boxed);
console.log(exp.toString());
// → "[boxed-boolean]: boxed-boolean ..."

// Null-prototype object — missing .toString(), .hasOwnProperty() etc.
const nullProto = Object.create(null) as Record<string, unknown>;
nullProto['id'] = 1;
const exp2 = why.explain(nullProto);
console.log(exp2.toString());

// ─── Section 4: why.describe() — Single-Line Summary ─────────────────────────

console.log('\n─── 4. why.describe() — One-Line Summary ───');

// Ideal for quick inline debug log messages.
console.log(why.describe(42)); // → 'number: 42'
console.log(why.describe('hello')); // → 'string: "hello"'
console.log(why.describe([1, 2, 3])); // → 'Array with 3 items — Depth: 1'
console.log(why.describe(new Map([['a', 1]]))); // → 'Map with 1 entry'

// Describe a circular object — the ⚠ warning is appended automatically.
const circ: Record<string, unknown> = { x: 1 };
circ['self'] = circ;
console.log(why.describe(circ)); // → 'Object with 2 properties — Depth: 1 — ⚠ Contains circular reference'

// ─── Section 5: why.type() — Precise 28-Type Runtime Classification ───────────

console.log('\n─── 5. why.type() — 28-Type Classifier ───');

// Standard typeof cannot distinguish these:
console.log(why.type(null)); // → 'null'       (typeof gives 'object')
console.log(why.type(undefined)); // → 'undefined'
console.log(why.type(42)); // → 'number'
console.log(why.type('hello')); // → 'string'
console.log(why.type(true)); // → 'boolean'
console.log(why.type(Symbol('x'))); // → 'symbol'
console.log(why.type(100n)); // → 'bigint'
console.log(why.type([])); // → 'array'
console.log(why.type({})); // → 'object'
console.log(why.type(new Map())); // → 'map'
console.log(why.type(new Set())); // → 'set'
console.log(why.type(new Date())); // → 'date'
console.log(why.type(/regex/)); // → 'regexp'
console.log(why.type(new Error())); // → 'error'
console.log(why.type(function named() {})); // → 'function'
console.log(why.type(() => {})); // → 'function'
console.log(why.type(async () => {})); // → 'async-function'
console.log(why.type(function* gen() {})); // → 'generator-function'
console.log(why.type(Buffer.from('hi'))); // → 'buffer'
console.log(why.type(new WeakMap())); // → 'weakmap'
console.log(why.type(new WeakSet())); // → 'weakset'
console.log(why.type(new Uint8Array(4))); // → 'uint8array'
console.log(why.type(Object.create(null))); // → 'object'   (null-prototype)
