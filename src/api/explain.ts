/**
 * Provides a structured explanation of a value.
 *
 * Returns an ExplainResult with:
 *   - summary:  brief one-line description
 *   - type:     detected type string
 *   - findings: array of structured ExplainFinding objects
 *   - reasons:  human-readable reason strings
 *   - toString(): formatted multi-line output (for REPL / logging)
 *
 * @example
 * const result = why.explain(user);
 * result.summary;    // "Object — properties: 3"
 * result.findings;   // [{ kind: 'type', ... }, { kind: 'circular', ... }]
 * result.toString(); // formatted multi-line string
 */

import type {
  ExplainResult,
  ExplainFinding,
  InspectionResult,
  SizeKind,
} from '../models/inspection-result.js';
import { inspect as inspectEngine } from '../core/inspect-engine.js';

export function apiExplain(value: unknown): ExplainResult {
  const result = inspectEngine(value);
  return buildExplainResult(result);
}

// ─────────────────────────────────────────────────────────────────────────────

function buildExplainResult(result: InspectionResult): ExplainResult {
  const findings: ExplainFinding[] = [];
  const reasons: string[] = [];

  // Type
  findings.push({
    kind: 'type',
    description: `Detected runtime type: ${result.type}`,
    severity: 'info',
  });

  // Circular references
  if (result.isCircular) {
    findings.push({
      kind: 'circular',
      description: `Contains ${result.circularPaths.length} circular reference(s)`,
      severity: 'warning',
    });
    for (const cp of result.circularPaths) {
      reasons.push(`Circular: ${cp.path} → ${cp.targetPath}`);
    }
  }

  // Repeated references (not already flagged as circular)
  const nonCircularRepeated = result.repeatedRefs.filter(
    (r) => r.paths.length >= 2,
  );
  if (nonCircularRepeated.length > 0) {
    findings.push({
      kind: 'repeated-ref',
      description: `${nonCircularRepeated.length} object(s) referenced from multiple paths`,
      severity: 'info',
    });
  }

  // Deep nesting
  if (result.depth > 5) {
    findings.push({
      kind: 'deep',
      description: `Nesting depth is ${result.depth} (consider flattening)`,
      severity: 'warning',
    });
  }

  // Large structure
  if (
    result.size.kind !== 'none' &&
    (result.size.kind === 'property-count' ||
      result.size.kind === 'collection-size' ||
      result.size.kind === 'array-length') &&
    result.size.value > 50
  ) {
    findings.push({
      kind: 'large',
      description: `Has ${result.size.value} ${sizeLabel(result.size.kind)}`,
      severity: 'info',
    });
  }

  // Null prototype
  if (result.prototypeInfo.isNullPrototype) {
    findings.push({
      kind: 'null-proto',
      description: 'Object has null prototype (Object.create(null))',
      severity: 'info',
    });
    reasons.push(
      'Null-prototype objects do not inherit Object.prototype methods (no .toString(), .hasOwnProperty(), etc.)',
    );
  }

  // Boxed primitives
  if (result.type.startsWith('boxed-')) {
    findings.push({
      kind: 'boxed',
      description: `${result.type}: boxed primitives can cause unexpected behavior`,
      severity: 'warning',
    });
    reasons.push(
      `Boxed primitives (new Boolean(), new Number(), new String()) are objects, not primitives. Avoid them.`,
    );
  }

  // Accessor (getter/setter) properties
  const accessorCount = result.keys.filter((k) => k.kind === 'accessor').length;
  if (accessorCount > 0) {
    findings.push({
      kind: 'accessor',
      description: `${accessorCount} accessor property(ies) — values not evaluated`,
      severity: 'info',
    });
    reasons.push(
      'Getter properties are intentionally not invoked during inspection to prevent side effects.',
    );
  }

  // Truncated traversal
  if (result.truncated) {
    findings.push({
      kind: 'truncated',
      description: 'Traversal stopped early — configured limits reached',
      severity: 'caution',
    });
    reasons.push(
      'Some nested values may not be fully analyzed. Adjust limits if needed.',
    );
  }

  // Inspection errors
  if (result.errors.length > 0) {
    findings.push({
      kind: 'error',
      description: `${result.errors.length} non-fatal error(s) during inspection`,
      severity: 'caution',
    });
  }

  // Build summary
  let summary = capitalize(result.type);
  if (result.size.kind !== 'none') {
    summary += ` — ${sizeLabel(result.size.kind)}: ${result.size.value}`;
  }
  if (result.isCircular) summary += ' — ⚠ circular';
  if (result.truncated) summary += ' — ⚠ truncated';

  const explainResult: ExplainResult = {
    summary,
    type: result.type,
    findings: Object.freeze([...findings]),
    reasons: Object.freeze([...reasons]),
    toString() {
      return formatExplain(this);
    },
  };

  return Object.freeze(explainResult);
}

function formatExplain(result: ExplainResult): string {
  const lines: string[] = [
    `Summary : ${result.summary}`,
    `Type    : ${result.type}`,
    '',
    'Findings:',
  ];
  for (const f of result.findings) {
    lines.push(`  [${f.severity.toUpperCase().padEnd(7)}] ${f.description}`);
  }
  if (result.reasons.length > 0) {
    lines.push('', 'Reasons:');
    for (const r of result.reasons) {
      lines.push(`  • ${r}`);
    }
  }
  return lines.join('\n');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function sizeLabel(kind: SizeKind): string {
  switch (kind) {
    case 'property-count':
      return 'properties';
    case 'byte-length':
      return 'bytes';
    case 'collection-size':
      return 'entries';
    case 'string-length':
      return 'characters';
    case 'array-length':
      return 'elements';
    case 'none':
      return 'size';
  }
}
