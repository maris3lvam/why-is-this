/**
 * @fileoverview Example 05: Assertions & Validation
 *
 * Covers: why.assert() · why.expect() · why.valid() · why.invalid() · why.coerce()
 *
 * Structural and assertion APIs that let you describe invariants
 * and validate runtime data coming from APIs, files, or user input.
 */

import why from '../src/index.js';

// ─── Section 1: why.assert() — Hard Assertions ───────────────────────────────

console.log('─── 1. why.assert() — Throws on Failure ───');

// Passing assertion — silent (no output, no throw)
why.assert(true, 'This condition must hold');
why.assert(42 > 0, 'Number must be positive');
why.assert('hello'.length > 0, 'String must be non-empty');
console.log('All passing assertions: OK');

// Failing assertion — throws WhyAssertionError with the message
try {
  const responseCode = 500;
  why.assert(responseCode === 200, `Expected HTTP 200, got ${responseCode}`);
} catch (e) {
  console.log('Caught assertion error:', (e as Error).message);
  // → 'Expected HTTP 200, got 500'
  console.log('Error name:', (e as Error).name);
  // → 'WhyAssertionError'
}

// Assert with complex condition
try {
  const token = ''; // empty token — should never happen
  why.assert(token.length > 0, 'Auth token must not be empty');
} catch (e) {
  console.log('Token assertion failed:', (e as Error).message);
}

// ─── Section 2: why.expect() — Soft Assertions (no throw) ────────────────────

console.log('\n─── 2. why.expect() — Structured Result, No Throw ───');

// Returns { pass, actual, expected } — good for test frameworks & diagnostics
const r1 = why.expect(10 + 5, 15);
console.log('15 === 15:', r1.pass); // → true

const r2 = why.expect('hello', 'world');
console.log('hello === world:', r2.pass); // → false
console.log('actual:', r2.actual); // → 'hello'
console.log('expected:', r2.expected); // → 'world'

// Use expect() to collect all failures in a batch without stopping early
const batch = [
  why.expect(1 + 1, 2),
  why.expect(typeof null, 'object'), // null's typeof is 'object'
  why.expect([] instanceof Array, true),
];

const failures = batch.filter((r) => !r.pass);
console.log('Batch failures:', failures.length); // → 0 (all pass)

// ─── Section 3: why.valid() — Structural Validity Check ──────────────────────

console.log('\n─── 3. why.valid() — Structural Validity ───');

// Valid inputs — defined, non-null, non-NaN
console.log(why.valid(42).valid); // → true
console.log(why.valid('hello world').valid); // → true
console.log(why.valid({ id: 1 }).valid); // → true
console.log(why.valid([]).valid); // → true   (empty array is still valid)
console.log(why.valid(0).valid); // → true   (0 is a valid number)
console.log(why.valid(false).valid); // → true   (false is a valid boolean)

// Invalid inputs
const nullResult = why.valid(null);
console.log('null valid:', nullResult.valid, '— reason:', nullResult.reason); // → false, 'Value is null'

const undResult = why.valid(undefined);
console.log('undefined valid:', undResult.valid, '— reason:', undResult.reason); // → false

const nanResult = why.valid(NaN);
console.log('NaN valid:', nanResult.valid, '— reason:', nanResult.reason); // → false, 'Value is NaN'

// ─── Section 4: why.invalid() — Negated Validity Check ──────────────────────

console.log('\n─── 4. why.invalid() — Inverted Validity ───');

// invalid() returns a ValidationResult — check .valid property
// .valid === true means the VALUE IS invalid (double-negation: invalid returns valid:true when input is bad)
console.log(why.invalid(null).valid); // → true  (null IS invalid)
console.log(why.invalid(undefined).valid); // → true  (undefined IS invalid)
console.log(why.invalid(NaN).valid); // → true  (NaN IS invalid)
console.log(why.invalid(42).valid); // → false (42 is NOT invalid)
console.log(why.invalid('').valid); // → false (empty string is NOT invalid)
console.log(why.invalid(0).valid); // → false (zero is NOT invalid)

// Practical guard function for form input validation
function safeDivide(a: number, b: number): number | null {
  const result = a / b;
  // Use why.valid to check — valid() returns { valid: true } for real numbers
  if (!why.valid(result).valid) {
    console.log('Division produced invalid result:', result);
    return null;
  }
  return result;
}

console.log(safeDivide(10, 2)); // → 5
console.log(safeDivide(0, 0)); // logs warning, returns null  (0/0 = NaN)

// ─── Section 5: why.coerce() — Safe Type Coercion ────────────────────────────

console.log('\n─── 5. why.coerce() — Type Coercion ───');

// coerce() returns the directly coerced value (primitives)
// String → Number
const asNum = why.coerce('42', 'number');
console.log('coerced to number:', asNum); // → 42

// Invalid string → Number (NaN)
const failNum = why.coerce('not-a-number', 'number');
console.log('invalid coerce (NaN):', failNum); // → NaN

// Number → String
const asStr = why.coerce(100, 'string');
console.log('coerced to string:', asStr); // → '100'

// Number → Boolean (truthy coercion)
const asBool = why.coerce(1, 'boolean');
console.log('1 coerced to boolean:', asBool); // → true

const asBool0 = why.coerce(0, 'boolean');
console.log('0 coerced to boolean:', asBool0); // → false

// null → Number
console.log('null to number:', why.coerce(null, 'number')); // → 0

// true → String
console.log('true to string:', why.coerce(true, 'string')); // → 'true'
