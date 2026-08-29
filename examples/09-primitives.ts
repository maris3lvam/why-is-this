/**
 * @fileoverview Example 09: Primitive Diagnostics
 *
 * Covers: why.invalidDate() · why.whitespace() · why.invisible() · why.precision()
 *
 * Four focused APIs for diagnosing primitive value edge cases that are
 * surprisingly common and hard to detect without explicit tooling.
 */

import why from '../src/index.js';

// ─── Section 1: why.invalidDate() — Invalid Date Detection ───────────────────

console.log('─── 1. why.invalidDate() — Detect Invalid Date ───');

// JavaScript silently creates invalid Date objects — no error is thrown!
const validDate = new Date('2024-06-15');
const badDate1 = new Date('not-a-date'); // Invalid — silently created
const badDate2 = new Date(''); // Invalid — silently created
const badDate3 = new Date(NaN); // Invalid — silently created
const goodDate2 = new Date(2024, 0, 1); // Valid — Jan 1, 2024

console.log('validDate is invalid:', why.invalidDate(validDate)); // → false
console.log('"not-a-date" is invalid:', why.invalidDate(badDate1)); // → true
console.log('"" date is invalid:', why.invalidDate(badDate2)); // → true
console.log('new Date(NaN) is invalid:', why.invalidDate(badDate3)); // → true
console.log('Jan 1, 2024 is invalid:', why.invalidDate(goodDate2)); // → false

// Not a Date object — should return true (not a valid date instance)
console.log(
  'string is invalid date:',
  why.invalidDate('2024-01-01' as unknown as Date),
); // → true
console.log('null is invalid date:', why.invalidDate(null as unknown as Date)); // → true

// Common gotcha: typeof new Date('invalid') === 'object' and it has .getTime()
// but .getTime() returns NaN — you MUST check this explicitly.
console.log('\n[Gotcha] typeof invalid date:', typeof badDate1); // → 'object'
console.log('[Gotcha] badDate1.getTime():', badDate1.getTime()); // → NaN
console.log('[Gotcha] isNaN(badDate1.getTime()):', isNaN(badDate1.getTime())); // → true

// ─── Section 2: why.whitespace() — Whitespace-Only Detection ─────────────────

console.log('\n─── 2. why.whitespace() — Whitespace-Only Strings ───');

// Real-world scenario: user submits a form field with only spaces — looks filled but is empty
console.log(why.whitespace('')); // → true  (empty string)
console.log(why.whitespace('   ')); // → true  (spaces only)
console.log(why.whitespace('\t\n\r')); // → true  (tabs, newline, carriage return)
console.log(why.whitespace('\u00A0')); // → true  (non-breaking space — pasted from HTML)
console.log(why.whitespace('\u2003')); // → true  (em space — from rich text editors)

console.log(why.whitespace('hello')); // → false (real content)
console.log(why.whitespace('  hi  ')); // → false (has non-whitespace chars)
console.log(why.whitespace('0')); // → false (zero is content)

// Practical guard function for form input validation
function validateName(input: string): string | null {
  if (why.whitespace(input)) {
    return null; // treat as blank
  }
  return input.trim();
}

console.log('\nvalidateName("   "):', validateName('   ')); // → null
console.log('validateName("Alice"):', validateName('Alice')); // → 'Alice'

// ─── Section 3: why.invisible() — Hidden Character Detection ─────────────────

console.log('\n─── 3. why.invisible() — Invisible Character Detection ───');

// These strings LOOK empty or normal but contain invisible Unicode characters.
// Common sources: copy-paste from browser, markdown editors, PDFs, RTF.
const zeroWidthSpace = '\u200B'; // zero-width space — breaks search/compare silently
const softHyphen = '\u00AD'; // soft hyphen — invisible unless line-wraps
const bom = '\uFEFF'; // byte order mark — prefix in some text files
const objectReplacement = '\uFFFC'; // object replacement character

console.log('zero-width space invisible:', why.invisible(zeroWidthSpace)); // → true
console.log('soft hyphen invisible:', why.invisible(softHyphen)); // → true
console.log('BOM invisible:', why.invisible(bom)); // → true
console.log('object replacement invisible:', why.invisible(objectReplacement)); // → true

// Mixed: normal text + invisible char embedded in the middle
const sneakyString = `hel\u200Blo`; // "hello" with zero-width space between l and l
console.log('sneaky string invisible:', why.invisible(sneakyString)); // → true
console.log('sneaky string raw length:', sneakyString.length); // → 6 (not 5!)

// Clean strings — no invisible chars
console.log('"hello" invisible:', why.invisible('hello')); // → false
console.log('"12345" invisible:', why.invisible('12345')); // → false
console.log('"hello world" invisible:', why.invisible('hello world')); // → false

// ─── Section 4: why.precision() — Floating-Point Precision ───────────────────

console.log('\n─── 4. why.precision() — Number Decimal Precision ───');

// Returns how many decimal digits are significant in a float
console.log(why.precision(3.14)); // → 2
console.log(why.precision(1.0)); // → 0  (integer, no fractional part)
console.log(why.precision(0.1)); // → 1
console.log(why.precision(0.001)); // → 3
console.log(why.precision(1.23456789)); // → 8

// Financial / rounding gotcha:
const price = 0.1 + 0.2; // classic IEEE 754 floating point error
console.log('\n[Gotcha] 0.1 + 0.2 =', price); // → 0.30000000000000004
console.log('[Gotcha] precision:', why.precision(price)); // → 17 decimal places!

// Use this to detect when a computed value has unexpected floating-point digits
function isSafePrice(amount: number): boolean {
  return why.precision(amount) <= 2; // max 2 decimal places for currency
}

console.log('isSafePrice(9.99):', isSafePrice(9.99)); // → true
console.log('isSafePrice(0.1 + 0.2):', isSafePrice(price)); // → false — needs rounding!
