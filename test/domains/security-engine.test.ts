import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Domain: Security & Secret Detection', () => {
  it('why.redact masks sensitive properties automatically', () => {
    const config = {
      username: 'admin',
      password: 'SuperSecretPassword123!',
      apiKey: 'AKIAIOSFODNN7EXAMPLE',
    };

    const redacted = why.redact(config);
    expect(redacted.username).toBe('admin');
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.apiKey).toBe('[REDACTED]');
  });

  it('why.security detects secret strings', () => {
    const awsKey = 'AKIAIOSFODNN7EXAMPLE';
    const res = why.security(awsKey);
    expect(res.safe).toBe(false);
    expect(res.secretsFound.length).toBeGreaterThan(0);
  });
});
