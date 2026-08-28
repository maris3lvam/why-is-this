/**
 * @fileoverview Configurable traversal limits for the inspection engine.
 *
 * Conservative defaults prevent accidental runaway inspection of large
 * or pathological object graphs. All limits are configurable internally.
 */

export interface InspectionLimits {
  /** Maximum nesting depth to traverse. Default: 10 */
  readonly maxDepth: number;
  /** Maximum own properties to inspect per object. Default: 200 */
  readonly maxProperties: number;
  /** Maximum entries to iterate in Maps, Sets, and Arrays. Default: 100 */
  readonly maxCollectionEntries: number;
  /** Maximum total distinct objects tracked for reference analysis. Default: 500 */
  readonly maxReferenceTracking: number;
  /** Maximum characters in a safe string preview. Default: 256 */
  readonly maxStringPreviewLength: number;
}

export const DEFAULT_LIMITS: Readonly<InspectionLimits> = Object.freeze({
  maxDepth: 10,
  maxProperties: 200,
  maxCollectionEntries: 100,
  maxReferenceTracking: 500,
  maxStringPreviewLength: 256,
});

/**
 * Merge user-provided limit overrides with the defaults.
 * Returns a new frozen limits object.
 */
export function mergeLimits(
  overrides: Partial<InspectionLimits>,
): InspectionLimits {
  return Object.freeze({
    maxDepth: overrides.maxDepth ?? DEFAULT_LIMITS.maxDepth,
    maxProperties: overrides.maxProperties ?? DEFAULT_LIMITS.maxProperties,
    maxCollectionEntries:
      overrides.maxCollectionEntries ?? DEFAULT_LIMITS.maxCollectionEntries,
    maxReferenceTracking:
      overrides.maxReferenceTracking ?? DEFAULT_LIMITS.maxReferenceTracking,
    maxStringPreviewLength:
      overrides.maxStringPreviewLength ?? DEFAULT_LIMITS.maxStringPreviewLength,
  });
}
