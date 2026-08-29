/**
 * @fileoverview API Doctor — Explanation Engine
 *
 * Composes a full DiagnosticSnapshot from raw request records by:
 *   1. Aggregating per-endpoint statistics
 *   2. Computing health overview
 *   3. Running all anomaly detectors
 *   4. Building the recent request stream
 */

import type { RequestRecord, DiagnosticSnapshot } from '../types.js';
import {
  aggregateEndpoints,
  computeHealthOverview,
  runAllDetectors,
} from './detectors.js';

const MAX_STREAM_RECORDS = 100;

/**
 * Build a complete DiagnosticSnapshot from buffered request records.
 * This is a pure function — no side effects, suitable for testing.
 */
export function buildSnapshot(
  records: readonly RequestRecord[],
  maxRecentPerEndpoint: number = 20
): DiagnosticSnapshot {
  const endpoints = aggregateEndpoints(records, maxRecentPerEndpoint);
  const health = computeHealthOverview(records, endpoints);
  const findings = runAllDetectors(records, endpoints, health.globalP95Ms);

  // Most recent requests for the live stream (newest first)
  const recentStream = records
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, MAX_STREAM_RECORDS);

  return {
    health,
    endpoints,
    findings,
    recentStream,
    generatedAt: new Date().toISOString(),
  };
}
