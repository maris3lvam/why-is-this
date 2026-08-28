/**
 * @fileoverview Domain result interfaces across the why-is-this diagnostic suite.
 *
 * All domain engines return structured, strongly typed, frozen models.
 */

import type { EntryInfo, KeyInfo, SafeValue } from './inspection-result.js';
export type { EntryInfo };

// ─── Base Result ─────────────────────────────────────────────────────────────

export interface BaseDiagnosticResult {
  readonly timestamp: number;
  readonly domain: string;
  readonly success: boolean;
}

// ─── Type & Equality ─────────────────────────────────────────────────────────

export interface ExpectResult extends BaseDiagnosticResult {
  readonly pass: boolean;
  readonly expected: unknown;
  readonly actual: unknown;
  readonly message: string;
  readonly difference?: string | undefined;
}

export interface ValidationResult extends BaseDiagnosticResult {
  readonly valid: boolean;
  readonly reason?: string | undefined;
  readonly path?: string | undefined;
}

// ─── Diff & Comparison ───────────────────────────────────────────────────────

export interface ModifiedEntryInfo {
  readonly key: string | symbol;
  readonly oldValue: SafeValue;
  readonly newValue: SafeValue;
  readonly keyInfo: KeyInfo;
}

export interface DiffResult extends BaseDiagnosticResult {
  readonly added: readonly EntryInfo[];
  readonly removed: readonly EntryInfo[];
  readonly modified: readonly ModifiedEntryInfo[];
  readonly unchangedCount: number;
  readonly isIdentical: boolean;
}

export interface ReferenceRelationshipResult extends BaseDiagnosticResult {
  readonly relationship:
    | 'same-reference'
    | 'different-reference'
    | 'shared-child'
    | 'ancestor-reference'
    | 'circular-reference';
  readonly details: string;
}

// ─── Property Debugging ──────────────────────────────────────────────────────

export interface PropertyPathResult extends BaseDiagnosticResult {
  readonly path: string;
  readonly exists: boolean;
  readonly value: SafeValue;
  readonly failureReason?: string | undefined;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export interface StackFrameInfo {
  readonly functionName: string;
  readonly fileName: string | null;
  readonly lineNumber: number | null;
  readonly columnNumber: number | null;
  readonly isNative: boolean;
}

export interface ErrorDiagnosticResult extends BaseDiagnosticResult {
  readonly name: string;
  readonly message: string;
  readonly stackFrames: readonly StackFrameInfo[];
  readonly causeChain: readonly ErrorDiagnosticResult[];
  readonly fingerprint: string;
  readonly category: 'Type' | 'Syntax' | 'Network' | 'System' | 'Custom';
  readonly customProperties: readonly EntryInfo[];
}

// ─── Function Debugging ─────────────────────────────────────────────────────

export interface FunctionDiagnosticResult extends BaseDiagnosticResult {
  readonly name: string;
  readonly length: number;
  readonly isAsync: boolean;
  readonly isGenerator: boolean;
  readonly isArrow: boolean;
  readonly callCount?: number | undefined;
  readonly durationMs?: number | undefined;
}

// ─── Async / Promise ─────────────────────────────────────────────────────────

export interface PromiseStateResult extends BaseDiagnosticResult {
  readonly state: 'pending' | 'fulfilled' | 'rejected' | 'unknown';
  readonly value?: SafeValue;
  readonly reason?: SafeValue;
}

// ─── Performance & Benchmarking ──────────────────────────────────────────────

export interface PerformanceResult extends BaseDiagnosticResult {
  readonly durationMs: number;
  readonly opsPerSec?: number;
  readonly p50Ms?: number;
  readonly p95Ms?: number;
  readonly p99Ms?: number;
  readonly iterations?: number;
}

// ─── Memory & Heap ───────────────────────────────────────────────────────────

export interface MemoryResult extends BaseDiagnosticResult {
  readonly heapUsedBytes: number;
  readonly heapTotalBytes: number;
  readonly rssBytes: number;
  readonly externalBytes: number;
  readonly arrayBuffersBytes: number;
}

// ─── Process & System ────────────────────────────────────────────────────────

export interface ProcessDiagnosticResult extends BaseDiagnosticResult {
  readonly pid: number;
  readonly ppid: number;
  readonly platform: string;
  readonly arch: string;
  readonly nodeVersion: string;
  readonly uptimeSeconds: number;
  readonly cwd: string;
  readonly execPath: string;
  readonly env: Record<string, string>;
}

// ─── Security & Secrets ──────────────────────────────────────────────────────

export interface SecretScanMatch {
  readonly patternName: string;
  readonly path: string;
  readonly maskedValue: string;
}

export interface SecurityDiagnosticResult extends BaseDiagnosticResult {
  readonly safe: boolean;
  readonly secretsFound: readonly SecretScanMatch[];
  readonly redactedValue: unknown;
}

// ─── Reporting & SARIF ───────────────────────────────────────────────────────

export interface ReportResult extends BaseDiagnosticResult {
  readonly summary: string;
  readonly findings: readonly string[];
  toMarkdown(): string;
  toJSON(): string;
  toSARIF(): Record<string, unknown>;
}
