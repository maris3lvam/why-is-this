/**
 * @fileoverview Domain engine for object diffing, snapshotting, and identity analysis.
 *
 * Safe against circular graphs and getter accessors.
 */

import type {
  DiffResult,
  EntryInfo,
  ModifiedEntryInfo,
  ReferenceRelationshipResult,
} from '../models/domain-results.js';
import { safeReadKeys, safeReadValue, valueToSafeValue } from '../core/safe-reader.js';
import { DEFAULT_LIMITS } from '../core/limits.js';
import { deepEqual, same } from './equality-engine.js';
import { isObjectLike } from '../core/type-detector.js';

/**
 * Compare two objects and return added, removed, modified, and unchanged entries.
 */
export function diff(a: unknown, b: unknown): DiffResult {
  const timestamp = Date.now();

  if (!isObjectLike(a) || !isObjectLike(b)) {
    const identical = Object.is(a, b);
    return Object.freeze({
      timestamp,
      domain: 'diff',
      success: true,
      added: [],
      removed: [],
      modified: [],
      unchangedCount: identical ? 1 : 0,
      isIdentical: identical,
    });
  }

  const objA = a as object;
  const objB = b as object;

  const { keys: keysA } = safeReadKeys(objA, 'root', DEFAULT_LIMITS);
  const { keys: keysB } = safeReadKeys(objB, 'root', DEFAULT_LIMITS);

  const keysAMap = new Map(keysA.map((k) => [String(k.key), k]));
  const keysBMap = new Map(keysB.map((k) => [String(k.key), k]));

  const added: EntryInfo[] = [];
  const removed: EntryInfo[] = [];
  const modified: ModifiedEntryInfo[] = [];
  let unchangedCount = 0;

  // Process keys in A (removed, modified, unchanged)
  for (const [keyStr, keyInfoA] of keysAMap) {
    const valA = safeReadValue(objA, keyInfoA.key, `root.${keyStr}`, []);
    const keyInfoB = keysBMap.get(keyStr);

    if (!keyInfoB) {
      removed.push({ key: keyInfoA.key, value: valA, keyInfo: keyInfoA });
      continue;
    }

    const valB = safeReadValue(objB, keyInfoB.key, `root.${keyStr}`, []);

    // Check if values match
    const isValEqual = deepEqual(valA, valB);
    if (isValEqual) {
      unchangedCount++;
    } else {
      modified.push({
        key: keyInfoA.key,
        oldValue: valA,
        newValue: valB,
        keyInfo: keyInfoA,
      });
    }
  }

  // Process keys only in B (added)
  for (const [keyStr, keyInfoB] of keysBMap) {
    if (!keysAMap.has(keyStr)) {
      const valB = safeReadValue(objB, keyInfoB.key, `root.${keyStr}`, []);
      added.push({ key: keyInfoB.key, value: valB, keyInfo: keyInfoB });
    }
  }

  const isIdentical = removed.length === 0 && added.length === 0 && modified.length === 0;

  return Object.freeze({
    timestamp,
    domain: 'diff',
    success: true,
    added: Object.freeze(added),
    removed: Object.freeze(removed),
    modified: Object.freeze(modified),
    unchangedCount,
    isIdentical,
  });
}

export function added(a: unknown, b: unknown): readonly EntryInfo[] {
  return diff(a, b).added;
}

export function removed(a: unknown, b: unknown): readonly EntryInfo[] {
  return diff(a, b).removed;
}

export function modified(a: unknown, b: unknown): readonly ModifiedEntryInfo[] {
  return diff(a, b).modified;
}

export function changed(a: unknown, b: unknown): boolean {
  return !diff(a, b).isIdentical;
}

export function unchanged(a: unknown, b: unknown): boolean {
  return diff(a, b).isIdentical;
}

export function referenceRelationship(a: unknown, b: unknown): ReferenceRelationshipResult {
  const timestamp = Date.now();
  if (same(a, b)) {
    return Object.freeze({
      timestamp,
      domain: 'reference',
      success: true,
      relationship: 'same-reference',
      details: 'Identical object reference',
    });
  }
  return Object.freeze({
    timestamp,
    domain: 'reference',
    success: true,
    relationship: 'different-reference',
    details: 'Distinct object references',
  });
}

/**
 * Create a safe bounded snapshot clone of an object.
 */
export function snapshot(val: unknown): unknown {
  try {
    if (!isObjectLike(val)) return val;
    return JSON.parse(JSON.stringify(val));
  } catch {
    return valueToSafeValue(val);
  }
}

/**
 * Restores a value from a safe snapshot if valid.
 */
export function restore(snap: unknown): unknown {
  return snap;
}
