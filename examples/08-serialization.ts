/**
 * @fileoverview Example 08: Serialization & JSON Safety
 *
 * Covers: why.json() · why.parse() · why.stringify() · why.serialize() ·
 *         why.serializable() · why.circularJSON() · why.clone()
 *
 * Standard JSON.stringify silently drops functions, throws on BigInt,
 * and crashes on circular references. These APIs handle all of that safely.
 */

import why from '../src/index.js';

// ─── Section 1: why.serializable() — Pre-flight Safety Check ─────────────────

console.log('─── 1. why.serializable() — Check Before Stringify ───');

// Plain object — fully serializable
console.log(why.serializable({ id: 1, name: 'Alice' })); // → true

// String, number, boolean, null, arrays
console.log(why.serializable('hello')); // → true
console.log(why.serializable(42)); // → true
console.log(why.serializable(null)); // → true
console.log(why.serializable([1, 2, 3])); // → true

// BigInt — NOT JSON serializable
console.log(why.serializable(100n)); // → false

// Symbol — NOT JSON serializable
console.log(why.serializable(Symbol('x'))); // → false

// Function — NOT JSON serializable
console.log(why.serializable(() => {})); // → false

// Map/Set — NOT natively serializable
console.log(why.serializable(new Map())); // → false
console.log(why.serializable(new Set())); // → false

// Circular reference — NOT JSON serializable
const circ: Record<string, unknown> = { id: 1 };
circ['self'] = circ;
console.log(why.serializable(circ)); // → false

// ─── Section 2: why.json() — Circular-Safe Serialization ─────────────────────

console.log('\n─── 2. why.json() — Circular-Safe JSON ───');

// Circular — JSON.stringify would throw, why.json() handles it
const node: Record<string, unknown> = { id: 'node-a', label: 'Root' };
node['parent'] = node; // circular!

const jsonStr = why.json(node);
console.log('circular JSON:');
console.log(jsonStr);
// → { "id": "node-a", "label": "Root", "parent": "[Circular]" }

// Map → serialized as { __type: 'Map', entries: [...] }
const withMap = {
  name: 'cache',
  data: new Map([
    ['key1', 100],
    ['key2', 200],
  ]),
};
console.log('\nMap JSON:');
console.log(why.json(withMap));

// BigInt → serialized as string with 'n' suffix
const withBigInt = { balance: 99999999999999999n };
console.log('\nBigInt JSON:');
console.log(why.json(withBigInt)); // → "balance": "99999999999999999n"

// Symbol → serialized as [Symbol: description]
const withSymbol = { tag: Symbol('version') };
console.log('\nSymbol JSON:');
console.log(why.json(withSymbol)); // → "tag": "[Symbol: version]"

// Function → serialized as [Function: name]
const withFn = { handler: function onRequest() {} };
console.log('\nFunction JSON:');
console.log(why.json(withFn)); // → "handler": "[Function: onRequest]"

// Set → serialized as { __type: 'Set', values: [...] }
const withSet = { roles: new Set(['admin', 'editor']) };
console.log('\nSet JSON:');
console.log(why.json(withSet));

// ─── Section 3: why.stringify() / why.serialize() / why.circularJSON() ────────

console.log('\n─── 3. Aliases: stringify / serialize / circularJSON ───');

const data = { value: 42, meta: new Map([['env', 'prod']]) };

// All four are aliases for the same function
const r1 = why.json(data);
const r2 = why.stringify(data);
const r3 = why.serialize(data);
const r4 = why.circularJSON(data);

console.log('json === stringify:', r1 === r2); // → true
console.log('json === serialize:', r1 === r3); // → true
console.log('json === circularJSON:', r1 === r4); // → true

// ─── Section 4: why.parse() — Safe JSON Parse ────────────────────────────────

console.log('\n─── 4. why.parse() — Safe JSON Parse ───');

// Valid JSON — parses correctly
const valid = why.parse<{ name: string }>('{"name":"Alice","age":30}');
console.log('parsed name:', valid?.name); // → 'Alice'

// Invalid JSON — returns null instead of throwing
const invalid = why.parse('{ this is: not valid json }');
console.log('invalid parse:', invalid); // → null  (no throw!)

// Truncated JSON
const truncated = why.parse('{"key": "val');
console.log('truncated parse:', truncated); // → null

// ─── Section 5: why.clone() — Deep Structural Clone ──────────────────────────

console.log('\n─── 5. why.clone() — Deep Clone ───');

const original = {
  user: {
    name: 'Bob',
    tags: ['dev', 'admin'],
    config: { theme: 'dark', notifications: true },
  },
};

const cloned = why.clone(original);

// Verify structural equality
console.log(
  'values equal:',
  JSON.stringify(cloned) === JSON.stringify(original),
); // → true

// Verify distinct reference — mutations do NOT propagate
cloned.user.name = 'Mutated';
cloned.user.tags.push('hacker');

console.log('original name:', original.user.name); // → 'Bob'  (unchanged)
console.log('original tags:', original.user.tags); // → ['dev', 'admin']  (unchanged)
console.log('cloned name:', cloned.user.name); // → 'Mutated'
