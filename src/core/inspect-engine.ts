/**
 * @fileoverview Core inspection engine.
 *
 * The single entry point for all inspection. Orchestrates:
 *   1. Type detection
 *   2. Graph analysis (single traversal for depth/circular/repeated/entries)
 *   3. Prototype chain extraction
 *   4. Constructor identification
 *   5. Size computation
 *   6. Safe preview generation
 *
 * All public API methods call through this engine and extract the
 * specific slice they need from the returned InspectionResult.
 *
 * PRINCIPLE: Never throws because of the inspected value. All errors
 * from hostile values (Proxy, broken getters, unusual prototypes) are
 * caught and recorded as InspectionError[] in the result.
 */

import type {
  InspectionResult,
  SizeInfo,
  PrototypeInfo,
  ConstructorInfo,
  InspectionError,
  DetectedType,
} from '../models/inspection-result.js';
import { DEFAULT_LIMITS, mergeLimits } from './limits.js';
import type { InspectionLimits } from './limits.js';
import { detectType, isObjectLike } from './type-detector.js';
import { safePrimitivePreview } from './safe-reader.js';
import { analyzeGraph } from './graph-analyzer.js';

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface InspectOptions {
  limits?: Partial<InspectionLimits>;
}

/**
 * Inspect any JavaScript value and return a complete InspectionResult.
 *
 * This is the foundation all public API methods are built on.
 * It must never throw because of the value being inspected.
 *
 * @param value - Any JavaScript value
 * @param options - Optional limit overrides
 */
export function inspect(
  value: unknown,
  options?: InspectOptions,
): InspectionResult {
  const limits: InspectionLimits = options?.limits
    ? mergeLimits(options.limits)
    : DEFAULT_LIMITS;

  const type = detectType(value);
  const safePreview = safePrimitivePreview(
    value,
    limits.maxStringPreviewLength,
  );
  const prototypeInfo = getPrototypeInfo(value);
  const constructorInfo = getConstructorInfo(value);
  const sizeInfo = getSizeInfo(value, type);

  // Non-object values have no graph to analyze
  if (!isObjectLike(value)) {
    return Object.freeze<InspectionResult>({
      type,
      rawValue: value,
      constructorInfo,
      prototypeInfo,
      keys: [],
      size: sizeInfo,
      depth: 0,
      isCircular: false,
      circularPaths: [],
      repeatedRefs: [],
      entries: [],
      safePreview,
      errors: [],
      truncated: false,
    });
  }

  // Analyze the object graph (single traversal)
  const graphResult = analyzeGraph(value, limits);

  // keys = keyInfo for each top-level entry
  const keys = graphResult.topLevelEntries.map((e) => e.keyInfo);

  return Object.freeze<InspectionResult>({
    type,
    rawValue: value,
    constructorInfo,
    prototypeInfo,
    keys,
    size: sizeInfo,
    depth: graphResult.maxDepth,
    isCircular: graphResult.isCircular,
    circularPaths: graphResult.circularPaths,
    repeatedRefs: graphResult.repeatedRefs,
    entries: graphResult.topLevelEntries,
    safePreview,
    errors: graphResult.errors,
    truncated: graphResult.truncated,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Prototype chain
// ─────────────────────────────────────────────────────────────────────────────

function getPrototypeInfo(value: unknown): PrototypeInfo {
  if (!isObjectLike(value)) {
    return { name: null, chain: [], isNullPrototype: false };
  }

  try {
    let proto: object | null;
    try {
      proto = Object.getPrototypeOf(value as object) as object | null;
    } catch {
      return { name: null, chain: [], isNullPrototype: false };
    }

    if (proto === null) {
      return { name: null, chain: [], isNullPrototype: true };
    }

    const chain: string[] = [];
    let current: object | null = proto;

    while (current !== null && chain.length < 20) {
      const name = extractPrototypeName(current);
      chain.push(name);
      try {
        current = Object.getPrototypeOf(current) as object | null;
      } catch {
        break;
      }
    }

    return {
      name: chain[0] ?? null,
      chain,
      isNullPrototype: false,
    };
  } catch {
    return { name: null, chain: [], isNullPrototype: false };
  }
}

function extractPrototypeName(proto: object): string {
  try {
    const ctorDesc = Object.getOwnPropertyDescriptor(proto, 'constructor');
    if (ctorDesc !== undefined && typeof ctorDesc.value === 'function') {
      const fn = ctorDesc.value as { name?: unknown };
      if (typeof fn.name === 'string' && fn.name.length > 0) {
        return fn.name;
      }
    }
  } catch {
    // Ignore
  }
  // Fallback to toString tag
  try {
    const tag = Object.prototype.toString.call(proto);
    const match = /^\[object (.+)\]$/.exec(tag);
    if (match?.[1]) return match[1];
  } catch {
    // Ignore
  }
  return '(unknown)';
}

// ─────────────────────────────────────────────────────────────────────────────
// Constructor identification
// ─────────────────────────────────────────────────────────────────────────────

function getConstructorInfo(value: unknown): ConstructorInfo {
  if (!isObjectLike(value)) {
    return { name: null, isOverridden: false, isSafe: false };
  }

  try {
    let proto: object | null;
    try {
      proto = Object.getPrototypeOf(value as object) as object | null;
    } catch {
      return { name: null, isOverridden: false, isSafe: false };
    }

    if (proto === null) {
      return { name: null, isOverridden: false, isSafe: true };
    }

    // Read constructor from the PROTOTYPE (not from the object directly)
    // This avoids being fooled by an overridden constructor property on the instance
    let ctorName: string | null = null;
    try {
      const ctorDesc = Object.getOwnPropertyDescriptor(proto, 'constructor');
      if (ctorDesc !== undefined && typeof ctorDesc.value === 'function') {
        const fn = ctorDesc.value as { name?: unknown };
        ctorName =
          typeof fn.name === 'string' && fn.name.length > 0 ? fn.name : null;
      }
    } catch {
      // Proxy may throw
    }

    // Check if the object has its own `constructor` property (a potential override)
    let isOverridden = false;
    try {
      isOverridden = Object.prototype.hasOwnProperty.call(
        value as object,
        'constructor',
      );
    } catch {
      // Proxy may throw
    }

    return { name: ctorName, isOverridden, isSafe: true };
  } catch {
    return { name: null, isOverridden: false, isSafe: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Size computation
// ─────────────────────────────────────────────────────────────────────────────

function getSizeInfo(value: unknown, type: DetectedType): SizeInfo {
  try {
    switch (type) {
      case 'string':
        return { kind: 'string-length', value: (value as string).length };

      case 'array':
        return { kind: 'array-length', value: (value as unknown[]).length };

      case 'map':
        return {
          kind: 'collection-size',
          value: (value as Map<unknown, unknown>).size,
        };

      case 'set':
        return {
          kind: 'collection-size',
          value: (value as Set<unknown>).size,
        };

      case 'buffer':
        return { kind: 'byte-length', value: (value as Buffer).byteLength };

      case 'arraybuffer':
        return {
          kind: 'byte-length',
          value: (value as ArrayBuffer).byteLength,
        };

      case 'typedarray':
        return {
          kind: 'byte-length',
          value: (value as { byteLength: number }).byteLength,
        };

      case 'dataview':
        return { kind: 'byte-length', value: (value as DataView).byteLength };

      case 'object':
      case 'null-prototype-object':
      case 'class-instance':
      case 'error':
      case 'date':
      case 'regexp': {
        try {
          // Enumerable own properties — consistent with Object.keys() semantics
          const count = Object.keys(value as object).length;
          return { kind: 'property-count', value: count };
        } catch {
          return { kind: 'none', value: 0 };
        }
      }

      default:
        return { kind: 'none', value: 0 };
    }
  } catch {
    return { kind: 'none', value: 0 };
  }
}

// Re-export InspectionError for internal use by API layer
export type { InspectionError };
