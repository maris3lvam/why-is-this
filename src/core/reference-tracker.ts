/**
 * @fileoverview Reference tracker for graph traversal.
 *
 * Tracks which objects have been encountered during traversal and
 * at what paths. Used to identify repeated references (same object
 * identity appearing at multiple paths).
 *
 * Repeated references are distinct from circular references:
 *   - Repeated: same object at multiple paths, not necessarily in a cycle
 *   - Circular: object is an ancestor in the current DFS path (implies repeated)
 */

import type { RepeatedRefInfo } from '../models/inspection-result.js';

/**
 * Tracks object references using identity (===), not structural equality.
 *
 * Uses a regular Map (not WeakMap) because we need to iterate all entries
 * at the end of traversal to extract repeated refs. The tracker is
 * short-lived (created and discarded per inspection call) so memory
 * lifecycle is not a concern.
 */
export class ReferenceTracker {
  private readonly seen = new Map<object, string[]>();

  /**
   * Records an object at a path.
   *
   * @returns 'first' if this is the first sighting, 'repeated' otherwise.
   */
  track(obj: object, path: string): 'first' | 'repeated' {
    const existing = this.seen.get(obj);
    if (existing !== undefined) {
      existing.push(path);
      return 'repeated';
    }
    this.seen.set(obj, [path]);
    return 'first';
  }

  /** Returns true if this object has been tracked before. */
  has(obj: object): boolean {
    return this.seen.has(obj);
  }

  /** Returns all paths where this object has appeared. */
  getPaths(obj: object): string[] | undefined {
    return this.seen.get(obj);
  }

  /** Returns all objects that appear at 2 or more paths. */
  getRepeatedRefs(): RepeatedRefInfo[] {
    const result: RepeatedRefInfo[] = [];
    for (const paths of this.seen.values()) {
      if (paths.length >= 2) {
        result.push({ paths: [...paths] });
      }
    }
    return result;
  }

  /** Total number of distinct objects currently tracked. */
  get size(): number {
    return this.seen.size;
  }
}
