/**
 * @fileoverview Bounded iterative graph analyzer.
 *
 * Performs a single DFS traversal of an object graph to compute:
 *   - Maximum nesting depth
 *   - All circular reference paths (with ancestor tracking)
 *   - All repeated reference groups
 *   - Top-level entry metadata (immediate own-property key/value pairs)
 *
 * KEY DESIGN DECISIONS:
 *   1. Iterative DFS (not recursive) — prevents native call-stack overflow
 *      for deeply nested or circular structures.
 *   2. ENTER/LEAVE stack markers — correctly maintain ancestor set during
 *      iterative traversal (equivalent to recursive enter/backtrack).
 *   3. Single pass — circular refs and repeated refs computed in the same
 *      traversal, not two separate passes.
 *   4. Never executes getters — only data-descriptor values are traversed.
 *   5. Conservative limits — stops early rather than consuming unbounded
 *      memory or time.
 *
 * CIRCULAR vs. REPEATED:
 *   Circular:  an object that is already in the current DFS ancestor path.
 *   Repeated:  an object seen at a prior path (no longer an ancestor).
 *   An object can be both (e.g. obj.self = obj — obj is both).
 */

import type {
  CircularPathInfo,
  EntryInfo,
  InspectionError,
  RepeatedRefInfo,
} from '../models/inspection-result.js';
import type { InspectionLimits } from './limits.js';
import {
  detectType,
  isObjectLike,
  isTraversableType,
} from './type-detector.js';
import { safeReadKeys, safeReadValue } from './safe-reader.js';
import { ReferenceTracker } from './reference-tracker.js';
import { CircularDetector } from './circular-detector.js';

// ─────────────────────────────────────────────────────────────────────────────
// Public result type
// ─────────────────────────────────────────────────────────────────────────────

export interface GraphAnalysisResult {
  readonly maxDepth: number;
  readonly isCircular: boolean;
  readonly circularPaths: CircularPathInfo[];
  readonly repeatedRefs: RepeatedRefInfo[];
  readonly topLevelEntries: EntryInfo[];
  readonly errors: InspectionError[];
  readonly truncated: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stack item types for iterative DFS
// ─────────────────────────────────────────────────────────────────────────────

type StackEnter = {
  readonly kind: 'enter';
  readonly value: unknown;
  readonly path: string;
  readonly depth: number;
};
type StackLeave = {
  readonly kind: 'leave';
  readonly obj: object;
};
type StackItem = StackEnter | StackLeave;

// ─────────────────────────────────────────────────────────────────────────────
// Graph analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyze the object graph of rootValue in a single bounded iterative DFS.
 *
 * @param rootValue - The value to inspect (any JS value)
 * @param limits - Traversal limits
 * @returns GraphAnalysisResult with depth, circular paths, repeated refs, entries
 */
export function analyzeGraph(
  rootValue: unknown,
  limits: InspectionLimits,
): GraphAnalysisResult {
  const circularPaths: CircularPathInfo[] = [];
  const errors: InspectionError[] = [];
  const topLevelEntries: EntryInfo[] = [];
  let maxDepth = 0;
  let truncated = false;

  const tracker = new ReferenceTracker();
  const detector = new CircularDetector();

  const stack: StackItem[] = [
    { kind: 'enter', value: rootValue, path: 'root', depth: 0 },
  ];

  while (stack.length > 0) {
    // Non-null assertion safe: we check length above
    const item = stack.pop()!;

    // ── Backtrack: remove from ancestor set ──────────────────────────────────
    if (item.kind === 'leave') {
      detector.leave(item.obj);
      continue;
    }

    const { value, path, depth } = item;

    // Update max depth for every node encountered (objects and primitives)
    if (depth > maxDepth) maxDepth = depth;

    // Skip non-object values (primitives are leaves)
    if (!isObjectLike(value)) continue;
    const obj = value as object;

    // ── Circular check ───────────────────────────────────────────────────────
    // Object is in the current ancestor path → cycle detected
    if (detector.isAncestor(obj)) {
      const firstPath = tracker.getPaths(obj)?.[0] ?? 'root';
      circularPaths.push({ path, targetPath: firstPath });
      tracker.track(obj, path); // Record this additional occurrence
      continue; // Do NOT traverse further — this breaks the cycle
    }

    // ── Repeated ref check ───────────────────────────────────────────────────
    // Object seen at a prior path (but not an ancestor) → repeated ref
    if (tracker.has(obj)) {
      tracker.track(obj, path); // Record additional occurrence
      continue; // Don't re-traverse (already analyzed)
    }

    // ── Reference tracking limit ─────────────────────────────────────────────
    if (tracker.size >= limits.maxReferenceTracking) {
      truncated = true;
      continue;
    }

    // ── First visit ──────────────────────────────────────────────────────────
    tracker.track(obj, path);
    detector.enter(obj);
    // Schedule backtrack BEFORE pushing children, so it runs after them
    stack.push({ kind: 'leave', obj });

    // ── Depth limit ──────────────────────────────────────────────────────────
    if (depth >= limits.maxDepth) {
      truncated = true;
      continue; // Don't expand children
    }

    // ── Type check ───────────────────────────────────────────────────────────
    const type = detectType(obj);
    if (!isTraversableType(type)) continue;

    // ── Read own properties ──────────────────────────────────────────────────
    const isRoot = depth === 0;
    const { keys: keyInfos, errors: keyErrors } = safeReadKeys(
      obj,
      path,
      limits,
    );
    errors.push(...keyErrors);

    // If this object has any properties, those properties exist at depth+1
    if (keyInfos.length > 0 && depth + 1 > maxDepth) {
      maxDepth = depth + 1;
    }

    const childItems: StackItem[] = [];

    for (const keyInfo of keyInfos) {
      const keyStr =
        typeof keyInfo.key === 'symbol'
          ? `[Symbol(${(keyInfo.key as symbol).description ?? ''})]`
          : String(keyInfo.key);
      const childPath = `${path}.${keyStr}`;

      // Build SafeValue for this property (no getter execution)
      const safeVal = safeReadValue(obj, keyInfo.key, childPath, errors);

      // Collect top-level entries (root's direct children)
      if (isRoot) {
        topLevelEntries.push({ key: keyInfo.key, value: safeVal, keyInfo });
      }

      // Queue data-property children for traversal (object-like only)
      if (keyInfo.kind === 'data') {
        let rawChild: unknown;
        try {
          const desc = Object.getOwnPropertyDescriptor(obj, keyInfo.key);
          rawChild = desc?.value;
        } catch {
          continue;
        }
        if (isObjectLike(rawChild)) {
          childItems.push({
            kind: 'enter',
            value: rawChild,
            path: childPath,
            depth: depth + 1,
          });
        }
      }
    }

    // ── Map entries (not own-properties, need special traversal) ─────────────
    if (type === 'map') {
      const map = obj as Map<unknown, unknown>;
      let idx = 0;
      for (const [k, v] of map) {
        if (idx >= limits.maxCollectionEntries) {
          truncated = true;
          break;
        }
        const entryPath = `${path}[map:${idx}]`;
        if (isObjectLike(k)) {
          childItems.push({
            kind: 'enter',
            value: k,
            path: `${entryPath}.key`,
            depth: depth + 1,
          });
        }
        if (isObjectLike(v)) {
          childItems.push({
            kind: 'enter',
            value: v,
            path: `${entryPath}.value`,
            depth: depth + 1,
          });
        }
        idx++;
      }
    }

    // ── Set values (not own-properties, need special traversal) ─────────────
    if (type === 'set') {
      const set = obj as Set<unknown>;
      let idx = 0;
      for (const v of set) {
        if (idx >= limits.maxCollectionEntries) {
          truncated = true;
          break;
        }
        if (isObjectLike(v)) {
          childItems.push({
            kind: 'enter',
            value: v,
            path: `${path}[set:${idx}]`,
            depth: depth + 1,
          });
        }
        idx++;
      }
    }

    // Push children in reverse order so the first child is processed first (DFS)
    for (let i = childItems.length - 1; i >= 0; i--) {
      stack.push(childItems[i]!);
    }
  }

  return {
    maxDepth,
    isCircular: circularPaths.length > 0,
    circularPaths,
    repeatedRefs: tracker.getRepeatedRefs(),
    topLevelEntries,
    errors,
    truncated,
  };
}
