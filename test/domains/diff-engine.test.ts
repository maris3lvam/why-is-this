import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Diff Engine', () => {
  it('why.diff identifies added, removed, and modified properties', () => {
    const a = { x: 1, y: 2, z: 3 };
    const b = { y: 20, z: 3, w: 4 };

    const res = why.diff(a, b);
    expect(res.removed.map((e) => e.key)).toEqual(['x']);
    expect(res.added.map((e) => e.key)).toEqual(['w']);
    expect(res.modified.map((e) => e.key)).toEqual(['y']);
    expect(res.unchangedCount).toBe(1);
    expect(res.isIdentical).toBe(false);
  });

  it('why.changed and why.unchanged', () => {
    expect(why.unchanged({ a: 1 }, { a: 1 })).toBe(true);
    expect(why.changed({ a: 1 }, { a: 2 })).toBe(true);
  });

  it('why.snapshot produces safe clone', () => {
    const orig = { a: 1, b: { c: 2 } };
    const snap = why.snapshot(orig) as typeof orig;
    expect(snap).toEqual(orig);
    expect(snap).not.toBe(orig);
  });
});
