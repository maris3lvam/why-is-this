import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Domain: Memory & Performance', () => {
  it('why.memory returns memory breakdown', () => {
    const mem = why.memory();
    expect(mem.heapUsedBytes).toBeGreaterThan(0);
    expect(mem.heapTotalBytes).toBeGreaterThan(0);
  });

  it('why.mark and why.measure track high-res timings', () => {
    why.mark('test-mark');
    const res = why.measure('test-mark');
    expect(res.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('why.benchmark runs controlled scenarios', () => {
    const res = why.benchmark(
      () => {
        Math.sqrt(144);
      },
      { testIterations: 50 },
    );

    expect(res.iterations).toBe(50);
    expect(res.opsPerSec).toBeGreaterThan(0);
  });
});
