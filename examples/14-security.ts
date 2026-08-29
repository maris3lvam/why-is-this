/**
 * @fileoverview Example 14: Security & Secret Detection
 *
 * Covers: why.security() · why.secrets() · why.mask() · why.redact()
 *
 * Local-only, zero-network secret scanning and redaction.
 * Protects against accidental exposure of credentials in logs,
 * API responses, debug output, and serialized state.
 */

import why from '../src/index.js';

// ─── Section 1: why.security() — Full Security Scan ──────────────────────────

console.log('─── 1. why.security() — Full Object Security Scan ───');

// Simulate a partially constructed API response that contains a leaked credential
const apiResponseWithLeak = {
  status: 'success',
  user: { id: 'usr-001', name: 'Alice' },
  debug: {
    // Developer accidentally left this in — a real API key
    apiKey: 'AKIAIOSFODNN7EXAMPLE',
    query: 'SELECT * FROM users WHERE id = ?',
  },
};

const scanResult = why.security(apiResponseWithLeak);
console.log('isSafe:', scanResult.safe); // → false (secret found!)
console.log('secrets found:', scanResult.secretsFound.length); // → 1
console.log('secret pattern:', scanResult.secretsFound[0]?.patternName); // → 'aws-key' or similar
console.log(
  'redacted value:',
  JSON.stringify(scanResult.redactedValue, null, 2),
);
// The debug.apiKey field is masked in the output

// Scan a clean object — should be safe
const cleanPayload = { status: 'ok', count: 42, items: ['a', 'b'] };
const cleanScan = why.security(cleanPayload);
console.log('\nClean payload isSafe:', cleanScan.safe); // → true

// ─── Section 2: why.secrets() — String Pattern Scan ─────────────────────────

console.log('\n─── 2. why.secrets() — String-Level Secret Detection ───');

// AWS Access Key — matches pattern AKIA[0-9A-Z]{16}
const awsKeyStr = 'AKIAIOSFODNN7EXAMPLE';
const awsMatches = why.secrets(awsKeyStr);
console.log('AWS key detected:', awsMatches.length > 0); // → true
console.log('pattern name:', awsMatches[0]?.patternName); // → 'aws-key' or similar

// Bearer JWT token — starts with 'Bearer ' or 'ey' (JWT header)
const bearerStr =
  'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
const bearerMatches = why.secrets(bearerStr);
console.log('\nBearer token detected:', bearerMatches.length > 0); // → true

// GitHub PAT pattern — starts with 'ghp_' or 'github_pat_'
const ghTokenStr = 'ghp_mockToken1234567890abcdefghijkl';
const ghMatches = why.secrets(ghTokenStr);
console.log('\nGitHub token detected:', ghMatches.length > 0); // → true

// Clean string — no secrets
const cleanStr = 'Hello, Alice! Your order #12345 is ready.';
const noMatches = why.secrets(cleanStr);
console.log('\nClean string — no secrets:', noMatches.length === 0); // → true

// ─── Section 3: why.mask() — Partial String Masking ─────────────────────────

console.log('\n─── 3. why.mask() — Partial Token Masking ───');

// Reveals first 3 and last 3 chars — enough to debug, not enough to steal
const longToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
console.log('masked token:', why.mask(longToken));
// → 'eyJ***J9'  (shows first 3 + last 3)

// Short value — less than 8 chars → fully replaced with '***'
const shortSecret = 'abc123';
console.log('short secret masked:', why.mask(shortSecret)); // → '***'

// API key masking
const apiKey = 'sk_live_abc123xyz789def456';
console.log('API key masked:', why.mask(apiKey)); // → 'sk_***456'

// Database password
const dbPassword = 'MyStr0ngP@ssw0rd!2024';
console.log('password masked:', why.mask(dbPassword)); // → 'MyS***024'

// ─── Section 4: why.redact() — Recursive Object Redaction ────────────────────

console.log('\n─── 4. why.redact() — Recursive Object Redaction ───');

// Deep object with credentials scattered across nesting levels
const requestPayload = {
  endpoint: '/api/v2/users',
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: 'Bearer eyJhbGci...', // sensitive
    'x-api-key': 'sk_prod_12345', // sensitive
  },
  body: {
    username: 'alice',
    password: 'correct-horse-battery-staple', // sensitive
    preferences: { theme: 'dark', lang: 'en' },
  },
  metadata: {
    authToken: 'session-token-abc', // sensitive
    sessionId: 'sid-001', // not sensitive
    clientIp: '10.0.0.1', // not sensitive
  },
};

const redacted = why.redact(requestPayload);
console.log(JSON.stringify(redacted, null, 2));
// Expected output:
// {
//   "endpoint": "/api/v2/users",
//   "method": "POST",
//   "headers": {
//     "content-type": "application/json",
//     "authorization": "***",      ← redacted
//     "x-api-key": "***"           ← redacted
//   },
//   "body": {
//     "username": "alice",
//     "password": "***",           ← redacted
//     "preferences": { "theme": "dark", "lang": "en" }
//   },
//   "metadata": {
//     "authToken": "***",          ← redacted
//     "sessionId": "sid-001",
//     "clientIp": "10.0.0.1"
//   }
// }

// Circular references in object being redacted — must not throw
const circularCreds: Record<string, unknown> = {
  token: 'secret-token',
  metadata: { label: 'root' },
};
circularCreds['self'] = circularCreds;

const redactedCircular = why.redact(circularCreds);
console.log(
  '\nCircular redaction — token:',
  (redactedCircular as Record<string, unknown>)['token'],
); // → '***'
console.log(
  'Circular redaction — self:',
  (redactedCircular as Record<string, unknown>)['self'],
); // → '[Circular]'

// Array of credential objects — redaction works element-by-element
const credentialList = [
  { service: 'stripe', apiKey: 'sk_live_abc', secret: 'wh_secret_xyz' },
  { service: 'sendgrid', apiKey: 'SG.abc123def456', password: 'mail-pass' },
];

const redactedList = why.redact(credentialList) as typeof credentialList;
console.log('\nRedacted credential list:');
redactedList.forEach((item) => {
  console.log(
    `  ${item.service}: apiKey=${(item as Record<string, unknown>)['apiKey']}`,
  );
});
// → stripe: apiKey=***
// → sendgrid: apiKey=***
