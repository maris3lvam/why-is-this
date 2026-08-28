/**
 * @fileoverview Circular reference detection via DFS ancestor tracking.
 *
 * Maintains the set of objects in the current DFS path (ancestors).
 * During traversal: enter() is called when visiting a node,
 * leave() when backtracking past it.
 *
 * If an object is encountered that is already in the ancestor set,
 * it forms a cycle (circular reference).
 */

/**
 * Tracks the current DFS ancestor path to detect circular references.
 *
 * Usage pattern:
 *   detector.enter(obj);    // before traversing children
 *   // ... process children ...
 *   detector.leave(obj);    // after backtracking
 *
 * In iterative DFS this is done via ENTER/LEAVE stack markers.
 */
export class CircularDetector {
  private readonly ancestors = new Set<object>();

  /** Mark an object as entered in the current DFS path. */
  enter(obj: object): void {
    this.ancestors.add(obj);
  }

  /** Remove an object from the current DFS path (backtrack). */
  leave(obj: object): void {
    this.ancestors.delete(obj);
  }

  /** Returns true if the object is an ancestor in the current path. */
  isAncestor(obj: object): boolean {
    return this.ancestors.has(obj);
  }

  /** Number of objects currently in the ancestor path. */
  get depth(): number {
    return this.ancestors.size;
  }
}
