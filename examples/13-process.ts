/**
 * @fileoverview Example 13: Performance, Memory & Process
 *
 * Covers: why.process() · why.env() · why.memory() ·
 *         why.mark() · why.measure() · why.benchmark()
 *
 * Diagnostic APIs for understanding your Node.js runtime environment:
 * what process is running, what memory it uses, and how fast your code runs.
 */

import why from '../src/index.js';

// ─── Section 1: why.process() — Process Metadata ─────────────────────────────

console.log('─── 1. why.process() — Process Metadata ───');

const proc = why.process();
console.log('pid:', proc.pid); // → current process ID (e.g. 12345)
console.log('platform:', proc.platform); // → 'linux' | 'darwin' | 'win32'
console.log('arch:', proc.arch); // → 'x64' | 'arm64'
console.log('nodeVersion:', proc.nodeVersion); // → 'v20.x.x'
console.log('uptime:', proc.uptimeSeconds, 'seconds');
console.log('cwd:', proc.cwd); // → current working directory
// proc.env is auto-redacted (sensitive keys replaced with '***')

// ─── Section 2: why.env() — Redacted Environment Variables ──────────────────

console.log('\n─── 2. why.env() — Auto-Redacted Environment ───');

// Simulate an environment with sensitive keys present
process.env['APP_NAME'] = 'my-api-service';
process.env['DB_HOST'] = 'localhost';
process.env['DB_PASSWORD'] = 'super-secret-password'; // should be redacted
process.env['AUTH_TOKEN'] = 'Bearer eyJhbGci...'; // should be redacted
process.env['STRIPE_API_KEY'] = 'sk_live_abc123'; // should be redacted

const env = why.env();

// Safe keys — visible as-is
console.log('APP_NAME:', env['APP_NAME']); // → 'my-api-service'
console.log('DB_HOST:', env['DB_HOST']); // → 'localhost'

// Sensitive keys — replaced with '***'
console.log('DB_PASSWORD:', env['DB_PASSWORD']); // → '***'
console.log('AUTH_TOKEN:', env['AUTH_TOKEN']); // → '***'
console.log('STRIPE_API_KEY:', env['STRIPE_API_KEY']); // → '***'
// None of the real values are leaked.

// ─── Section 3: why.memory() — Heap & RSS Snapshot ───────────────────────────

console.log('\n─── 3. why.memory() — Memory Usage Snapshot ───');

const memBefore = why.memory();
console.log(
  'heapUsed (before):',
  (memBefore.heapUsedBytes / 1024 / 1024).toFixed(2),
  'MB',
);
console.log(
  'heapTotal (before):',
  (memBefore.heapTotalBytes / 1024 / 1024).toFixed(2),
  'MB',
);
console.log(
  'rss (before):',
  (memBefore.rssBytes / 1024 / 1024).toFixed(2),
  'MB',
);

// Allocate a large buffer to see heap grow
const bigArray = new Array(100_000).fill({ id: 1, value: 'test-data' });

const memAfter = why.memory();
console.log(
  '\nheapUsed (after 100k objects):',
  (memAfter.heapUsedBytes / 1024 / 1024).toFixed(2),
  'MB',
);

const heapGrowthMB =
  (memAfter.heapUsedBytes - memBefore.heapUsedBytes) / 1024 / 1024;
console.log('heap growth:', heapGrowthMB.toFixed(2), 'MB');

// Release — GC will reclaim eventually
void bigArray;

// ─── Section 4: why.mark() + why.measure() — Timing ─────────────────────────

console.log('\n─── 4. why.mark() + why.measure() — Duration Measurement ───');

// Profile an expensive JSON parsing operation
const largePayload = JSON.stringify({
  items: Array.from({ length: 5000 }, (_, i) => ({
    id: i,
    value: `item-${i}`,
  })),
});

why.mark('json-parse-start');

const parsed = JSON.parse(largePayload) as { items: unknown[] };

const timing = why.measure('json-parse-start');
console.log('JSON parse duration:', timing.durationMs.toFixed(3), 'ms');
console.log('item count:', parsed.items.length); // → 5000

// Measure two different code paths back-to-back
const items = Array.from({ length: 10_000 }, (_, i) => i);

why.mark('sort-native');
[...items].sort((a, b) => a - b);
const nativeSortTime = why.measure('sort-native');

why.mark('sort-reverse');
[...items].reverse().sort((a, b) => b - a);
const reverseSortTime = why.measure('sort-reverse');

console.log('\nNative sort:', nativeSortTime.durationMs.toFixed(3), 'ms');
console.log('Reverse sort:', reverseSortTime.durationMs.toFixed(3), 'ms');

// Unmeasured mark — returns 0ms duration, success: false
const unknown = why.measure('does-not-exist');
console.log('\nUnknown mark success:', unknown.success); // → false
console.log('Unknown mark duration:', unknown.durationMs); // → 0

// ─── Section 5: why.benchmark() — Statistical Micro-Benchmark ────────────────

console.log('\n─── 5. why.benchmark() — Micro-Benchmark ───');

// Benchmark a pure function: string serialization
const bench1 = why.benchmark(
  () => JSON.stringify({ id: 1, name: 'Alice', active: true }),
  { warmupIterations: 50, testIterations: 500 },
);

console.log('JSON.stringify benchmark:');
console.log('  ops/sec:', bench1.opsPerSec?.toFixed(0));
console.log('  p50:', bench1.p50Ms?.toFixed(4), 'ms per op');
console.log('  p95:', bench1.p95Ms?.toFixed(4), 'ms per op');
console.log('  p99:', bench1.p99Ms?.toFixed(4), 'ms per op');
console.log('  totalDuration:', bench1.durationMs.toFixed(1), 'ms');

// Compare two implementations of the same operation
const bench2 = why.benchmark(
  () => Object.keys({ a: 1, b: 2, c: 3, d: 4, e: 5 }),
  { warmupIterations: 20, testIterations: 200 },
);

const bench3 = why.benchmark(
  () => Object.entries({ a: 1, b: 2, c: 3, d: 4, e: 5 }).map(([k]) => k),
  { warmupIterations: 20, testIterations: 200 },
);

console.log('\nObject.keys ops/sec:', bench2.opsPerSec?.toFixed(0));
console.log('entries+map ops/sec:', bench3.opsPerSec?.toFixed(0));
console.log(
  'Object.keys is faster:',
  (bench2.opsPerSec ?? 0) > (bench3.opsPerSec ?? 0),
);
// → true (keys is typically faster than entries + map)
