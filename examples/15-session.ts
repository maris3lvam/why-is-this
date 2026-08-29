/**
 * @fileoverview Example 15: Sessions, Configuration & Reporting
 *
 * Covers: why.report() · why.session() · why.configure() · why.config()
 *
 * These APIs give you global control over the library's behavior
 * and structured diagnostic reports for any value in Markdown, SARIF, and JSON formats.
 */

import why from '../src/index.js';

// ─── Section 1: why.config() — Read Current Configuration ────────────────────

console.log('─── 1. why.config() — Read Default Configuration ───');

const defaultConfig = why.config();

// Inspection limits control how deep/wide the engine traverses
console.log('maxDepth:', defaultConfig.limits.maxDepth); // → 10
console.log('maxProperties:', defaultConfig.limits.maxProperties); // → 100
console.log('maxArrayLength:', defaultConfig.limits.maxArrayLength); // → 50
console.log('maxSessionEvents:', defaultConfig.maxSessionEvents); // → 1000

// Security defaults
console.log('autoRedact:', defaultConfig.security.autoRedact); // → true
console.log('maskString:', defaultConfig.security.maskString); // → '[REDACTED]'
console.log(
  'secretPatterns count:',
  defaultConfig.security.secretPatterns.length,
); // → 3

// ─── Section 2: why.configure() — Override Configuration ─────────────────────

console.log('\n─── 2. why.configure() — Customise Behaviour ───');

// Override depth limit for a single deep analysis session
why.configure({
  limits: { maxDepth: 20 }, // increase depth limit
  maxSessionEvents: 500, // reduce session event buffer
});

const updated = why.config();
console.log('updated maxDepth:', updated.limits.maxDepth); // → 20
console.log('updated maxSessionEvents:', updated.maxSessionEvents); // → 500

// Add a custom secret pattern — e.g., for internal API key format
why.configure({
  security: {
    secretPatterns: [
      ...defaultConfig.security.secretPatterns,
      { name: 'Internal Service Key', pattern: /INT-KEY-[A-Z0-9]{20}/ },
    ],
    maskString: '***MASKED***', // custom mask string
  },
});

const securityConfig = why.config().security;
console.log('custom pattern count:', securityConfig.secretPatterns.length); // → 4 (3 default + 1 custom)
console.log('custom mask string:', securityConfig.maskString); // → '***MASKED***'

// Verify custom pattern works
const internalKey = 'INT-KEY-ABCDEFGHIJ1234567890';
const matches = why.secrets(internalKey);
console.log('custom key detected:', matches.length > 0); // → true
console.log('pattern name:', matches[0]?.patternName); // → 'Internal Service Key'

// ─── Section 3: why.report() — Diagnostic Report Generation ──────────────────

console.log('\n─── 3. why.report() — Generate Diagnostic Report ───');

// Generate a report for a suspicious object value
const suspiciousValue = {
  data: new Boolean(false), // boxed primitive — potential trap
  nested: {
    deep: {
      arr: [1, 2, 3],
      date: new Date('invalid'), // invalid date
    },
  },
};

const report = why.report(suspiciousValue);

console.log('report success:', report.success); // → true
console.log('findings count:', report.findings.length);

// ─── Section 3a: report.toMarkdown() ──────────────────────────────────────────

console.log('\n─── 3a. report.toMarkdown() ───');

const markdown = report.toMarkdown();
console.log(markdown);
// Output example:
// # Diagnostic Report: object
// **Summary**: Object with 2 properties ...
// ## Findings
// - [NOTICE] ...
// ## Prototype Chain
// - Object

// ─── Section 3b: report.toJSON() ─────────────────────────────────────────────

console.log('\n─── 3b. report.toJSON() — JSON Export ───');

const jsonReport = report.toJSON();
const parsed = JSON.parse(jsonReport) as {
  summary: string;
  findings: string[];
};
console.log('JSON summary:', parsed.summary.slice(0, 60) + '...');
console.log('JSON findings:', parsed.findings);

// ─── Section 3c: report.toSARIF() ────────────────────────────────────────────

console.log('\n─── 3c. report.toSARIF() — SARIF v2.1.0 Format ───');

const sarif = report.toSARIF();
console.log('SARIF version:', sarif.version); // → '2.1.0'
console.log('tool name:', sarif.runs[0]?.tool.driver.name); // → 'why-is-this'
console.log('SARIF results:', sarif.runs[0]?.results.length); // → number of findings

// Report for a simple primitive — minimal findings
const simpleReport = why.report(42);
console.log('\nPrimitive report findings:', simpleReport.findings.length); // → 0 or minimal

// Report for a circular object — should flag circular reference
const circ: Record<string, unknown> = { id: 'root' };
circ['self'] = circ;
const circReport = why.report(circ);
console.log('Circular findings count:', circReport.findings.length); // → >= 1
console.log(
  'Circular markdown excerpt:',
  circReport.toMarkdown().includes('Circular'),
);
// → true

// ─── Section 4: why.session() — Session Event Log ────────────────────────────

console.log('\n─── 4. why.session() — Session Event Access ───');

// Session events are recorded internally as the library processes values.
// You can read them to see what the engine has done during the current session.
const events = why.session();
console.log('session event count:', events.length); // → 0+ events recorded

// Events are immutable — read-only snapshot
if (events.length > 0) {
  const first = events[0]!;
  console.log('first event type:', first.type);
  console.log('first event timestamp:', first.timestamp);
}
