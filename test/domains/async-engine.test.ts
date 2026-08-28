import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Async Engine', () => {
  it('why.delay creates non-blocking delay promise', async () => {
    const start = performance.now();
    await why.delay(10);
    expect(performance.now() - start).toBeGreaterThanOrEqual(8);
  });

  it('why.promise inspects fulfilled promise state', async () => {
    const p = Promise.resolve(42);
    const state = await why.promise(p);
    expect(state.state).toBe('fulfilled');
  });

  it('why.timeout wraps promise with timeout limit', async () => {
    const res = await why.timeout(Promise.resolve('ok'), 100);
    expect(res).toBe('ok');
  });
});
