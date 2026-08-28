/**
 * @fileoverview Core inspection result model.
 *
 * Defines every data structure returned by the inspection engine.
 * All types are:
 *   - independent of any presentation or formatting concern
 *   - serializable where safe
 *   - runtime-based (no TypeScript type erasure claims)
 *   - extensible via optional fields in future minor versions
 *
 * DESIGN PRINCIPLES:
 *   - All fields readonly — prevent accidental mutation
 *   - No ANSI, no terminal formatting, no DOM references
 *   - No network calls, no telemetry
 *   - New optional fields may be added without breaking consumers
 */

// ─────────────────────────────────────────────────────────────────────────────
// Type Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All type categories the inspection engine can identify.
 *
 * This is an exhaustive string literal union. New values may be added
 * in future minor versions — consumers should handle `default` branches
 * in switch statements to remain forward-compatible.
 *
 * NOTE: These are JavaScript *runtime* types, not TypeScript compile-time
 * types. Erased TypeScript types/interfaces are not reflected here.
 */
export type DetectedType =
  // Primitives
  | 'undefined'
  | 'null'
  | 'boolean'
  | 'number'
  | 'bigint'
  | 'string'
  | 'symbol'
  // Functions (all share typeof === 'function')
  | 'function'
  | 'async-function'
  | 'generator-function'
  | 'async-generator-function'
  // Objects — arrays and collections
  | 'array'
  | 'map'
  | 'set'
  | 'weakmap'
  | 'weakset'
  // Objects — built-ins
  | 'date'
  | 'regexp'
  | 'error'
  | 'promise'
  // Objects — binary / typed
  | 'buffer' // Node.js Buffer
  | 'arraybuffer'
  | 'typedarray' // Int8Array, Uint8Array, Float64Array, etc.
  | 'dataview'
  // Objects — boxed primitives (new Boolean(), new Number(), etc.)
  | 'boxed-boolean'
  | 'boxed-number'
  | 'boxed-string'
  | 'boxed-symbol'
  // Objects — generators/async (instances, not functions)
  | 'generator'
  | 'async-generator'
  // Objects — structural
  | 'object' // plain object (prototype === Object.prototype)
  | 'null-prototype-object' // Object.create(null)
  | 'class-instance'; // custom class instance

// ─────────────────────────────────────────────────────────────────────────────
// Property / Key Information
// ─────────────────────────────────────────────────────────────────────────────

/** Whether a property is a data property or an accessor (getter/setter). */
export type PropertyKind = 'data' | 'accessor' | 'unknown';

/** Metadata about a single property key on an inspected object. */
export interface KeyInfo {
  readonly key: string | symbol;
  readonly enumerable: boolean;
  /** null for accessor properties — they have no writable attribute */
  readonly writable: boolean | null;
  readonly configurable: boolean;
  readonly kind: PropertyKind;
}

// ─────────────────────────────────────────────────────────────────────────────
// Size
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The semantic kind of size measurement.
 * Distinguishes property count from byte length from collection size.
 */
export type SizeKind =
  | 'property-count' // number of own enumerable properties (objects)
  | 'byte-length' // byte size (Buffer, ArrayBuffer, TypedArray, DataView)
  | 'collection-size' // Map.size or Set.size
  | 'string-length' // string character count
  | 'array-length' // array .length
  | 'none'; // primitives, functions, WeakMap, WeakSet, etc.

/** A size measurement with semantic context. */
export interface SizeInfo {
  readonly kind: SizeKind;
  readonly value: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reference Tracking
// ─────────────────────────────────────────────────────────────────────────────

/** A detected circular reference with path information. */
export interface CircularPathInfo {
  /** The path at which the circular reference was encountered. */
  readonly path: string;
  /** The path of the ancestor that this reference points back to. */
  readonly targetPath: string;
}

/**
 * A group of paths that all reference the same object identity.
 * Always has at least 2 paths (otherwise it is not "repeated").
 */
export interface RepeatedRefInfo {
  readonly paths: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe Value Representation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A safe representation of a property value.
 *
 * This discriminated union guarantees that inspection never accidentally
 * evaluates getters, calls valueOf(), calls toString(), or invokes any
 * user-defined code.
 *
 * 'accessor' is returned when a property has a getter/setter and we
 * intentionally refuse to evaluate it.
 */
export type SafeValue =
  | {
      readonly kind: 'primitive';
      readonly value: string | number | boolean | null | undefined;
    }
  | { readonly kind: 'bigint'; readonly value: bigint }
  | { readonly kind: 'symbol'; readonly description: string | undefined }
  | {
      readonly kind: 'object';
      readonly type: DetectedType;
      readonly preview: string;
    }
  | {
      readonly kind: 'function';
      readonly name: string | undefined;
      readonly functionKind: DetectedType;
    }
  | {
      /** Property has a getter/setter — value intentionally NOT evaluated. */
      readonly kind: 'accessor';
      readonly evaluated: false;
    }
  | { readonly kind: 'unreadable'; readonly reason: string };

// ─────────────────────────────────────────────────────────────────────────────
// Entry
// ─────────────────────────────────────────────────────────────────────────────

/** A property entry — key metadata + safe value. */
export interface EntryInfo {
  readonly key: string | symbol;
  readonly value: SafeValue;
  readonly keyInfo: KeyInfo;
}

// ─────────────────────────────────────────────────────────────────────────────
// Prototype & Constructor
// ─────────────────────────────────────────────────────────────────────────────

/** Information about a value's prototype chain. */
export interface PrototypeInfo {
  /** Name of the immediate prototype, or null if not determinable. */
  readonly name: string | null;
  /** Full prototype chain names, nearest to farthest. */
  readonly chain: readonly string[];
  /** True if the immediate prototype is null (e.g. Object.create(null)). */
  readonly isNullPrototype: boolean;
}

/** Information about a value's constructor. */
export interface ConstructorInfo {
  /** The constructor function name, or null if not determinable. */
  readonly name: string | null;
  /**
   * True if the object has its own `constructor` property that
   * shadows the one on its prototype.
   */
  readonly isOverridden: boolean;
  /** True if the constructor was safely accessible. */
  readonly isSafe: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inspection Errors (non-fatal)
// ─────────────────────────────────────────────────────────────────────────────

/** Describes a non-fatal error that occurred during inspection. */
export interface InspectionError {
  readonly message: string;
  readonly path: string;
  readonly kind:
    | 'getter-error'
    | 'descriptor-error'
    | 'proxy-error'
    | 'traversal-error'
    | 'unknown-error';
}

// ─────────────────────────────────────────────────────────────────────────────
// Core Inspection Result
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The complete result of inspecting a value.
 *
 * Produced by the inspection engine and consumed by all public API methods.
 * It is independent of any presentation layer.
 *
 * BACKWARD COMPATIBILITY: New optional fields may be added in future minor
 * versions. Consumers should not rely on the exact set of keys.
 */
export interface InspectionResult {
  /** The detected runtime type category. */
  readonly type: DetectedType;
  /**
   * The original value reference.
   * Not cloned, not modified. May be circular.
   */
  readonly rawValue: unknown;
  /** Constructor metadata (meaningful for object-like values). */
  readonly constructorInfo: ConstructorInfo;
  /** Prototype chain metadata (meaningful for object-like values). */
  readonly prototypeInfo: PrototypeInfo;
  /** Metadata for all own properties of the root value. */
  readonly keys: readonly KeyInfo[];
  /** Size information (semantic depends on type — see SizeKind). */
  readonly size: SizeInfo;
  /** Maximum nesting depth found during traversal. */
  readonly depth: number;
  /** True if any circular reference was detected. */
  readonly isCircular: boolean;
  /** All detected circular reference paths. */
  readonly circularPaths: readonly CircularPathInfo[];
  /** Objects that appear at 2+ distinct paths in the structure. */
  readonly repeatedRefs: readonly RepeatedRefInfo[];
  /** Top-level own-property entries with safe values. */
  readonly entries: readonly EntryInfo[];
  /** A safe, bounded string preview (no getter execution). */
  readonly safePreview: string;
  /** Non-fatal errors encountered during inspection. */
  readonly errors: readonly InspectionError[];
  /** True if traversal stopped early due to configured limits. */
  readonly truncated: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Explain Result
// ─────────────────────────────────────────────────────────────────────────────

/** A single notable finding from why.explain(). */
export interface ExplainFinding {
  readonly kind:
    | 'type'
    | 'circular'
    | 'repeated-ref'
    | 'deep'
    | 'large'
    | 'null-proto'
    | 'getter'
    | 'boxed'
    | 'truncated'
    | 'error'
    | 'accessor';
  readonly description: string;
  readonly severity: 'info' | 'warning' | 'caution';
}

/**
 * Structured explanation of a value.
 *
 * Returned by why.explain(). Contains machine-readable findings AND a
 * human-readable toString() for REPL/logging use.
 *
 * @example
 * const result = why.explain(user);
 * result.summary;    // brief string
 * result.findings;   // structured array
 * result.reasons;    // human-readable string array
 * result.toString(); // formatted multi-line output
 */
export interface ExplainResult {
  readonly summary: string;
  readonly type: DetectedType;
  readonly findings: readonly ExplainFinding[];
  readonly reasons: readonly string[];
  toString(): string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Circular Result
// ─────────────────────────────────────────────────────────────────────────────

/** The result of a circular reference check (why.circular()). */
export interface CircularResult {
  readonly isCircular: boolean;
  readonly paths: readonly CircularPathInfo[];
}
