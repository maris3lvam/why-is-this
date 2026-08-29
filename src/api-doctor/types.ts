/**
 * @fileoverview API Doctor — Core Data Types
 *
 * Defines all shared types used across the API Doctor module:
 *   - RequestRecord: A single captured HTTP request
 *   - EndpointStats: Aggregated stats per route pattern
 *   - DiagnosticFinding: A structured anomaly detected by the engine
 *   - ApiDoctorOptions: Optional configuration for why.api.doctor(app)
 */

// ─── HTTP Request Record ─────────────────────────────────────────────────────

export interface RequestRecord {
  /** Unique ID: e.g. "req-17880123-0001" */
  id: string;
  method: string;
  /** Sanitized route path (e.g. "/api/users/:id") */
  path: string;
  /** ISO timestamp of request start */
  timestamp: string;
  /** Response time in milliseconds */
  durationMs: number;
  statusCode: number;
  /** Request body size in bytes (0 if unknown) */
  reqSizeBytes: number;
  /** Response body size in bytes (0 if unknown) */
  resSizeBytes: number;
  /** Redacted request headers */
  headers: Record<string, string>;
  /** Error info if statusCode >= 400 */
  error?: {
    message: string;
    code?: string;
  };
}

// ─── Endpoint Aggregated Statistics ─────────────────────────────────────────

export interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
}

export interface StatusDistribution {
  [statusCode: string]: number;
}

export interface EndpointStats {
  method: string;
  path: string;
  requestCount: number;
  errorCount: number;
  errorRate: number; // 0–1
  latency: LatencyPercentiles;
  statusDistribution: StatusDistribution;
  /** Last N request records for this endpoint */
  recentRequests: RequestRecord[];
  /** Timestamp of the most recent request */
  lastSeen: string;
}

// ─── Diagnostic Finding ──────────────────────────────────────────────────────

export type FindingSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export type FindingKind =
  | 'HIGH_LATENCY'
  | 'LATENCY_SPIKE'
  | 'ERROR_BURST'
  | 'TRAFFIC_SURGE'
  | 'SLOW_ENDPOINT';

export interface DiagnosticFinding {
  id: string;
  kind: FindingKind;
  severity: FindingSeverity;
  /** Endpoint this finding pertains to (null for global findings) */
  endpoint: string | null;
  /** Short one-line title */
  title: string;
  /** What anomaly was witnessed */
  observed: string;
  /** Empirical bullet-point evidence */
  evidence: string[];
  /** Logical hypothesis explaining the anomaly */
  possibleExplanation: string;
  /** HIGH | MEDIUM | LOW confidence in the finding */
  confidence: FindingSeverity;
  /** Actionable developer next step */
  suggestedInvestigation: string;
  /** When this finding was generated */
  detectedAt: string;
}

// ─── Health Overview ─────────────────────────────────────────────────────────

export interface HealthOverview {
  /** 0–100 composite health score */
  score: number;
  totalRequests: number;
  globalP95Ms: number;
  globalErrorRate: number; // 0–1
  activeEndpoints: number;
}

// ─── Snapshot (full diagnostic state) ───────────────────────────────────────

export interface DiagnosticSnapshot {
  health: HealthOverview;
  endpoints: EndpointStats[];
  findings: DiagnosticFinding[];
  /** Recent request stream (newest first, max 100) */
  recentStream: RequestRecord[];
  /** ISO timestamp of this snapshot */
  generatedAt: string;
}

// ─── API Doctor Options ──────────────────────────────────────────────────────

export interface StorageOptions {
  /**
   * Maximum in-memory storage size for captured requests.
   * Accepts human-readable strings: "100MB" (default), "50MB", "1GB".
   * Must be between 10MB and 1GB.
   */
  maxSize?: string;
  /**
   * If true (default), buffers and IPC connections are released
   * on process exit (SIGINT, SIGTERM, exit events).
   */
  cleanupOnExit?: boolean;
}

export interface ApiDoctorOptions {
  storage?: StorageOptions;
  /**
   * Override the default IPC port used for communication between
   * the monitored app and the npx api-doctor dashboard CLI.
   * Default: 5035 (dashboard listens on 5034, IPC on 5035)
   */
  ipcPort?: number;
  /**
   * Maximum number of recent requests to keep per endpoint.
   * Default: 20
   */
  maxRecentPerEndpoint?: number;
}

// ─── IPC Protocol Messages ───────────────────────────────────────────────────

export type IpcMessageType = 'snapshot' | 'request' | 'finding' | 'ping' | 'pong';

export interface IpcMessage {
  type: IpcMessageType;
  payload: unknown;
  ts: string;
}
