/**
 * @fileoverview The `why` diagnostic platform facade.
 *
 * `why` is simultaneously:
 *   1. A callable function: why(value) → InspectionResult
 *   2. A namespace with all diagnostic domain methods attached as properties
 *
 * PRINCIPLE: Core APIs never write to stdout/stderr.
 * Every method returns structured data. Presentation is the caller's concern.
 */

import type { InspectionResult } from '../models/inspection-result.js';
import { inspect as inspectEngine } from '../core/inspect-engine.js';

// Core Inspection APIs
import { apiInspect } from './inspect.js';
import { apiExplain } from './explain.js';
import { apiDescribe } from './describe.js';
import { apiType } from './type.js';
import { apiValue } from './value.js';
import { apiKeys } from './keys.js';
import { apiValues } from './values.js';
import { apiEntries } from './entries.js';
import { apiSize } from './size.js';
import { apiDepth } from './depth.js';
import { apiPrototype } from './prototype.js';
import { apiConstructor } from './constructor.js';
import { apiReferences } from './references.js';
import { apiCircular } from './circular.js';

// Domain Engines
import * as Equality from '../domains/equality-engine.js';
import * as Diff from '../domains/diff-engine.js';
import * as Property from '../domains/property-engine.js';
import * as Serialization from '../domains/serialization-engine.js';
import * as Primitive from '../domains/primitive-engine.js';
import * as ErrorDomain from '../domains/error-engine.js';
import * as FnDomain from '../domains/function-engine.js';
import * as ProcessDomain from '../domains/process-engine.js';
import * as PerfDomain from '../domains/performance-engine.js';
import * as AsyncDomain from '../domains/async-engine.js';
import * as SecurityDomain from '../domains/security-engine.js';
import * as ReportDomain from '../domains/reporting-engine.js';
import { sessionManager } from '../domains/session-engine.js';
import { globalConfig } from '../core/config.js';

export interface WhyFunction {
  /** Inspect any value. Returns InspectionResult — no side effects. */
  (value: unknown): InspectionResult;

  // ── Core Inspection APIs ───────────────────────────────────────────────────
  inspect: typeof apiInspect;
  explain: typeof apiExplain;
  describe: typeof apiDescribe;
  type: typeof apiType;
  value: typeof apiValue;
  keys: typeof apiKeys;
  values: typeof apiValues;
  entries: typeof apiEntries;
  size: typeof apiSize;
  depth: typeof apiDepth;
  prototype: typeof apiPrototype;
  constructor: typeof apiConstructor;
  references: typeof apiReferences;
  circular: typeof apiCircular;

  // ── Type & Equality ────────────────────────────────────────────────────────
  is: typeof Equality.is;
  same: typeof Equality.same;
  strictEqual: typeof Equality.strictEqual;
  equal: typeof Equality.equal;
  deepEqual: typeof Equality.deepEqual;
  assert: typeof Equality.assert;
  expect: typeof Equality.expectVal;
  valid: typeof Equality.valid;
  invalid: typeof Equality.invalid;
  coerce: typeof Equality.coerce;

  // ── Diff & Comparison ──────────────────────────────────────────────────────
  diff: typeof Diff.diff;
  added: typeof Diff.added;
  removed: typeof Diff.removed;
  modified: typeof Diff.modified;
  changed: typeof Diff.changed;
  unchanged: typeof Diff.unchanged;
  compare: typeof Diff.diff;
  reference: typeof Diff.referenceRelationship;
  snapshot: typeof Diff.snapshot;
  restore: typeof Diff.restore;

  // ── Property & Path Debugging ──────────────────────────────────────────────
  path: typeof Property.resolvePath;
  get: typeof Property.getProp;
  has: typeof Property.hasKey;
  exists: typeof Property.existsPath;
  missing: typeof Property.missingPath;
  undefined: typeof Property.isUndefined;
  null: typeof Property.isNull;
  resolve: typeof Property.resolvePath;
  optional: typeof Property.optionalPath;

  // ── Serialization & JSON ───────────────────────────────────────────────────
  json: typeof Serialization.stringifyCircular;
  parse: typeof Serialization.parseJSON;
  stringify: typeof Serialization.stringifyCircular;
  serialize: typeof Serialization.stringifyCircular;
  serializable: typeof Serialization.isSerializable;
  circularJSON: typeof Serialization.stringifyCircular;
  clone: typeof Serialization.safeClone;

  // ── Primitive Diagnostics ──────────────────────────────────────────────────
  invalidDate: typeof Primitive.isInvalidDate;
  whitespace: typeof Primitive.isWhitespace;
  invisible: typeof Primitive.hasInvisibleChars;
  precision: typeof Primitive.numberPrecision;

  // ── Error Debugging ────────────────────────────────────────────────────────
  error: typeof ErrorDomain.inspectError;
  errors: typeof ErrorDomain.inspectError;
  stack: typeof ErrorDomain.parseStackFrames;
  trace: typeof ErrorDomain.parseStackFrames;
  frames: typeof ErrorDomain.parseStackFrames;
  classify: typeof ErrorDomain.classifyError;
  fingerprint: typeof ErrorDomain.fingerprintError;
  rootCause: typeof ErrorDomain.findRootCause;

  // ── Function Debugging ─────────────────────────────────────────────────────
  function: typeof FnDomain.inspectFunction;
  fn: typeof FnDomain.inspectFunction;
  wrap: typeof FnDomain.wrapFunction;
  unwrap: typeof FnDomain.unwrapFunction;
  callCount: typeof FnDomain.getCallCount;

  // ── Process & System ───────────────────────────────────────────────────────
  process: typeof ProcessDomain.inspectProcess;
  env: typeof ProcessDomain.getRedactedEnv;

  // ── Memory & Performance ───────────────────────────────────────────────────
  memory: typeof PerfDomain.inspectMemory;
  mark: typeof PerfDomain.markTime;
  measure: typeof PerfDomain.measureTime;
  benchmark: typeof PerfDomain.benchmarkFn;

  // ── Async & Promise ────────────────────────────────────────────────────────
  delay: typeof AsyncDomain.delayMs;
  promise: typeof AsyncDomain.inspectPromiseState;
  timeout: typeof AsyncDomain.withTimeout;

  // ── Security & Secrets ─────────────────────────────────────────────────────
  security: typeof SecurityDomain.inspectSecurity;
  secrets: typeof SecurityDomain.scanSecretString;
  mask: typeof SecurityDomain.maskString;
  redact: typeof SecurityDomain.redactObject;

  // ── Reporting & Diagnosis ──────────────────────────────────────────────────
  report: typeof ReportDomain.generateReport;

  // ── Sessions & Configuration ───────────────────────────────────────────────
  session: typeof sessionManager.getEvents;
  configure: typeof globalConfig.configure;
  config: typeof globalConfig.get;
}

function whyBase(value: unknown): InspectionResult {
  return inspectEngine(value);
}

const why: WhyFunction = whyBase as WhyFunction;

// ── Core Inspection APIs ─────────────────────────────────────────────────────
why.inspect = apiInspect;
why.explain = apiExplain;
why.describe = apiDescribe;
why.type = apiType;
why.value = apiValue;
why.keys = apiKeys;
why.values = apiValues;
why.entries = apiEntries;
why.size = apiSize;
why.depth = apiDepth;
why.prototype = apiPrototype;
why.constructor = apiConstructor;
why.references = apiReferences;
why.circular = apiCircular;

// ── Type & Equality ──────────────────────────────────────────────────────────
why.is = Equality.is;
why.same = Equality.same;
why.strictEqual = Equality.strictEqual;
why.equal = Equality.equal;
why.deepEqual = Equality.deepEqual;
why.assert = Equality.assert;
why.expect = Equality.expectVal;
why.valid = Equality.valid;
why.invalid = Equality.invalid;
why.coerce = Equality.coerce;

// ── Diff & Comparison ────────────────────────────────────────────────────────
why.diff = Diff.diff;
why.added = Diff.added;
why.removed = Diff.removed;
why.modified = Diff.modified;
why.changed = Diff.changed;
why.unchanged = Diff.unchanged;
why.compare = Diff.diff;
why.reference = Diff.referenceRelationship;
why.snapshot = Diff.snapshot;
why.restore = Diff.restore;

// ── Property & Path Debugging ────────────────────────────────────────────────
why.path = Property.resolvePath;
why.get = Property.getProp;
why.has = Property.hasKey;
why.exists = Property.existsPath;
why.missing = Property.missingPath;
why.undefined = Property.isUndefined;
why.null = Property.isNull;
why.resolve = Property.resolvePath;
why.optional = Property.optionalPath;

// ── Serialization & JSON ─────────────────────────────────────────────────────
why.json = Serialization.stringifyCircular;
why.parse = Serialization.parseJSON;
why.stringify = Serialization.stringifyCircular;
why.serialize = Serialization.stringifyCircular;
why.serializable = Serialization.isSerializable;
why.circularJSON = Serialization.stringifyCircular;
why.clone = Serialization.safeClone;

// ── Primitive Diagnostics ────────────────────────────────────────────────────
why.invalidDate = Primitive.isInvalidDate;
why.whitespace = Primitive.isWhitespace;
why.invisible = Primitive.hasInvisibleChars;
why.precision = Primitive.numberPrecision;

// ── Error Debugging ──────────────────────────────────────────────────────────
why.error = ErrorDomain.inspectError;
why.errors = ErrorDomain.inspectError;
why.stack = ErrorDomain.parseStackFrames;
why.trace = ErrorDomain.parseStackFrames;
why.frames = ErrorDomain.parseStackFrames;
why.classify = ErrorDomain.classifyError;
why.fingerprint = ErrorDomain.fingerprintError;
why.rootCause = ErrorDomain.findRootCause;

// ── Function Debugging ───────────────────────────────────────────────────────
why.function = FnDomain.inspectFunction;
why.fn = FnDomain.inspectFunction;
why.wrap = FnDomain.wrapFunction;
why.unwrap = FnDomain.unwrapFunction;
why.callCount = FnDomain.getCallCount;

// ── Process & System ─────────────────────────────────────────────────────────
why.process = ProcessDomain.inspectProcess;
why.env = ProcessDomain.getRedactedEnv;

// ── Memory & Performance ─────────────────────────────────────────────────────
why.memory = PerfDomain.inspectMemory;
why.mark = PerfDomain.markTime;
why.measure = PerfDomain.measureTime;
why.benchmark = PerfDomain.benchmarkFn;

// ── Async & Promise ──────────────────────────────────────────────────────────
why.delay = AsyncDomain.delayMs;
why.promise = AsyncDomain.inspectPromiseState;
why.timeout = AsyncDomain.withTimeout;

// ── Security & Secrets ───────────────────────────────────────────────────────
why.security = SecurityDomain.inspectSecurity;
why.secrets = SecurityDomain.scanSecretString;
why.mask = SecurityDomain.maskString;
why.redact = SecurityDomain.redactObject;

// ── Reporting & Diagnosis ────────────────────────────────────────────────────
why.report = ReportDomain.generateReport;

// ── Sessions & Configuration ─────────────────────────────────────────────────
why.session = sessionManager.getEvents.bind(sessionManager);
why.configure = globalConfig.configure.bind(globalConfig);
why.config = globalConfig.get.bind(globalConfig);

export { why };
