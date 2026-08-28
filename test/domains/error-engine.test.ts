import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Domain: Error Debugging', () => {
  it('why.error inspects error name, message, frames, cause chain', () => {
    const rootErr = new TypeError('invalid parameter');
    const wrapperErr = new Error('operation failed', { cause: rootErr });

    const res = why.error(wrapperErr);
    expect(res.name).toBe('Error');
    expect(res.message).toBe('operation failed');
    expect(res.causeChain).toHaveLength(1);
    expect(res.causeChain[0]?.name).toBe('TypeError');
  });

  it('why.rootCause finds deepest cause', () => {
    const e1 = new Error('e1');
    const e2 = new Error('e2', { cause: e1 });
    const e3 = new Error('e3', { cause: e2 });

    const root = why.rootCause(e3);
    expect(root.message).toBe('e1');
  });

  it('why.stack parses stack frames correctly', () => {
    const err = new Error('test');
    const frames = why.stack(err.stack);
    expect(Array.isArray(frames)).toBe(true);
  });
});
