/**
 * @fileoverview Example 10: Error Diagnostics
 *
 * Covers: why.error() · why.errors() · why.stack() · why.trace() ·
 *         why.frames() · why.classify() · why.fingerprint() · why.rootCause()
 *
 * JavaScript errors often contain stacks, causes, and custom fields that
 * standard console.error() formats poorly. These APIs expose all of it structurally.
 */

import why from '../src/index.js';

// ─── Section 1: why.error() — Full Error Inspection ──────────────────────────

console.log('─── 1. why.error() — Structured Error Inspection ───');

// Custom error with extra diagnostic properties
class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly query: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

const dbErr = new DatabaseError(
  'Connection refused on port 5432',
  'SELECT * FROM users WHERE id = 1',
  'ECONNREFUSED',
);

const inspected = why.error(dbErr);
console.log('name:', inspected.name); // → 'DatabaseError'
console.log('message:', inspected.message); // → 'Connection refused on port 5432'
console.log('category:', inspected.category); // → 'Custom'
console.log('custom property count:', inspected.customProperties.length); // → 2 (query, code)
console.log(
  'custom properties:',
  inspected.customProperties.map((p) => String(p.key)),
);
// → ['query', 'code']

// Stack frames — structured, not a raw string
console.log('\nTop stack frame:', inspected.stackFrames[0]?.functionName); // → some function name

// why.errors() is an alias for why.error()
const same = why.errors(dbErr);
console.log('error === errors result:', inspected.name === same.name); // → true

// ─── Section 2: why.stack() / why.trace() / why.frames() — Stack Parsing ──────

console.log(
  '\n─── 2. why.stack() · why.trace() · why.frames() — Stack Frame Parsing ───',
);

// Parse a raw V8 stack string — useful when you have a serialized stack from a remote service
const rawStack = `Error: Something went wrong
    at processPayment (payment.ts:45:12)
    at handleRequest (server.ts:120:5)
    at callbackFn (node:http:1234:15)
    at Server.<anonymous> (node:net:5678:20)`;

const frames = why.stack(rawStack);

// All three are aliases — same function
const framesViaTrace = why.trace(rawStack);
const framesViaFrames = why.frames(rawStack);
console.log('stack === trace:', frames.length === framesViaTrace.length); // → true
console.log(
  'trace === frames:',
  framesViaTrace.length === framesViaFrames.length,
); // → true

console.log('frame count:', frames.length); // → 4
frames.forEach((f, i) => {
  console.log(
    `  [${i}] ${f.functionName} @ ${f.fileName}:${f.lineNumber} (native: ${f.isNative})`,
  );
});
// [0] processPayment @ payment.ts:45
// [1] handleRequest @ server.ts:120
// [2] callbackFn @ node:http:1234 (native: true)
// [3] Server.<anonymous> @ node:net:5678 (native: true)

// ─── Section 3: why.classify() — Error Category ───────────────────────────────

console.log('\n─── 3. why.classify() — Error Category ───');

console.log(why.classify(new TypeError('Invalid type'))); // → 'Type'
console.log(why.classify(new SyntaxError('Unexpected token'))); // → 'Syntax'
console.log(why.classify(new RangeError('Out of range'))); // → 'Custom'

// Network/system errors
class NetworkError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'NetworkError';
  }
}
console.log(why.classify(new NetworkError('timeout'))); // → 'Network'

// Error with a 'code' property → System
const sysErr = new Error('File not found') as NodeJS.ErrnoException;
sysErr.code = 'ENOENT';
console.log(why.classify(sysErr)); // → 'System'

// Generic custom error class
class AppError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'AppError';
  }
}
console.log(why.classify(new AppError('Something broke'))); // → 'Custom'

// ─── Section 4: why.fingerprint() — Deduplication Hash ───────────────────────

console.log(
  '\n─── 4. why.fingerprint() — Stable Error Identity for Deduplication ───',
);

// The same kind of error thrown from the same location produces the SAME fingerprint.
// Use for alerting deduplication, crash bucketing, or Sentry-style grouping.

const err1 = new TypeError('Cannot read property "id" of undefined');
const err2 = new TypeError('Cannot read property "id" of undefined');

const fp1 = why.fingerprint(err1);
const fp2 = why.fingerprint(err2);

console.log('fingerprint 1:', fp1);
console.log('fingerprint 2:', fp2);
console.log('same fingerprint:', fp1 === fp2); // → true (same error signature)

// Different error — different fingerprint
const fp3 = why.fingerprint(new RangeError('Index out of bounds'));
console.log('different fingerprint:', fp1 === fp3); // → false

// With top frame context for more precise fingerprinting
const topFrame = why.error(err1).stackFrames[0];
const preciseFingerprint = why.fingerprint(err1, topFrame);
console.log('precise fingerprint:', preciseFingerprint);
// → 'TypeError:filename.ts:line:Cannot read property "id"'

// ─── Section 5: why.rootCause() — Cause Chain Traversal ─────────────────────

console.log('\n─── 5. why.rootCause() — Find Root Cause in Error Chain ───');

// Layered error chain — common pattern in enterprise apps
const dbConnectionError = new Error('Connection pool exhausted');

const queryError = new Error('Failed to fetch user record', {
  cause: dbConnectionError,
});

const httpError = new Error(
  '500 Internal Server Error — could not load profile',
  {
    cause: queryError,
  },
);

// Without rootCause(), you would need to walk .cause manually.
// With rootCause(), you get the deepest cause in one call.
const root = why.rootCause(httpError);

console.log('root cause name:', root.name); // → 'Error'
console.log('root cause message:', root.message); // → 'Connection pool exhausted'
// The root is dbConnectionError — not httpError or queryError.

// Circular cause chain — should NOT hang
const circular1 = new Error('Error A');
const circular2 = new Error('Error B', { cause: circular1 });
(circular1 as unknown as Record<string, unknown>)['cause'] = circular2; // A → B → A
const safeRoot = why.rootCause(circular1);
console.log('circular root (no hang):', safeRoot.message); // → safe result, no infinite loop
