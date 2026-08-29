/**
 * why-is-this
 *
 * A developer-focused diagnostic toolkit for JavaScript runtime value inspection.
 *
 * PRINCIPLES:
 *   - All APIs return structured data. No console output from core.
 *   - No telemetry. No network calls. No external APIs. Local-only.
 *   - Getter properties are never executed during inspection by default.
 *   - Inspection always terminates, even on circular or hostile objects.
 *   - JavaScript runtime inspection only — erased TypeScript types not reflected.
 *
 * @module why-is-this
 */

export { why } from './api/why.js';
export { why as default } from './api/why.js';
export {
  getDashboardHtml,
  getSinglePageUI,
} from './api-doctor/dashboard/single-page-ui.js';

// ─── Public type exports ────────────────────────────────────────────────────
export type { WhyFunction } from './api/why.js';

export type {
  InspectionResult,
  ExplainResult,
  ExplainFinding,
  CircularResult,
  DetectedType,
  KeyInfo,
  PropertyKind,
  SizeInfo,
  SizeKind,
  SafeValue,
  EntryInfo,
  CircularPathInfo,
  RepeatedRefInfo,
  PrototypeInfo,
  ConstructorInfo,
  InspectionError,
} from './models/inspection-result.js';

export type {
  BaseDiagnosticResult,
  ExpectResult,
  ValidationResult,
  ModifiedEntryInfo,
  DiffResult,
  ReferenceRelationshipResult,
  PropertyPathResult,
  StackFrameInfo,
  ErrorDiagnosticResult,
  FunctionDiagnosticResult,
  PromiseStateResult,
  PerformanceResult,
  MemoryResult,
  ProcessDiagnosticResult,
  SecretScanMatch,
  SecurityDiagnosticResult,
  ReportResult,
} from './models/domain-results.js';

export type { InspectionLimits } from './core/limits.js';
export type { DiagnosticConfig, SecurityConfig } from './core/config.js';

// ─── API Doctor public types ─────────────────────────────────────────────────
export type { ApiDoctorHandle } from './api/api-doctor-facade.js';
export type {
  ApiDoctorOptions,
  StorageOptions,
  RequestRecord,
  EndpointStats,
  LatencyPercentiles,
  DiagnosticFinding,
  DiagnosticSnapshot,
  HealthOverview,
  FindingSeverity,
  FindingKind,
} from './api-doctor/types.js';
