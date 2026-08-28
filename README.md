# @debuglab/why-is-this

<div align="center">

# `why-is-this`

**Developer-focused diagnostic platform for JavaScript runtime inspection & Node.js debugging.**

[![npm version](https://img.shields.io/npm/v/@debuglab/why-is-this.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/@debuglab/why-is-this)
[![license](https://img.shields.io/npm/l/@debuglab/why-is-this.svg?style=flat-square&color=green)](https://opensource.org/licenses/MIT)
[![node version](https://img.shields.io/node/v/@debuglab/why-is-this.svg?style=flat-square)](https://nodejs.org)
[![types](https://img.shields.io/badge/types-TypeScript-blue.svg?style=flat-square)](https://www.typescriptlang.org)
[![build status](https://img.shields.io/badge/build-passing-brightgreen.svg?style=flat-square)](#)

*Answer the core question: **What is this value, what is unusual about it, and why might it be behaving this way?***

</div>

---

## 📋 Table of Contents

- [Why `why-is-this`?](#-why-why-is-this)
- [Key Features](#-key-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Core Concepts & Code Examples](#-core-concepts--code-examples)
  - [1. Diagnostic Inspection & Explanation](#1-diagnostic-inspection--explanation)
  - [2. Safe Object Diffing & Snapshots](#2-safe-object-diffing--snapshots)
  - [3. Getter-Safe Property Path Access](#3-getter-safe-property-path-access)
  - [4. Circular-Safe JSON Serialization](#4-circular-safe-json-serialization)
  - [5. Secret Scanning & Automatic Redaction](#5-secret-scanning--automatic-redaction)
  - [6. High-Resolution Benchmarking & Performance](#6-high-resolution-benchmarking--performance)
  - [7. Error Stack Parsing & Root Cause Analysis](#7-error-stack-parsing--root-cause-analysis)
  - [8. Markdown & SARIF Report Generation](#8-markdown--sarif-report-generation)
- [Complete API Reference](#-complete-api-reference)
- [Security & Design Invariants](#-security--design-invariants)
- [License](#-license)

---

## ❓ Why `why-is-this`?

Standard JavaScript tools (`console.log`, `typeof`, `JSON.stringify`) often fail when debugging complex runtime data:
- `typeof null` returns `"object"` (a 30-year-old JavaScript quirk).
- `JSON.stringify(circularObj)` throws `TypeError: Converting circular structure to JSON`.
- Inspecting objects with `getter` accessors can trigger unintended side effects, database queries, or runtime crashes.
- Logs frequently leak sensitive credentials, AWS keys, or Bearer tokens.

`why-is-this` provides a **side-effect-free, getter-safe, offline diagnostic platform** designed for Node.js maintainers and application developers.

---

## ✨ Key Features

- 🛡️ **Getter-Safe Guarantee**: Never automatically evaluates property accessors (`get`/`set`), preventing accidental side effects or crashes during inspection.
- 🔄 **Circular-Aware Traversal**: Bounded iterative DFS engine that handles cycle back-edges and deep object comparison without call-stack recursion limit issues.
- 🎯 **28-Type Runtime Classifier**: Accurately classifies primitives, Node.js `Buffer`, `TypedArray`, `DataView`, async/generator functions, and `null`-prototype objects.
- 🔒 **Secret Redaction**: Automatic masking of sensitive environment variables (`PASS`, `TOKEN`, `KEY`) and HTTP headers (`Authorization`, `Cookie`).
- 📊 **SARIF & Markdown Reports**: Export structured static diagnostic findings into SARIF (v2.1.0) and Markdown formats for CI/CD pipelines.
- 🤫 **Silent Core**: Zero implicit `console.log` calls or network activity. Pure structured diagnostic data.

---

## 📦 Installation

```bash
npm install @debuglab/why-is-this
```

Works out of the box with **TypeScript**, **ESM**, and **CommonJS** in Node.js >= 18.0.0.

---

## 🚀 Quick Start

```ts
import why from '@debuglab/why-is-this';

const user = {
  id: 101,
  name: 'Alice',
  settings: Object.create(null),
};
user.self = user; // Circular reference loop!

// 1. Silent Inspection Result
const res = why(user);
console.log(res.isCircular); // true
console.log(res.type);       // 'object'

// 2. Single-line Description
console.log(why.describe(user));
// "Object with 4 properties — Depth: 1 — ⚠ Contains circular reference"

// 3. Human-Readable Structured Explanation
console.log(why.explain(user).toString());
```

---

## 💡 Core Concepts & Code Examples

### 1. Diagnostic Inspection & Explanation

Inspect values to discover structural anomalies, deep nesting, or unusual prototypes:

```ts
import why from '@debuglab/why-is-this';

const boxed = new Boolean(false);

const exp = why.explain(boxed);
console.log(exp.findings);
// [{ kind: 'boxed', description: 'boxed-boolean: boxed primitives can cause unexpected behavior', severity: 'warning' }]
```

### 2. Safe Object Diffing & Snapshots

Compare two objects or state snapshots safely without triggering getters or hanging on circular references:

```ts
const prevState = { role: 'user', flags: { beta: false }, items: [1, 2] };
const nextState = { role: 'admin', flags: { beta: true }, items: [1, 2, 3] };

const diff = why.diff(prevState, nextState);
console.log(diff.modified);
// [{ key: 'role', oldValue: { value: 'user' }, newValue: { value: 'admin' } }]

console.log(why.changed(prevState, nextState)); // true
```

### 3. Getter-Safe Property Path Access

Safely resolve nested property paths without risk of triggering getter side effects or `TypeError` crashes on intermediate missing properties:

```ts
const config = {
  database: {
    host: 'localhost',
    get connectionString() {
      throw new Error('Database disconnected!');
    },
  },
};

// Returns safe value descriptor without executing the getter!
const res = why.path(config, 'database.connectionString');
console.log(res.value.kind); // 'accessor' (evaluated: false)

// Safely resolves nested path or returns default
const host = why.optional(config, 'database.host', '127.0.0.1');
console.log(host.value); // 'localhost'
```

### 4. Circular-Safe JSON Serialization

Serialize objects containing circular references, `BigInt`, `Map`, `Set`, `Symbol`, or `Date` safely:

```ts
const payload: Record<string, unknown> = {
  big: 9007199254740991n,
  tags: new Set(['node', 'debug']),
};
payload.self = payload;

// Will NOT throw "TypeError: Converting circular structure to JSON"
const json = why.json(payload);
console.log(json);
/*
{
  "big": "9007199254740991n",
  "tags": { "__type": "Set", "values": ["node", "debug"] },
  "self": "[Circular]"
}
*/
```

### 5. Secret Scanning & Automatic Redaction

Scan string inputs for credentials or automatically redact sensitive properties before logging:

```ts
const sensitiveData = {
  username: 'admin',
  apiKey: 'AKIAIOSFODNN7EXAMPLE',
  authToken: 'Bearer eyJhbGciOiJIUzI1Ni...';
};

const sanitized = why.redact(sensitiveData);
console.log(sanitized);
// { username: 'admin', apiKey: '[REDACTED]', authToken: '[REDACTED]' }
```

### 6. High-Resolution Benchmarking & Performance

Measure execution duration using `performance.now()` or run controlled benchmark scenarios:

```ts
// 1. High-resolution marks
why.mark('db-query');
// ... perform query ...
const timing = why.measure('db-query');
console.log(`Query took ${timing.durationMs}ms`);

// 2. Controlled Benchmarking with p50/p95/p99 statistics
const bench = why.benchmark(() => {
  Math.sqrt(Math.random() * 1000);
}, { testIterations: 1000 });

console.log(`Ops/Sec: ${bench.opsPerSec}`);
console.log(`p95 Latency: ${bench.p95Ms}ms`);
```

### 7. Error Stack Parsing & Root Cause Analysis

Parse stack traces into structured frames and resolve wrapped error cause chains:

```ts
const dbError = new TypeError('Connection pool exhausted');
const appError = new Error('HTTP 500 Internal Server Error', { cause: dbError });

// Find the deepest root cause in the chain
const root = why.rootCause(appError);
console.log(root.name);    // 'TypeError'
console.log(root.message); // 'Connection pool exhausted'

// Classify error type
console.log(why.classify(appError)); // 'Type'
```

### 8. Markdown & SARIF Report Generation

Generate static diagnostic reports for local documentation or CI/CD static security analysis:

```ts
const report = why.report({ a: 1, b: 2 });

// Export to Markdown
console.log(report.toMarkdown());

// Export to SARIF (Static Analysis Results Interchange Format)
const sarifLog = report.toSARIF();
```

---

## 📚 Complete API Reference

### 1. Core Inspection & Type Classification

| Method | Return Type | Description |
|---|---|---|
| `why(val)` / `why.inspect(val)` | `InspectionResult` | Performs deep getter-safe structural inspection |
| `why.explain(val)` | `ExplainResult` | Returns structured findings, severity, and formatted REPL text |
| `why.describe(val)` | `string` | Generates concise single-line human-readable summary |
| `why.type(val)` | `DetectedType` | Classifies value into one of 28 distinct runtime categories |
| `why.value(val)` | `SafeValue` | Safe representation without getter evaluation |
| `why.keys(val)` | `KeyInfo[]` | Metadata for own property keys (string/symbol, enumerable/non-enumerable) |
| `why.values(val)` | `SafeValue[]` | Safe property values without accessor execution |
| `why.entries(val)` | `EntryInfo[]` | Paired key metadata and safe values |
| `why.size(val)` | `SizeInfo` | Semantic size (`property-count`, `byte-length`, `collection-size`) |
| `why.depth(val)` | `number` | Maximum property nesting depth |
| `why.prototype(val)` | `PrototypeInfo` | Prototype chain metadata and null-prototype check |
| `why.constructor(val)` | `ConstructorInfo` | Prototype-based constructor resolution |
| `why.references(val)` | `RepeatedRefInfo[]` | Identifies objects referenced at multiple paths |
| `why.circular(val)` | `CircularResult` | Cycle detection with exact back-edge path locations |

### 2. Type Testing & Equality

| Method | Return Type | Description |
|---|---|---|
| `why.is(val, expected)` | `boolean` | Check type string or constructor (`why.is(val, Date)`) |
| `why.same(a, b)` | `boolean` | Evaluates identity reference equality (`Object.is(a, b)`) |
| `why.strictEqual(a, b)` | `boolean` | Strict equality (`a === b`) |
| `why.equal(a, b)` | `boolean` | Loose semantic equality (`a == b`) |
| `why.deepEqual(a, b)` | `boolean` | Safe circular-aware deep equality comparison |
| `why.assert(cond, msg?)` | `asserts cond` | Asserts condition; throws `WhyAssertionError` if false |
| `why.expect(val, exp)` | `ExpectResult` | Non-throwing expectation returning `{ pass, actual, expected }` |
| `why.valid(val)` / `why.invalid(val)` | `ValidationResult` | Structural non-null/non-undefined/non-NaN validation |
| `why.coerce(val, target)` | `unknown` | Explicit safe coercion helper (`'string' \| 'number' \| 'boolean'`) |

### 3. Object Diff & Snapshots

| Method | Return Type | Description |
|---|---|---|
| `why.diff(a, b)` | `DiffResult` | Full object diff returning added, removed, modified, and unchanged entries |
| `why.changed(a, b)` / `why.unchanged(a, b)` | `boolean` | Predicates checking structural difference |
| `why.added(a, b)` / `why.removed(a, b)` | `EntryInfo[]` | List of added or removed properties |
| `why.modified(a, b)` | `ModifiedEntryInfo[]` | List of modified properties with `oldValue` and `newValue` |
| `why.reference(a, b)` | `ReferenceRelationshipResult` | Reference relationship analysis |
| `why.snapshot(val)` | `unknown` | Creates a safe, bounded snapshot clone |

### 4. Property & Path Debugging

| Method | Return Type | Description |
|---|---|---|
| `why.path(val, pathStr)` / `why.resolve(val, pathStr)` | `PropertyPathResult` | Getter-free nested path resolution (`'a.b.c'`) |
| `why.get(val, key)` | `SafeValue` | Safe single property read |
| `why.has(val, key)` | `boolean` | Distinguishes `{ x: undefined }` from `{}` |
| `why.exists(val, pathStr)` | `boolean` | Path existence check |
| `why.missing(val, pathStr)` | `string \| undefined` | Diagnostic explanation of path breakdown |
| `why.undefined(val)` / `why.null(val)` | `boolean` | Strict type predicates |
| `why.optional(val, pathStr, default)` | `{ value, exists }` | Optional chain resolution with fallback default |

### 5. Serialization & Utilities

| Method | Return Type | Description |
|---|---|---|
| `why.json(val)` / `why.stringify(val)` / `why.circularJSON(val)` | `string` | Circular-safe JSON stringifier |
| `why.parse(str)` | `T \| null` | Safe JSON parser |
| `why.serializable(val)` | `boolean` | Checks if value can be JSON stringified safely |
| `why.clone(val)` | `T` | Safe deep cloning using `structuredClone` / fallback |
| `why.invalidDate(val)` | `boolean` | Identifies invalid Date instances (`NaN` timestamp) |
| `why.whitespace(str)` | `boolean` | Checks if string is whitespace-only |
| `why.invisible(str)` | `boolean` | Detects zero-width / invisible Unicode characters |
| `why.precision(num)` | `number` | Calculates decimal precision count |

### 6. Error & Function Debugging

| Method | Return Type | Description |
|---|---|---|
| `why.error(err)` | `ErrorDiagnosticResult` | Structured Error inspection (frames, cause chain, properties) |
| `why.stack(errStr)` / `why.frames(errStr)` | `StackFrameInfo[]` | Parsed stack frames list |
| `why.rootCause(err)` | `ErrorDiagnosticResult` | Deepest root cause in cause chain |
| `why.classify(err)` | `string` | Error classification (`Type`, `Syntax`, `Network`, `System`, `Custom`) |
| `why.fingerprint(err)` | `string` | Hash string of error type + location |
| `why.function(fn)` / `why.fn(fn)` | `FunctionDiagnosticResult` | Inspects function metadata without executing |
| `why.wrap(fn)` / `why.unwrap(fn)` | `T` | Wraps function to track call counts & execution timing |
| `why.callCount(fn)` | `number` | Returns invocation count of wrapped function |

### 7. Performance, Memory & Process

| Method | Return Type | Description |
|---|---|---|
| `why.process()` | `ProcessDiagnosticResult` | Process runtime metadata (PID, platform, uptime, cwd) |
| `why.env()` | `Record<string, string>` | Environment variables with auto-redacted secret keys |
| `why.memory()` | `MemoryResult` | Process memory usage breakdown (`heapUsed`, `heapTotal`, `rss`) |
| `why.mark(name)` / `why.measure(name)` | `PerformanceResult` | High-resolution performance timings (`performance.now()`) |
| `why.benchmark(fn, options)` | `PerformanceResult` | Controlled benchmark runner returning ops/sec & p50/p95/p99 |
| `why.delay(ms)` | `Promise<void>` | Non-blocking delay promise |
| `why.promise(p)` | `Promise<PromiseStateResult>` | Inspects Promise state (`pending`, `fulfilled`, `rejected`) |
| `why.timeout(p, ms)` | `Promise<T>` | Wraps a promise with a safe timeout limit |

### 8. Security, Reporting & Config

| Method | Return Type | Description |
|---|---|---|
| `why.security(val)` | `SecurityDiagnosticResult` | Scans strings & objects for secret patterns (AWS, JWT, Bearer tokens) |
| `why.mask(str)` | `string` | Masks sensitive string values |
| `why.redact(obj)` | `T` | Recursively redacts sensitive object keys (`password`, `apiKey`, `secret`) |
| `why.report(val)` | `ReportResult` | Generates full diagnostic report with `toMarkdown()`, `toJSON()`, `toSARIF()` |
| `why.configure(options)` | `DiagnosticConfig` | Central configuration manager (limits, secret patterns) |
| `why.config()` | `DiagnosticConfig` | Returns active diagnostic configuration |
| `why.session()` | `SessionEvent[]` | Bounded diagnostic event recording log |

---

## 🔒 Security & Design Invariants

`why-is-this` adheres strictly to the following guarantees across all modules:

1. **Getter Safety**: Property inspection accesses descriptors via `Object.getOwnPropertyDescriptor` and only reads `.value` of data descriptors. Accessors (`get`/`set`) are **never executed**.
2. **Offline & Zero Telemetry**: Local-only processing. No network calls, remote logging, or hidden HTTP traffic.
3. **No Unbounded Memory**: Iterative DFS graph traversal uses bounded limit caps (`maxDepth: 10`, `maxProperties: 200`, `maxSessionEvents: 1000`).
4. **No Unexpected Throwing**: Diagnostic inspection methods catch internal proxy/accessor errors gracefully and record non-fatal errors in `result.errors`.

---

## 📄 License

MIT © 2026
    