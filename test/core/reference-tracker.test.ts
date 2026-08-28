import { describe, it, expect } from 'vitest';
import { ReferenceTracker } from '../../src/core/reference-tracker.js';

describe('ReferenceTracker', () => {
  it('returns first for new object', () => {
    const tracker = new ReferenceTracker();
    const obj = {};
    expect(tracker.track(obj, 'root')).toBe('first');
  });

  it('returns repeated for already-seen object', () => {
    const tracker = new ReferenceTracker();
    const obj = {};
    tracker.track(obj, 'root');
    expect(tracker.track(obj, 'root.a')).toBe('repeated');
  });

  it('has() returns false for unseen object', () => {
    const tracker = new ReferenceTracker();
    expect(tracker.has({})).toBe(false);
  });

  it('has() returns true after tracking', () => {
    const tracker = new ReferenceTracker();
    const obj = {};
    tracker.track(obj, 'root');
    expect(tracker.has(obj)).toBe(true);
  });

  it('getPaths() returns the tracked paths', () => {
    const tracker = new ReferenceTracker();
    const obj = {};
    tracker.track(obj, 'root');
    tracker.track(obj, 'root.child');
    expect(tracker.getPaths(obj)).toEqual(['root', 'root.child']);
  });

  it('getPaths() returns undefined for unseen object', () => {
    const tracker = new ReferenceTracker();
    expect(tracker.getPaths({})).toBeUndefined();
  });

  it('size increments with each new object', () => {
    const tracker = new ReferenceTracker();
    expect(tracker.size).toBe(0);
    tracker.track({}, 'root');
    expect(tracker.size).toBe(1);
    tracker.track({}, 'root.a'); // different object
    expect(tracker.size).toBe(2);
  });

  it('size does not increment for repeated object', () => {
    const tracker = new ReferenceTracker();
    const obj = {};
    tracker.track(obj, 'root');
    tracker.track(obj, 'root.a');
    expect(tracker.size).toBe(1);
  });

  it('getRepeatedRefs() returns empty when no repeats', () => {
    const tracker = new ReferenceTracker();
    tracker.track({}, 'root');
    tracker.track({}, 'root.a');
    expect(tracker.getRepeatedRefs()).toHaveLength(0);
  });

  it('getRepeatedRefs() returns groups for repeated objects', () => {
    const tracker = new ReferenceTracker();
    const shared = {};
    tracker.track(shared, 'root.a');
    tracker.track(shared, 'root.b');
    const refs = tracker.getRepeatedRefs();
    expect(refs).toHaveLength(1);
    expect(refs[0]?.paths).toEqual(['root.a', 'root.b']);
  });

  it('correctly distinguishes different objects with identical content', () => {
    const tracker = new ReferenceTracker();
    const obj1 = { x: 1 };
    const obj2 = { x: 1 }; // Same structure, different identity
    tracker.track(obj1, 'root.a');
    tracker.track(obj2, 'root.b');
    expect(tracker.getRepeatedRefs()).toHaveLength(0);
  });

  it('tracks circular object paths correctly', () => {
    const tracker = new ReferenceTracker();
    const obj: Record<string, unknown> = {};
    obj['self'] = obj;
    tracker.track(obj, 'root');
    tracker.track(obj, 'root.self'); // circular path
    const refs = tracker.getRepeatedRefs();
    expect(refs[0]?.paths).toContain('root');
    expect(refs[0]?.paths).toContain('root.self');
  });
});
