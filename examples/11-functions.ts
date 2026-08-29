/**
 * @fileoverview Example 11: Function Inspection & Wrapping
 *
 * Covers: why.function() · why.fn() · why.wrap() · why.unwrap() · why.callCount()
 *
 * Inspect functions as data: name, arity, kind. Wrap for call tracking
 * without altering any observable behavior (return value, 'this', side effects).
 */

import why from '../src/index.js';

// ─── Section 1: why.function() — Inspect Named Function ──────────────────────

console.log('─── 1. why.function() — Named Function Metadata ───');

function processPayment(
  amount: number,
  currency: string,
  retries = 3,
): boolean {
  // ... payment logic
  return amount > 0;
}

const fnInfo = why.function(processPayment);
console.log('name:', fnInfo.name); // → 'processPayment'
console.log('length:', fnInfo.length); // → 2  (only non-default params counted)
console.log('isAsync:', fnInfo.isAsync); // → false
console.log('isGenerator:', fnInfo.isGenerator); // → false
console.log('isArrow:', fnInfo.isArrow); // → false
console.log('success:', fnInfo.success); // → true

// why.fn() is an alias
const same = why.fn(processPayment);
console.log('function === fn result:', fnInfo.name === same.name); // → true

// ─── Section 2: why.function() — Arrow Function ───────────────────────────────

console.log('\n─── 2. Arrow Function Inspection ───');

const formatCurrency = (amount: number, symbol = '€') =>
  `${symbol}${amount.toFixed(2)}`;

const arrowInfo = why.function(formatCurrency);
console.log('name:', arrowInfo.name); // → 'formatCurrency'
console.log('isArrow:', arrowInfo.isArrow); // → true
console.log('length:', arrowInfo.length); // → 1  (symbol has default, not counted)

// ─── Section 3: why.function() — Async & Generator Functions ─────────────────

console.log('\n─── 3. Async & Generator Function Inspection ───');

async function fetchUserProfile(userId: string): Promise<{ id: string }> {
  return { id: userId };
}

function* idGenerator(start: number) {
  while (true) yield start++;
}

async function* asyncStream(items: number[]) {
  for (const item of items) yield item;
}

const asyncInfo = why.function(fetchUserProfile);
console.log('async function — isAsync:', asyncInfo.isAsync); // → true
console.log('async function — isGenerator:', asyncInfo.isGenerator); // → false

const genInfo = why.function(idGenerator);
console.log('generator — isAsync:', genInfo.isAsync); // → false
console.log('generator — isGenerator:', genInfo.isGenerator); // → true

const asyncGenInfo = why.function(asyncStream);
console.log('async generator — isAsync:', asyncGenInfo.isAsync); // → true
console.log('async generator — isGenerator:', asyncGenInfo.isGenerator); // → true

// ─── Section 4: why.function() — Non-Function Inputs ─────────────────────────

console.log('\n─── 4. Non-Function Input Handling ───');

const notAFn = why.function(42 as unknown as () => void);
console.log('non-function success:', notAFn.success); // → false
console.log('non-function name:', notAFn.name); // → '(not a function)'

// ─── Section 5: why.wrap() — Call Count Tracking Wrapper ─────────────────────

console.log('\n─── 5. why.wrap() — Call Count Tracking ───');

// Wrap an event handler to track how many times it fires
function onUserLogin(userId: string): string {
  return `Session started for ${userId}`;
}

const tracked = why.wrap(onUserLogin);

// Fully transparent — return values preserved, no side effects
console.log(tracked('user-001')); // → 'Session started for user-001'
console.log(tracked('user-002')); // → 'Session started for user-002'
console.log(tracked('user-003')); // → 'Session started for user-003'

console.log('call count:', why.callCount(tracked)); // → 3

// Wrapped async function — preserves async behavior
async function sendEmail(to: string): Promise<boolean> {
  await Promise.resolve(); // simulate async
  return true;
}

const trackedEmail = why.wrap(sendEmail);
await trackedEmail('a@example.com');
await trackedEmail('b@example.com');

console.log('async call count:', why.callCount(trackedEmail)); // → 2

// ─── Section 6: why.unwrap() — Recover Original Function ─────────────────────

console.log('\n─── 6. why.unwrap() — Recover Original Function ───');

function computeHash(input: string): string {
  return Buffer.from(input).toString('base64');
}

const wrappedHash = why.wrap(computeHash);
wrappedHash('test-1');
wrappedHash('test-2');

console.log('call count before unwrap:', why.callCount(wrappedHash)); // → 2

const original = why.unwrap(wrappedHash);

// Original reference — no tracking overhead
console.log('unwrapped === original:', original === computeHash); // → true

// Original has no call count tracking
console.log('original callCount:', why.callCount(original)); // → 0

// ─── Section 7: this-Binding Preservation ────────────────────────────────────

console.log('\n─── 7. this-Binding Preserved Through Wrap ───');

class Counter {
  private count = 0;

  increment() {
    this.count++;
    return this.count;
  }
}

const counter = new Counter();
const trackedIncrement = why.wrap(counter.increment.bind(counter));

console.log(trackedIncrement()); // → 1
console.log(trackedIncrement()); // → 2
console.log(trackedIncrement()); // → 3
console.log('call count:', why.callCount(trackedIncrement)); // → 3
