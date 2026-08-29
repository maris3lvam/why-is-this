/**
 * @fileoverview Example 12: Async & Promise Diagnostics
 *
 * Covers: why.delay() · why.promise() · why.timeout()
 *
 * These APIs give you control and visibility over the async world:
 * - Pause execution cleanly without busy-waiting
 * - Inspect what state a Promise is actually in right now
 * - Add timeout safety to any Promise that could hang forever
 */

import why from '../src/index.js';

// ─── Section 1: why.delay() — Controlled Non-Blocking Pause ──────────────────

console.log('─── 1. why.delay() — Non-Blocking Delay ───');

const start = performance.now();

await why.delay(100);

const elapsed = performance.now() - start;
console.log(`Delayed for ~100ms. Actual: ${elapsed.toFixed(1)}ms`);
// → Delayed for ~100ms. Actual: 100.x ms

// Use as readable sleep in tests or CLI scripts
console.log('Simulating rate-limited API calls...');
for (let i = 1; i <= 3; i++) {
  await why.delay(50); // 50ms between calls — avoids throttling
  console.log(`  Request ${i} sent`);
}

// ─── Section 2: why.promise() — Inspect Current Promise State ─────────────────

console.log('\n─── 2. why.promise() — Promise State Inspection ───');

// Case A: Already-resolved promise
const resolved = Promise.resolve({ status: 'ok', data: [1, 2, 3] });
const resolvedState = await why.promise(resolved);
console.log('state:', resolvedState.state); // → 'fulfilled'
console.log('value kind:', resolvedState.value?.kind); // → 'object'

// Case B: Rejected promise — must be pre-rejected (caught already)
const rejected = Promise.reject(new Error('Network timeout'));
// Attach a no-op catch to prevent unhandled rejection
rejected.catch(() => {});

const rejectedState = await why.promise(rejected);
console.log('rejected state:', rejectedState.state); // → 'rejected'
console.log('reason kind:', rejectedState.reason?.kind); // → 'object' (Error)

// Case C: Still-pending promise (resolves in 500ms)
const pending = new Promise<string>((resolve) =>
  setTimeout(() => resolve('done'), 500),
);
const pendingState = await why.promise(pending);
console.log('pending state:', pendingState.state); // → 'pending' (inspected immediately, before 500ms)

// Case D: Non-promise value — returns 'unknown' state
const notPromise = await why.promise('not a promise');
console.log('non-promise state:', notPromise.state); // → 'unknown'
console.log('non-promise success:', notPromise.success); // → false

// ─── Section 3: why.timeout() — Add Timeout to Any Promise ───────────────────

console.log('\n─── 3. why.timeout() — Timeout Wrapper ───');

// Case A: Fast operation — completes before timeout
const fastTask = async () => {
  await why.delay(50);
  return { records: 100, page: 1 };
};

try {
  const result = await why.timeout(fastTask(), 500); // 500ms budget
  console.log('Fast task succeeded:', result.records, 'records'); // → 100 records
} catch (e) {
  console.log('Fast task timed out (should NOT happen)');
}

// Case B: Slow operation — exceeds timeout
const slowTask = async () => {
  await why.delay(1000); // takes 1 full second
  return 'late result';
};

try {
  await why.timeout(slowTask(), 200, 'Database query exceeded 200ms budget');
  console.log('Slow task completed (should NOT reach here)');
} catch (e) {
  console.log('Slow task timed out — caught error:', (e as Error).message);
  // → 'Database query exceeded 200ms budget'
}

// Case C: Timeout with default message
const anotherSlow = why.delay(2000);
try {
  await why.timeout(anotherSlow, 100);
} catch (e) {
  console.log('Default timeout message:', (e as Error).message);
  // → 'Operation timed out'
}

// Case D: Rejection BEFORE timeout — the original rejection propagates
const willReject = new Promise<never>((_, reject) => {
  setTimeout(() => reject(new Error('Auth failed')), 50);
});

try {
  await why.timeout(willReject, 2000); // large budget, but rejection comes first
} catch (e) {
  console.log('Pre-timeout rejection:', (e as Error).message);
  // → 'Auth failed'  (original error, not a timeout error)
}

// ─── Section 4: Combining delay + promise + timeout ───────────────────────────

console.log('\n─── 4. Combining All Three — Retry with Deadline ───');

async function unreliableService(attemptNumber: number): Promise<string> {
  await why.delay(30 * attemptNumber);
  if (attemptNumber < 3) throw new Error(`Attempt ${attemptNumber} failed`);
  return `Success on attempt ${attemptNumber}`;
}

async function retryWithDeadline(
  maxAttempts: number,
  deadlineMs: number,
): Promise<string> {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await why.timeout(
        unreliableService(i),
        deadlineMs,
        `Deadline exceeded on attempt ${i}`,
      );
    } catch (e) {
      const err = e as Error;
      console.log(`  Attempt ${i} failed: ${err.message}`);
      if (i < maxAttempts) {
        await why.delay(20); // brief back-off between retries
      }
    }
  }
  throw new Error('All attempts exhausted');
}

try {
  const response = await retryWithDeadline(4, 200);
  console.log('Final result:', response); // → 'Success on attempt 3'
} catch (e) {
  console.log('All retries failed:', (e as Error).message);
}
