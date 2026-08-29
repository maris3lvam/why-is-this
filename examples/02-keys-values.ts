/**
 * @fileoverview Example 02: Keys, Values, Entries, Size & Depth
 *
 * Covers: why.value() · why.keys() · why.values() · why.entries() · why.size() · why.depth()
 *
 * These APIs extract metadata from object properties safely —
 * never executing getters or throwing on hostile inputs.
 */

import why from '../src/index.js';

// ─── Section 1: why.value() — Safe Value Representation ──────────────────────

console.log('─── 1. why.value() — Getter-Safe Value Read ───');

class UserRecord {
  name = 'Alice';
  private _secret = 'db-password-123';

  // This getter throws when called — why.value() must NOT trigger it
  get secret(): string {
    throw new Error('Access denied to secret field!');
  }
}

const record = new UserRecord();

// Safe value for normal data property
const nameVal = why.value(record);
console.log('value kind:', nameVal.kind); // → 'object'

// Safe value for individual getter property via why.get()
const secretVal = why.get(record, 'secret');
console.log('getter kind:', secretVal.kind); // → 'accessor'  (NOT 'primitive')
// The getter was NEVER executed — no exception thrown.

// ─── Section 2: why.keys() — Property Metadata ───────────────────────────────

console.log('\n─── 2. why.keys() — Own Property Key Metadata ───');

const user = Object.create({}) as Record<string | symbol, unknown>;
Object.defineProperty(user, 'id', {
  value: 1,
  enumerable: true,
  writable: false,
  configurable: false,
});
Object.defineProperty(user, '_internal', {
  value: 'sys',
  enumerable: false,
  writable: true,
  configurable: true,
});
const sym = Symbol('tag');
user[sym] = 'tagged';

const keys = why.keys(user);
keys.forEach((k) => {
  console.log(
    String(k.key),
    '→ enumerable:',
    k.enumerable,
    '| writable:',
    k.writable,
    '| kind:',
    k.kind,
  );
});
// id → enumerable: true | writable: false | kind: 'data'
// _internal → enumerable: false | writable: true | kind: 'data'
// Symbol(tag) → enumerable: true | writable: true | kind: 'data'

// ─── Section 3: why.values() — Safe Property Values ─────────────────────────

console.log('\n─── 3. why.values() — Safe Property Values ───');

const config = {
  host: 'localhost',
  port: 5432,
  get password() {
    throw new Error('Cannot read password');
  },
};

const vals = why.values(config);
vals.forEach((v) => console.log('value kind:', v.kind));
// 'primitive', 'primitive', 'accessor'  — getter NEVER fired

// ─── Section 4: why.entries() — Paired Key + Value ───────────────────────────

console.log('\n─── 4. why.entries() — Key Metadata + Safe Value Pairs ───');

const point = { x: 10, y: 20 };
const entries = why.entries(point);
entries.forEach((e) => {
  console.log(`${String(e.keyInfo.key)}: ${JSON.stringify(e.value)}`);
});
// x: {"kind":"primitive","value":10}
// y: {"kind":"primitive","value":20}

// ─── Section 5: why.size() — Semantic Size ───────────────────────────────────

console.log('\n─── 5. why.size() — Semantic Size ───');

// String → character count
const strSize = why.size('hello world');
console.log('string size:', strSize.value, '→ kind:', strSize.kind); // → 11, 'character-count'

// Array → element count
const arrSize = why.size([1, 2, 3, 4, 5]);
console.log('array size:', arrSize.value, '→ kind:', arrSize.kind); // → 5, 'element-count'

// Map → entry count
const mapSize = why.size(
  new Map([
    ['a', 1],
    ['b', 2],
  ]),
);
console.log('map size:', mapSize.value, '→ kind:', mapSize.kind); // → 2, 'collection-size'

// Buffer → byte count
const bufSize = why.size(Buffer.from('hello'));
console.log('buffer size:', bufSize.value, '→ kind:', bufSize.kind); // → 5, 'byte-length'

// Object → property count
const objSize = why.size({ x: 1, y: 2, z: 3 });
console.log('object size:', objSize.value, '→ kind:', objSize.kind); // → 3, 'property-count'

// ─── Section 6: why.depth() — Nesting Depth ──────────────────────────────────

console.log('\n─── 6. why.depth() — Maximum Nesting Depth ───');

console.log('flat object depth:', why.depth({ a: 1, b: 2 })); // → 1

const nested = { a: { b: { c: { d: 'leaf' } } } };
console.log('nested 4 levels deep:', why.depth(nested)); // → 4

// Circular — must not hang
const cyclic: Record<string, unknown> = { level: 1 };
cyclic['self'] = cyclic;
console.log('circular object depth:', why.depth(cyclic)); // → bounded, does not hang
