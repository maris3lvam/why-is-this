import { describe, it, expect } from 'vitest';
import why from '../../src/index.js';

describe('Reporting Engine', () => {
  it('why.report generates diagnostic report in markdown, json, and sarif formats', () => {
    const report = why.report({ name: 'test', count: 10 });
    expect(report.summary).toBeDefined();
    expect(typeof report.toMarkdown()).toBe('string');
    expect(typeof report.toJSON()).toBe('string');
    expect(report.toSARIF().version).toBe('2.1.0');
  });
});
