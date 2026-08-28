/**
 * @fileoverview Domain engine for memory diagnostics, timing, and controlled benchmarking.
 */

import type {
  MemoryResult,
  PerformanceResult,
} from '../models/domain-results.js';

const marks = new Map<string, number>();

/**
 * Returns process memory usage breakdown.
 */
export function inspectMemory(): MemoryResult {
  const mem = process.memoryUsage();
  return Object.freeze({
    timestamp: Date.now(),
    domain: 'memory',
    success: true,
    heapUsedBytes: mem.heapUsed,
    heapTotalBytes: mem.heapTotal,
    rssBytes: mem.rss,
    externalBytes: mem.external,
    arrayBuffersBytes: mem.arrayBuffers || 0,
  });
}

/**
 * Creates a timing mark using performance.now().
 */
export function markTime(name: string): void {
  marks.set(name, performance.now());
}

/**
 * Measures duration from a previous mark.
 */
export function measureTime(name: string): PerformanceResult {
  const startTime = marks.get(name);
  const now = performance.now();
  const durationMs = startTime !== undefined ? now - startTime : 0;

  return Object.freeze({
    timestamp: Date.now(),
    domain: 'performance',
    success: startTime !== undefined,
    durationMs,
  });
}

export interface BenchmarkOptions {
  warmupIterations?: number;
  testIterations?: number;
}

/**
 * Runs a controlled benchmark scenario and computes ops/sec and percentile timings.
 */
export function benchmarkFn(
  fn: () => void,
  options?: BenchmarkOptions,
): PerformanceResult {
  const warmup = options?.warmupIterations ?? 10;
  const iterations = options?.testIterations ?? 100;

  // Warmup
  for (let i = 0; i < warmup; i++) {
    fn();
  }

  const timings: number[] = [];
  const startTotal = performance.now();

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    timings.push(performance.now() - t0);
  }

  const totalTimeMs = performance.now() - startTotal;
  timings.sort((a, b) => a - b);

  const p50Ms = timings[Math.floor(iterations * 0.5)] ?? 0;
  const p95Ms = timings[Math.floor(iterations * 0.95)] ?? 0;
  const p99Ms = timings[Math.floor(iterations * 0.99)] ?? 0;
  const opsPerSec = totalTimeMs > 0 ? (iterations / totalTimeMs) * 1000 : 0;

  return Object.freeze({
    timestamp: Date.now(),
    domain: 'performance',
    success: true,
    durationMs: totalTimeMs,
    opsPerSec,
    p50Ms,
    p95Ms,
    p99Ms,
    iterations,
  });
}
