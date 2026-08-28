/**
 * @fileoverview Domain engine for Date, Number, BigInt, and String diagnostics.
 *
 * Includes zero-width / invisible Unicode character detection.
 */

/* eslint-disable no-control-regex */

export function isInvalidDate(val: unknown): boolean {
  if (!(val instanceof Date)) return false;
  return Number.isNaN(val.getTime());
}

export function isWhitespace(str: unknown): boolean {
  if (typeof str !== 'string') return false;
  return str.trim().length === 0 && str.length > 0;
}

/**
 * Detects zero-width and invisible Unicode characters in strings.
 */
export function hasInvisibleChars(str: unknown): boolean {
  if (typeof str !== 'string') return false;
  // Regex for zero-width space, zero-width non-joiner, soft hyphen, BOM, control chars
  const invisiblePattern =
    /[\u200B-\u200D\uFEFF\u00AD\u0000-\u001F\u007F-\u009F]/;
  return invisiblePattern.test(str);
}

export function numberPrecision(num: number): number {
  if (!Number.isFinite(num)) return 0;
  const str = String(num);
  if (str.includes('.')) {
    return str.split('.')[1]!.length;
  }
  return 0;
}
