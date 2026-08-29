/**
 * @fileoverview API Doctor — Anomaly Detectors
 *
 * Statistical aggregators and anomaly detection algorithms.
 * Computes P50/P95/P99 latencies, error rates, and status distributions
 * across endpoint groups, then detects anomalies.
 */

import type {
  RequestRecord,
  EndpointStats,
  DiagnosticFinding,
  FindingSeverity,
  HealthOverview,
} from '../types.js';

// ─── Percentile Calculation ───────────────────────────────────────────────────

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0]!;
  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))]!;
}

// ─── Endpoint Stats Aggregation ───────────────────────────────────────────────

/**
 * Aggregate a flat list of RequestRecords into per-endpoint statistics.
 * Endpoint key = "METHOD /path" (e.g. "GET /api/users")
 */
export function aggregateEndpoints(
  records: readonly RequestRecord[],
  maxRecentPerEndpoint: number = 20
): EndpointStats[] {
  // Group by endpoint key
  const groups = new Map<string, RequestRecord[]>();

  for (const record of records) {
    const key = `${record.method} ${record.path}`;
    let group = groups.get(key);
    if (!group) {
      group = [];
      groups.set(key, group);
    }
    group.push(record);
  }

  const stats: EndpointStats[] = [];

  for (const [key, groupRecords] of groups.entries()) {
    const [method, ...pathParts] = key.split(' ');
    const path = pathParts.join(' ');

    const durations = groupRecords.map((r) => r.durationMs).sort((a, b) => a - b);
    const errorCount = groupRecords.filter((r) => r.statusCode >= 400).length;
    const errorRate = groupRecords.length > 0 ? errorCount / groupRecords.length : 0;

    const statusDistribution: Record<string, number> = {};
    for (const r of groupRecords) {
      const code = String(r.statusCode);
      statusDistribution[code] = (statusDistribution[code] ?? 0) + 1;
    }

    // Most recent N requests for this endpoint
    const recentRequests = groupRecords
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxRecentPerEndpoint);

    const lastSeen =
      recentRequests[0]?.timestamp ?? groupRecords[groupRecords.length - 1]?.timestamp ?? '';

    stats.push({
      method: method ?? 'GET',
      path,
      requestCount: groupRecords.length,
      errorCount,
      errorRate,
      latency: {
        p50: percentile(durations, 50),
        p95: percentile(durations, 95),
        p99: percentile(durations, 99),
      },
      statusDistribution,
      recentRequests,
      lastSeen,
    });
  }

  // Sort by request count descending
  return stats.sort((a, b) => b.requestCount - a.requestCount);
}

// ─── Health Score ─────────────────────────────────────────────────────────────

export function computeHealthOverview(
  records: readonly RequestRecord[],
  endpointStats: EndpointStats[]
): HealthOverview {
  if (records.length === 0) {
    return {
      score: 100,
      totalRequests: 0,
      globalP95Ms: 0,
      globalErrorRate: 0,
      activeEndpoints: 0,
    };
  }

  const allDurations = records.map((r) => r.durationMs).sort((a, b) => a - b);
  const globalP95Ms = percentile(allDurations, 95);
  const errorCount = records.filter((r) => r.statusCode >= 400).length;
  const globalErrorRate = errorCount / records.length;

  // Health score: start at 100, deduct for latency + errors
  let score = 100;

  // Latency deductions: P95 > 500ms = -10, > 1000ms = -20, > 2000ms = -35
  if (globalP95Ms > 2000) score -= 35;
  else if (globalP95Ms > 1000) score -= 20;
  else if (globalP95Ms > 500) score -= 10;

  // Error rate deductions: >5% = -25, >2% = -15, >0.5% = -5
  if (globalErrorRate > 0.05) score -= 25;
  else if (globalErrorRate > 0.02) score -= 15;
  else if (globalErrorRate > 0.005) score -= 5;

  // Per-endpoint anomaly deductions
  for (const ep of endpointStats) {
    if (ep.latency.p95 > 2000) score -= 5;
    else if (ep.latency.p95 > 1000) score -= 3;
    if (ep.errorRate > 0.1) score -= 5;
    else if (ep.errorRate > 0.02) score -= 2;
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    totalRequests: records.length,
    globalP95Ms: Math.round(globalP95Ms),
    globalErrorRate,
    activeEndpoints: endpointStats.length,
  };
}

// ─── Anomaly Detectors ────────────────────────────────────────────────────────

let _findingCounter = 0;

function makeFindingId(): string {
  _findingCounter++;
  return `finding-${Date.now()}-${String(_findingCounter).padStart(3, '0')}`;
}

/**
 * Detect HIGH LATENCY: endpoint P95 > 500ms or > 1000ms.
 */
export function detectHighLatency(
  stats: EndpointStats[]
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];

  for (const ep of stats) {
    const { p95, p99, p50 } = ep.latency;
    if (ep.requestCount < 5) continue; // not enough data

    if (p95 > 500) {
      const severity: FindingSeverity = p95 > 1000 ? 'HIGH' : 'MEDIUM';
      const endpointLabel = `${ep.method} ${ep.path}`;

      findings.push({
        id: makeFindingId(),
        kind: 'HIGH_LATENCY',
        severity,
        endpoint: endpointLabel,
        title: `High P95 latency on ${endpointLabel}`,
        observed: `P95 latency is ${Math.round(p95)}ms — above the ${p95 > 1000 ? '1s critical' : '500ms warning'} threshold.`,
        evidence: [
          `P50: ${Math.round(p50)}ms`,
          `P95: ${Math.round(p95)}ms`,
          `P99: ${Math.round(p99)}ms`,
          `${ep.requestCount} requests sampled`,
        ],
        possibleExplanation:
          p95 > 1000
            ? 'Likely a slow database query, external service dependency, or CPU-bound processing causing tail latency.'
            : 'Moderate latency — could be normal for data-intensive endpoints, or could indicate an emerging bottleneck.',
        confidence: p95 > 1000 ? 'HIGH' : 'MEDIUM',
        suggestedInvestigation:
          'Profile the route handler: check for missing database indexes, N+1 query patterns, or blocking I/O operations.',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return findings;
}

/**
 * Detect LATENCY SPIKE: endpoint P95 > 3.5× the global P95 average.
 */
export function detectLatencySpike(
  stats: EndpointStats[],
  globalP95Ms: number
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];
  if (globalP95Ms < 50 || stats.length < 2) return findings;

  for (const ep of stats) {
    if (ep.requestCount < 5) continue;
    const ratio = ep.latency.p95 / globalP95Ms;
    if (ratio > 3.5) {
      const endpointLabel = `${ep.method} ${ep.path}`;
      findings.push({
        id: makeFindingId(),
        kind: 'LATENCY_SPIKE',
        severity: ratio > 6 ? 'HIGH' : 'MEDIUM',
        endpoint: endpointLabel,
        title: `Latency spike: ${endpointLabel} is ${ratio.toFixed(1)}× slower than average`,
        observed: `P95 of ${Math.round(ep.latency.p95)}ms is ${ratio.toFixed(1)}× the fleet baseline of ${Math.round(globalP95Ms)}ms.`,
        evidence: [
          `Endpoint P95: ${Math.round(ep.latency.p95)}ms`,
          `Fleet P95 baseline: ${Math.round(globalP95Ms)}ms`,
          `Ratio: ${ratio.toFixed(2)}×`,
          `${ep.requestCount} requests sampled`,
        ],
        possibleExplanation:
          'This endpoint is significantly slower than others. Could be missing cache, heavy computation, lock contention, or an unbounded query.',
        confidence: ratio > 6 ? 'HIGH' : 'MEDIUM',
        suggestedInvestigation:
          'Compare this endpoint to similar ones. Check for missing caching layers, database query plans, or resource locking.',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return findings;
}

/**
 * Detect ERROR BURST: endpoint error rate > 2% or 5xx cluster.
 */
export function detectErrorBurst(
  stats: EndpointStats[]
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [];

  for (const ep of stats) {
    if (ep.requestCount < 5) continue;

    const serverErrors = Object.entries(ep.statusDistribution)
      .filter(([code]) => parseInt(code, 10) >= 500)
      .reduce((sum, [, count]) => sum + count, 0);

    const has5xxCluster = serverErrors > 0;
    const highErrorRate = ep.errorRate > 0.02;

    if (!has5xxCluster && !highErrorRate) continue;

    const severity: FindingSeverity =
      ep.errorRate > 0.1 || serverErrors > 5 ? 'HIGH' : 'MEDIUM';
    const endpointLabel = `${ep.method} ${ep.path}`;
    const errorPct = (ep.errorRate * 100).toFixed(1);

    findings.push({
      id: makeFindingId(),
      kind: 'ERROR_BURST',
      severity,
      endpoint: endpointLabel,
      title: `Error burst on ${endpointLabel} — ${errorPct}% error rate`,
      observed: `${ep.errorCount} of ${ep.requestCount} requests failed (${errorPct}%).`,
      evidence: [
        `Error rate: ${errorPct}%`,
        `Total errors: ${ep.errorCount}`,
        ...Object.entries(ep.statusDistribution)
          .filter(([code]) => parseInt(code, 10) >= 400)
          .map(([code, count]) => `HTTP ${code}: ${count} occurrences`),
      ],
      possibleExplanation:
        has5xxCluster
          ? 'Server-side errors detected — likely an unhandled exception, database connection failure, or dependency timeout.'
          : 'High client error rate — could indicate API contract changes, validation failures, or authentication issues.',
      confidence: severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
      suggestedInvestigation:
        'Inspect application error logs for stack traces correlating with this endpoint and this time window.',
      detectedAt: new Date().toISOString(),
    });
  }

  return findings;
}

/**
 * Detect SLOW ENDPOINT: individual requests taking > 2s.
 */
export function detectSlowEndpoints(
  records: readonly RequestRecord[]
): DiagnosticFinding[] {
  const slowGroups = new Map<string, number>();

  for (const r of records) {
    if (r.durationMs > 2000) {
      const key = `${r.method} ${r.path}`;
      slowGroups.set(key, (slowGroups.get(key) ?? 0) + 1);
    }
  }

  const findings: DiagnosticFinding[] = [];
  for (const [endpoint, count] of slowGroups.entries()) {
    if (count < 3) continue; // At least 3 slow requests required
    findings.push({
      id: makeFindingId(),
      kind: 'SLOW_ENDPOINT',
      severity: count > 10 ? 'HIGH' : 'MEDIUM',
      endpoint,
      title: `${count} requests > 2s on ${endpoint}`,
      observed: `${count} individual requests exceeded the 2-second critical threshold.`,
      evidence: [`${count} requests took > 2000ms`, `Endpoint: ${endpoint}`],
      possibleExplanation:
        'Recurring very slow requests suggest an intermittent bottleneck — possibly a slow external call, occasional lock, or GC pause.',
      confidence: 'MEDIUM',
      suggestedInvestigation:
        'Enable request-level tracing for this endpoint. Look for outlier patterns (specific inputs, time of day, concurrent load).',
      detectedAt: new Date().toISOString(),
    });
  }

  return findings;
}

/**
 * Run all detectors and return a deduplicated, priority-sorted findings list.
 */
export function runAllDetectors(
  records: readonly RequestRecord[],
  stats: EndpointStats[],
  globalP95Ms: number
): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = [
    ...detectErrorBurst(stats),
    ...detectHighLatency(stats),
    ...detectLatencySpike(stats, globalP95Ms),
    ...detectSlowEndpoints(records),
  ];

  // Sort: HIGH first, then MEDIUM, then LOW
  const severityOrder: Record<FindingSeverity, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return findings;
}
