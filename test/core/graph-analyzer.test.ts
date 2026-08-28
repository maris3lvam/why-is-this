import { describe, it, expect } from 'vitest';
import { analyzeGraph } from '../../src/core/graph-analyzer.js';
import { DEFAULT_LIMITS } from '../../src/core/limits.js';

describe('analyzeGraph — basic traversal', () => {
  it('returns depth 0 for primitive (not traversed)', () => {
    const result = analyzeGraph(42, DEFAULT_LIMITS);
    expect(result.maxDepth).toBe(0);
    expect(result.topLevelEntries).toHaveLength(0);
  });

  it('returns depth 1 for flat object', () => {
    const result = analyzeGraph({ a: 1, b: 2 }, DEFAULT_LIMITS);
    expect(result.maxDepth).toBe(1);
  });

  it('returns depth 2 for nested object', () => {
    const result = analyzeGraph({ a: { b: 1 } }, DEFAULT_LIMITS);
    expect(result.maxDepth).toBe(2);
  });

  it('returns depth 3 for deeply nested object', () => {
    const result = analyzeGraph({ a: { b: { c: 1 } } }, DEFAULT_LIMITS);
    expect(result.maxDepth).toBe(3);
  });

  it('collects top-level entries', () => {
    const result = analyzeGraph({ x: 1, y: 'hello' }, DEFAULT_LIMITS);
    expect(result.topLevelEntries).toHaveLength(2);
    const keys = result.topLevelEntries.map((e) => e.key);
    expect(keys).toContain('x');
    expect(keys).toContain('y');
  });

  it('top-level entries have correct values', () => {
    const result = analyzeGraph({ n: 42 }, DEFAULT_LIMITS);
    const entry = result.topLevelEntries.find((e) => e.key === 'n');
    expect(entry?.value).toEqual({ kind: 'primitive', value: 42 });
  });
});

describe('analyzeGraph — circular references', () => {
  it('detects direct self-reference', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    const result = analyzeGraph(obj, DEFAULT_LIMITS);
    expect(result.isCircular).toBe(true);
    expect(result.circularPaths).toHaveLength(1);
    expect(result.circularPaths[0]?.path).toBe('root.self');
    expect(result.circularPaths[0]?.targetPath).toBe('root');
  });

  it('does NOT recurse infinitely on circular object', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    // Must complete quickly, must not throw
    expect(() => analyzeGraph(obj, DEFAULT_LIMITS)).not.toThrow();
  });

  it('detects indirect circular reference', () => {
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    a['b'] = b;
    b['a'] = a;
    const result = analyzeGraph(a, DEFAULT_LIMITS);
    expect(result.isCircular).toBe(true);
  });

  it('isCircular is false for acyclic object', () => {
    const result = analyzeGraph({ a: 1, b: { c: 2 } }, DEFAULT_LIMITS);
    expect(result.isCircular).toBe(false);
    expect(result.circularPaths).toHaveLength(0);
  });

  it('reports circular path accurately', () => {
    const root: Record<string, unknown> = {};
    root['child'] = {};
    (root['child'] as Record<string, unknown>)['back'] = root;
    const result = analyzeGraph(root, DEFAULT_LIMITS);
    expect(result.isCircular).toBe(true);
    const cp = result.circularPaths[0];
    expect(cp?.path).toBe('root.child.back');
    expect(cp?.targetPath).toBe('root');
  });
});

describe('analyzeGraph — repeated references (not circular)', () => {
  it('detects shared reference at two paths', () => {
    const shared = { id: 1 };
    const data = { a: shared, b: shared };
    const result = analyzeGraph(data, DEFAULT_LIMITS);
    expect(result.isCircular).toBe(false); // NOT circular
    expect(result.repeatedRefs).toHaveLength(1);
    const ref = result.repeatedRefs[0]!;
    expect(ref.paths).toContain('root.a');
    expect(ref.paths).toContain('root.b');
  });

  it('distinguishes repeated from circular', () => {
    const shared = {};
    const data = { a: shared, b: shared };
    const result = analyzeGraph(data, DEFAULT_LIMITS);
    expect(result.isCircular).toBe(false); // shared but NOT circular
    expect(result.repeatedRefs.length).toBeGreaterThan(0);
  });

  it('circular object appears in both circularPaths AND repeatedRefs', () => {
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    const result = analyzeGraph(obj, DEFAULT_LIMITS);
    expect(result.isCircular).toBe(true);
    // The circular object also appears at 2+ paths
    expect(result.repeatedRefs.length).toBeGreaterThan(0);
  });

  it('unique references are not in repeatedRefs', () => {
    const result = analyzeGraph({ a: { x: 1 }, b: { x: 1 } }, DEFAULT_LIMITS);
    // a and b are different objects, even though structurally equal
    expect(result.repeatedRefs).toHaveLength(0);
  });
});

describe('analyzeGraph — Map and Set traversal', () => {
  it('traverses Map values for circular detection', () => {
    const map = new Map<string, unknown>();
    const inner: Record<string, unknown> = {};
    inner['self'] = inner;
    map.set('key', inner);
    const result = analyzeGraph(map, DEFAULT_LIMITS);
    expect(result.isCircular).toBe(true);
  });

  it('traverses Set values for circular detection', () => {
    const inner: Record<string, unknown> = {};
    inner['self'] = inner;
    const set = new Set([inner]);
    const result = analyzeGraph(set, DEFAULT_LIMITS);
    expect(result.isCircular).toBe(true);
  });
});

describe('analyzeGraph — limits', () => {
  it('truncates at maxDepth', () => {
    const limits = { ...DEFAULT_LIMITS, maxDepth: 2 };
    const deep = { a: { b: { c: { d: 1 } } } };
    const result = analyzeGraph(deep, limits);
    expect(result.truncated).toBe(true);
    expect(result.maxDepth).toBeLessThanOrEqual(2);
  });

  it('truncates at maxProperties', () => {
    const limits = { ...DEFAULT_LIMITS, maxProperties: 3 };
    const large: Record<string, number> = {};
    for (let i = 0; i < 20; i++) large[`k${i}`] = i;
    const result = analyzeGraph(large, limits);
    expect(result.topLevelEntries.length).toBeLessThanOrEqual(3);
  });

  it('truncates Map iteration at maxCollectionEntries', () => {
    const limits = { ...DEFAULT_LIMITS, maxCollectionEntries: 2 };
    const map = new Map<number, { val: number }>();
    for (let i = 0; i < 10; i++) map.set(i, { val: i });
    const result = analyzeGraph(map, limits);
    expect(result.truncated).toBe(true);
  });
});
