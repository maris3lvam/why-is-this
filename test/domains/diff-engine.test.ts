import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Diff Engine — Comprehensive Domain Tests', () => {
  describe('why.diff()', () => {
    it('handles primitive values diff', () => {
      const sameRes = why.diff(42, 42);
      expect(sameRes.isIdentical).toBe(true);
      expect(sameRes.unchangedCount).toBe(1);

      const diffRes = why.diff(42, 99);
      expect(diffRes.isIdentical).toBe(false);
      expect(diffRes.unchangedCount).toBe(0);
    });

    it('identifies added properties correctly', () => {
      const a = { x: 1 };
      const b = { x: 1, y: 2, z: 3 };
      const res = why.diff(a, b);
      expect(res.added).toHaveLength(2);
      expect(res.added.map((e) => e.key)).toEqual(['y', 'z']);
    });

    it('identifies removed properties correctly', () => {
      const a = { x: 1, y: 2, z: 3 };
      const b = { x: 1 };
      const res = why.diff(a, b);
      expect(res.removed).toHaveLength(2);
      expect(res.removed.map((e) => e.key)).toEqual(['y', 'z']);
    });

    it('identifies modified properties with oldValue and newValue descriptors', () => {
      const a = { x: 1, name: 'Alice' };
      const b = { x: 1, name: 'Bob' };
      const res = why.diff(a, b);
      expect(res.modified).toHaveLength(1);
      expect(res.modified[0]?.key).toBe('name');
      expect(res.modified[0]?.oldValue).toEqual({ kind: 'primitive', value: 'Alice' });
      expect(res.modified[0]?.newValue).toEqual({ kind: 'primitive', value: 'Bob' });
    });

    it('handles empty objects diff', () => {
      const res = why.diff({}, {});
      expect(res.isIdentical).toBe(true);
      expect(res.unchangedCount).toBe(0);
      expect(res.added).toHaveLength(0);
      expect(res.removed).toHaveLength(0);
      expect(res.modified).toHaveLength(0);
    });

    it('handles top-level property modifications', () => {
      const a = { name: 'Alice', age: 30 };
      const b = { name: 'Alice', age: 31 };
      const res = why.diff(a, b);
      expect(res.modified).toHaveLength(1);
      expect(res.modified[0]?.key).toBe('age');
    });
  });

  describe('why.added(), why.removed(), why.modified()', () => {
    it('why.added filters added entries array', () => {
      const addedEntries = why.added({ a: 1 }, { a: 1, b: 2, c: 3 });
      expect(addedEntries).toHaveLength(2);
      expect(addedEntries.map((e) => e.key)).toEqual(['b', 'c']);
    });

    it('why.removed filters removed entries array', () => {
      const removedEntries = why.removed({ a: 1, b: 2, c: 3 }, { a: 1 });
      expect(removedEntries).toHaveLength(2);
      expect(removedEntries.map((e) => e.key)).toEqual(['b', 'c']);
    });

    it('why.modified filters modified entries array', () => {
      const modifiedEntries = why.modified({ a: 1, b: 'old' }, { a: 1, b: 'new' });
      expect(modifiedEntries).toHaveLength(1);
      expect(modifiedEntries[0]?.key).toBe('b');
    });
  });

  describe('why.changed() & why.unchanged()', () => {
    it('why.changed returns true if any properties differ', () => {
      expect(why.changed({ a: 1 }, { a: 2 })).toBe(true);
      expect(why.changed({ a: 1 }, { a: 1 })).toBe(false);
    });

    it('why.unchanged returns true if objects match structurally', () => {
      expect(why.unchanged({ a: 1, b: 'hi' }, { a: 1, b: 'hi' })).toBe(true);
      expect(why.unchanged({ a: 1 }, { a: 2 })).toBe(false);
    });
  });

  describe('why.reference() & why.snapshot() & why.restore()', () => {
    it('why.reference detects same-reference relationship', () => {
      const obj = { x: 1 };
      const res = why.reference(obj, obj);
      expect(res.relationship).toBe('same-reference');
      expect(res.details).toContain('Identical');
    });

    it('why.reference detects different-reference relationship', () => {
      const res = why.reference({ x: 1 }, { x: 1 });
      expect(res.relationship).toBe('different-reference');
      expect(res.details).toContain('Distinct');
    });

    it('why.snapshot produces distinct deep clone snapshot', () => {
      const orig = { a: 1, b: { c: 2 } };
      const snap = why.snapshot(orig) as typeof orig;
      expect(snap).toEqual(orig);
      expect(snap).not.toBe(orig);
    });

    it('why.restore returns snapshot value', () => {
      const snap = { a: 1 };
      expect(why.restore(snap)).toBe(snap);
    });
  });
});
