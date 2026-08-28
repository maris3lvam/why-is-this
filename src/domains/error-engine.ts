/**
 * @fileoverview Domain engine for structured Error inspection and stack parsing.
 *
 * Safe against circular cause chains. Parses standard Node.js V8 stack traces.
 */

import type {
  ErrorDiagnosticResult,
  StackFrameInfo,
} from '../models/domain-results.js';
import { safeReadKeys, safeReadValue } from '../core/safe-reader.js';
import { DEFAULT_LIMITS } from '../core/limits.js';

/**
 * Parses a V8 stack trace string into structured StackFrameInfo items.
 */
export function parseStackFrames(
  stackStr: string | undefined,
): StackFrameInfo[] {
  if (!stackStr || typeof stackStr !== 'string') return [];

  const lines = stackStr.split('\n');
  const frames: StackFrameInfo[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('at ')) continue;

    // Pattern matching: "at fnName (fileName:line:col)" or "at fileName:line:col"
    const matchWithFn = /^at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)$/.exec(trimmed);
    if (matchWithFn) {
      frames.push({
        functionName: matchWithFn[1]!,
        fileName: matchWithFn[2]!,
        lineNumber: parseInt(matchWithFn[3]!, 10),
        columnNumber: parseInt(matchWithFn[4]!, 10),
        isNative:
          matchWithFn[2] === 'native' || matchWithFn[2]!.includes('node:'),
      });
      continue;
    }

    const matchNoFn = /^at\s+(.+?):(\d+):(\d+)$/.exec(trimmed);
    if (matchNoFn) {
      frames.push({
        functionName: '(anonymous)',
        fileName: matchNoFn[1]!,
        lineNumber: parseInt(matchNoFn[2]!, 10),
        columnNumber: parseInt(matchNoFn[3]!, 10),
        isNative: matchNoFn[1] === 'native' || matchNoFn[1]!.includes('node:'),
      });
    }
  }

  return frames;
}

/**
 * Classifies error category based on error type name and inheritance.
 */
export function classifyError(
  err: Error,
): 'Type' | 'Syntax' | 'Network' | 'System' | 'Custom' {
  const name = err.name || 'Error';
  if (name.includes('Type')) return 'Type';
  if (name.includes('Syntax')) return 'Syntax';
  if (
    name.includes('Network') ||
    name.includes('Fetch') ||
    name.includes('HTTP')
  )
    return 'Network';
  if (name.includes('System') || name.includes('SystemError') || 'code' in err)
    return 'System';
  return 'Custom';
}

/**
 * Computes a deterministic fingerprint string for an Error.
 */
export function fingerprintError(
  err: Error,
  topFrame?: StackFrameInfo,
): string {
  const name = err.name || 'Error';
  const loc = topFrame
    ? `${topFrame.fileName}:${topFrame.lineNumber}`
    : 'unknown';
  return `${name}:${loc}:${err.message.slice(0, 30)}`;
}

/**
 * Performs complete, safe inspection of an Error object.
 */
export function inspectError(
  err: unknown,
  seen = new Set<object>(),
): ErrorDiagnosticResult {
  const timestamp = Date.now();

  if (!(err instanceof Error)) {
    return Object.freeze({
      timestamp,
      domain: 'error',
      success: false,
      name:
        typeof err === 'object' && err !== null
          ? (err as object).constructor.name
          : typeof err,
      message: String(err),
      stackFrames: [],
      causeChain: [],
      fingerprint: `NonError:${String(err)}`,
      category: 'Custom',
      customProperties: [],
    });
  }

  if (seen.has(err)) {
    return Object.freeze({
      timestamp,
      domain: 'error',
      success: true,
      name: err.name,
      message: '[Circular Error Cause]',
      stackFrames: [],
      causeChain: [],
      fingerprint: `CircularError:${err.name}`,
      category: 'Custom',
      customProperties: [],
    });
  }
  seen.add(err);

  const frames = parseStackFrames(err.stack);
  const category = classifyError(err);
  const fingerprint = fingerprintError(err, frames[0]);

  // Inspect cause chain safely
  const causeChain: ErrorDiagnosticResult[] = [];
  if ('cause' in err && err.cause !== undefined) {
    causeChain.push(inspectError(err.cause, seen));
  }

  // Custom properties (excluding standard name, message, stack, cause)
  const { keys } = safeReadKeys(err, 'root', DEFAULT_LIMITS);
  const customProps = keys
    .filter(
      (k) =>
        k.key !== 'name' &&
        k.key !== 'message' &&
        k.key !== 'stack' &&
        k.key !== 'cause',
    )
    .map((k) => ({
      key: k.key,
      value: safeReadValue(err, k.key, `root.${String(k.key)}`, []),
      keyInfo: k,
    }));

  return Object.freeze({
    timestamp,
    domain: 'error',
    success: true,
    name: err.name || 'Error',
    message: err.message || '',
    stackFrames: Object.freeze(frames),
    causeChain: Object.freeze(causeChain),
    fingerprint,
    category,
    customProperties: Object.freeze(customProps),
  });
}

/**
 * Finds the deepest reachable cause in an error cause chain.
 */
export function findRootCause(err: unknown): ErrorDiagnosticResult {
  const result = inspectError(err);
  let current = result;
  while (current.causeChain.length > 0) {
    current = current.causeChain[0]!;
  }
  return current;
}
