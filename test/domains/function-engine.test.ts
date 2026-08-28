import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Domain: Function Debugging', () => {
  it('why.function inspects fn metadata without executing', () => {
    let executed = false;
    function targetFn(a: number, b: string) {
      executed = true;
      return a + b;
    }

    const info = why.function(targetFn);
    expect(info.name).toBe('targetFn');
    expect(info.length).toBe(2);
    expect(info.isAsync).toBe(false);
    expect(executed).toBe(false); // Function NOT executed!
  });

  it('why.wrap and why.unwrap track call counts', () => {
    function add(a: number, b: number) {
      return a + b;
    }

    const wrapped = why.wrap(add);
    expect(why.callCount(wrapped)).toBe(0);

    expect(wrapped(2, 3)).toBe(5);
    expect(wrapped(1, 1)).toBe(2);
    expect(why.callCount(wrapped)).toBe(2);

    const unwrapped = why.unwrap(wrapped);
    expect(unwrapped).toBe(add);
  });
});
