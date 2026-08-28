import { describe, it, expect } from 'vitest';
import { CircularDetector } from '../../src/core/circular-detector.js';

describe('CircularDetector', () => {
  it('isAncestor() returns false for untracked object', () => {
    const detector = new CircularDetector();
    expect(detector.isAncestor({})).toBe(false);
  });

  it('isAncestor() returns true after enter()', () => {
    const detector = new CircularDetector();
    const obj = {};
    detector.enter(obj);
    expect(detector.isAncestor(obj)).toBe(true);
  });

  it('isAncestor() returns false after leave()', () => {
    const detector = new CircularDetector();
    const obj = {};
    detector.enter(obj);
    detector.leave(obj);
    expect(detector.isAncestor(obj)).toBe(false);
  });

  it('depth reflects ancestor count', () => {
    const detector = new CircularDetector();
    expect(detector.depth).toBe(0);
    const a = {};
    const b = {};
    detector.enter(a);
    expect(detector.depth).toBe(1);
    detector.enter(b);
    expect(detector.depth).toBe(2);
    detector.leave(b);
    expect(detector.depth).toBe(1);
    detector.leave(a);
    expect(detector.depth).toBe(0);
  });

  it('tracks multiple ancestors independently', () => {
    const detector = new CircularDetector();
    const root = {};
    const child = {};
    detector.enter(root);
    detector.enter(child);
    expect(detector.isAncestor(root)).toBe(true);
    expect(detector.isAncestor(child)).toBe(true);
    detector.leave(child);
    expect(detector.isAncestor(root)).toBe(true);
    expect(detector.isAncestor(child)).toBe(false);
  });

  it('simulates DFS circular detection correctly', () => {
    const detector = new CircularDetector();
    const root: Record<string, unknown> = {};
    root['self'] = root;

    // Enter root
    detector.enter(root);
    // Check child (root.self = root) — should be detected as circular
    expect(detector.isAncestor(root)).toBe(true); // circular!
    // Leave root (backtrack)
    detector.leave(root);
    expect(detector.isAncestor(root)).toBe(false);
  });
});
