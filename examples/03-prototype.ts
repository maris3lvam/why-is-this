/**
 * @fileoverview Example 03: Prototype Chain, Constructor, References & Circularity
 *
 * Covers: why.prototype() · why.constructor() · why.references() · why.circular()
 *
 * These APIs reveal the runtime object graph:
 * - Who's the ancestor? (prototype chain)
 * - Who built this? (constructor metadata)
 * - Are two nodes the same object? (shared reference)
 * - Does this graph loop back on itself? (circular refs)
 */

import why from '../src/index.js';

// ─── Section 1: why.prototype() — Prototype Chain ────────────────────────────

console.log('─── 1. why.prototype() — Prototype Chain ───');

class Animal {
  speak() {
    return 'generic sound';
  }
}

class Dog extends Animal {
  name: string;
  constructor(name: string) {
    super();
    this.name = name;
  }
  override speak() {
    return 'woof';
  }
}

const rex = new Dog('Rex');
const proto = why.prototype(rex);

// chain: string[] from nearest to farthest ancestor
console.log('chain:', proto.chain.join(' → ')); // → 'Dog → Animal → Object'
console.log('chain length:', proto.chain.length); // → 3
console.log('isNullPrototype:', proto.isNullPrototype); // → false
console.log('immediate proto name:', proto.name); // → 'Dog'

// Null-prototype object — no prototype at all
const bare = Object.create(null);
const bareProto = why.prototype(bare);
console.log('null-proto chain:', bareProto.chain); // → []
console.log('null-proto isNullPrototype:', bareProto.isNullPrototype); // → true
console.log('null-proto name:', bareProto.name); // → null

// ─── Section 2: why.constructor() — Constructor Metadata ─────────────────────

console.log('\n─── 2. why.constructor() — Constructor Information ───');

const dog = new Dog('Buddy');
const ctorInfo = why.constructor(dog);
console.log('constructor name:', ctorInfo.name); // → 'Dog'

// Null-prototype object — no constructor property
const noCtorObj = Object.create(null);
const noCtor = why.constructor(noCtorObj);
console.log('null-proto constructor name:', noCtor.name); // → null or 'None'

// Overridden constructor trap: .constructor is a string — not a real constructor
const trap: Record<string, unknown> = { constructor: 'I am not a function' };
const trapCtor = why.constructor(trap);
console.log('trap constructor name:', trapCtor.name); // → 'Object' (falls back to prototype)

// ─── Section 3: why.references() — Shared Reference Detection ────────────────

console.log('\n─── 3. why.references() — Shared Object References ───');

// Single canonical config object referenced in two places.
// Bug: mutations to `sharedConfig` affect ALL consumers silently.
const sharedConfig = { maxRetries: 3, timeout: 5000 };

const serviceA = { name: 'ServiceA', config: sharedConfig };
const serviceB = { name: 'ServiceB', config: sharedConfig }; // same ref!
const system = { serviceA, serviceB };

// Returns RepeatedRefInfo[] — array of objects with { paths: string[] }
const refs = why.references(system);
console.log('repeated reference groups:', refs.length); // → 1 (sharedConfig found at 2 paths)
refs.forEach((ref) => {
  console.log('paths sharing same ref:', ref.paths.join(' === '));
  // → 'root.serviceA.config === root.serviceB.config'
});

// No shared references — clean object tree
const unsharedA = { x: 1 };
const unsharedB = { y: 2 };
const clean = { a: unsharedA, b: unsharedB };
console.log('clean tree refs:', why.references(clean).length); // → 0

// ─── Section 4: why.circular() — Circular Reference Detection ────────────────

console.log('\n─── 4. why.circular() — Circular Reference Detection ───');

// Case 1: Direct self-reference
const selfRef: Record<string, unknown> = { id: 'node-1', label: 'Root' };
selfRef['self'] = selfRef; // obj.self → obj

const circ1 = why.circular(selfRef);
console.log('is circular (self-ref):', circ1.isCircular); // → true

// Case 2: Mutual circular references
const a: Record<string, unknown> = { name: 'A' };
const b: Record<string, unknown> = { name: 'B' };
a['peer'] = b;
b['peer'] = a; // a → b → a (cycle length 2)

const circ2 = why.circular(a);
console.log('is circular (mutual):', circ2.isCircular); // → true

// Case 3: Deeply nested — non-circular for comparison
const cleanObj = {
  user: { profile: { avatar: { url: 'https://example.com/img.png' } } },
};
const circ3 = why.circular(cleanObj);
console.log('is circular (clean):', circ3.isCircular); // → false

// Case 4: Array circular reference
const arr: unknown[] = [1, 2, 3];
(arr as unknown[])[3] = arr; // arr[3] → arr itself

const circ4 = why.circular(arr);
console.log('is circular (array):', circ4.isCircular); // → true
