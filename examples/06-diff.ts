/**
 * @fileoverview Example 06: Diff, Comparison & Snapshots
 *
 * Covers: why.diff() · why.added() · why.removed() · why.modified() ·
 *         why.changed() · why.unchanged() · why.compare() ·
 *         why.reference() · why.snapshot() · why.restore()
 *
 * The diff APIs answer: "What changed between these two states?"
 * Essential for audit logging, undo history, form change tracking, and API response diffing.
 */

import why from '../src/index.js';

// ─── Section 1: why.diff() — Full Object Diff ─────────────────────────────────

console.log('─── 1. why.diff() — Full Object Comparison ───');

// Simulate an API response before and after a user profile update
const before = {
  id: 'usr-001',
  name: 'Alice',
  email: 'alice@example.com',
  theme: 'light',
  lastSeen: '2024-01-10',
};

const after = {
  id: 'usr-001', // unchanged
  name: 'Alice', // unchanged
  email: 'alice@new.com', // modified
  theme: 'dark', // modified
  plan: 'premium', // added
  // lastSeen: removed
};

const result = why.diff(before, after);
console.log('isIdentical:', result.isIdentical); // → false
console.log('unchangedCount:', result.unchangedCount); // → 2 (id, name)
console.log(
  'added:',
  result.added.map((e) => String(e.key)),
); // → ['plan']
console.log(
  'removed:',
  result.removed.map((e) => String(e.key)),
); // → ['lastSeen']
console.log(
  'modified:',
  result.modified.map(
    (e) =>
      `${String(e.key)}: ${e.oldValue.kind === 'primitive' ? JSON.stringify(e.oldValue.value) : ''} → ${e.newValue.kind === 'primitive' ? JSON.stringify(e.newValue.value) : ''}`,
  ),
);
// → ['email: "alice@example.com" → "alice@new.com"', 'theme: "light" → "dark"']

// ─── Section 2: why.added() / why.removed() / why.modified() ─────────────────

console.log('\n─── 2. why.added() · why.removed() · why.modified() ───');

const settings1 = { debug: false, maxConnections: 10, timeout: 3000 };
const settings2 = { debug: true, maxConnections: 10, logLevel: 'info' };
// debug: modified, timeout: removed, logLevel: added

const addedKeys = why.added(settings1, settings2).map((e) => String(e.key));
console.log('added keys:', addedKeys); // → ['logLevel']

const removedKeys = why.removed(settings1, settings2).map((e) => String(e.key));
console.log('removed keys:', removedKeys); // → ['timeout']

const modifiedKeys = why
  .modified(settings1, settings2)
  .map((e) => String(e.key));
console.log('modified keys:', modifiedKeys); // → ['debug']

// ─── Section 3: why.changed() / why.unchanged() ──────────────────────────────

console.log(
  '\n─── 3. why.changed() · why.unchanged() — Boolean Predicates ───',
);

const v1 = { score: 100, level: 3 };
const v2 = { score: 100, level: 3 }; // identical copy
const v3 = { score: 99, level: 3 }; // score changed

console.log('v1 → v2 changed:', why.changed(v1, v2)); // → false (same values)
console.log('v1 → v3 changed:', why.changed(v1, v3)); // → true
console.log('v1 → v2 unchanged:', why.unchanged(v1, v2)); // → true
console.log('v1 → v3 unchanged:', why.unchanged(v1, v3)); // → false

// ─── Section 4: why.compare() — Alias of diff() ──────────────────────────────

console.log('\n─── 4. why.compare() — Alias of diff() ───');

const obj1 = { x: 1, y: 2 };
const obj2 = { x: 1, y: 9 };
const compared = why.compare(obj1, obj2);
console.log('compare modified count:', compared.modified.length); // → 1 (y changed)

// ─── Section 5: why.reference() — Object Identity ────────────────────────────

console.log('\n─── 5. why.reference() — Reference Relationship ───');

const shared = { type: 'global-config' };
const a = shared; // same reference
const b = { type: 'global-config' }; // different object, same content

console.log(why.reference(a, shared).relationship); // → 'same-reference'
console.log(why.reference(a, b).relationship); // → 'different-reference'

// ─── Section 6: why.snapshot() + why.restore() — State Capture ───────────────

console.log('\n─── 6. why.snapshot() + why.restore() — State Capture ───');

// Capture state before a potentially destructive operation
const appState = {
  user: { name: 'Bob', permissions: ['read', 'write'] },
  session: { token: 'session-abc', expiresAt: 9999999999 },
};

const snap = why.snapshot(appState);

// Mutate original state
appState.user.name = 'MUTATED';
appState.user.permissions.push('admin');

// Original was mutated
console.log('After mutation — original:', appState.user.name); // → 'MUTATED'

// Snapshot preserved pre-mutation state
const restored = why.restore(snap) as typeof appState;
console.log('Snapshot preserved:', (restored as typeof appState).user.name); // → 'Bob'
console.log(
  'Snapshot permissions:',
  (restored as typeof appState).user.permissions,
); // → ['read', 'write']

// Primitives are returned as-is by snapshot
console.log('primitive snapshot:', why.snapshot(42)); // → 42
