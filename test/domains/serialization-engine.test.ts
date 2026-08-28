import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Serialization Engine', () => {
  it('why.serializable detects natively JSON-serializable values', () => {
    expect(why.serializable(42)).toBe(true);
    expect(why.serializable({ a: 1 })).toBe(true);
    expect(why.serializable(42n)).toBe(false);
  });

  it('why.json handles circular references and BigInts', () => {
    const obj: Record<string, unknown> = { val: 99n };
    obj['self'] = obj;
    expect(() => why.json(obj)).not.toThrow();
    const str = why.json(obj);
    expect(str).toContain('99n');
    expect(str).toContain('[Circular]');
  });

  it('why.parse parses valid JSON', () => {
    expect(why.parse('{"a": 1}')).toEqual({ a: 1 });
    expect(why.parse('invalid json')).toBe(null);
  });

  it('why.clone deep clones object structure', () => {
    const orig = { a: 1 };
    const clone = why.clone(orig);
    expect(clone).toEqual(orig);
    expect(clone).not.toBe(orig);
  });
});
