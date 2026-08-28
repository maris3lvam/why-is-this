/**
 * @fileoverview Domain engine for diagnostic report generation in Markdown, JSON, and SARIF formats.
 *
 * Safe local formatting — zero network calls or cloud exports.
 */

import type { ReportResult } from '../models/domain-results.js';
import { apiInspect } from '../api/inspect.js';
import { apiExplain } from '../api/explain.js';

/**
 * Generates a structured diagnostic report for any value.
 */
export function generateReport(val: unknown): ReportResult {
  const timestamp = Date.now();
  const inspectRes = apiInspect(val);
  const explainRes = apiExplain(val);

  const findings = explainRes.findings.map((f) => `[${f.severity.toUpperCase()}] ${f.description}`);
  const summary = explainRes.summary;

  return Object.freeze({
    timestamp,
    domain: 'reporting',
    success: true,
    summary,
    findings: Object.freeze(findings),
    toMarkdown() {
      return [
        `# Diagnostic Report: ${inspectRes.type}`,
        `**Summary**: ${summary}`,
        `**Depth**: ${inspectRes.depth}`,
        `**Circular**: ${inspectRes.isCircular ? 'Yes' : 'No'}`,
        '',
        '## Findings',
        ...findings.map((f) => `- ${f}`),
        '',
        '## Prototype Chain',
        `- ${inspectRes.prototypeInfo.chain.join(' → ') || 'None'}`,
      ].join('\n');
    },
    toJSON() {
      return JSON.stringify({ summary, findings, inspectRes }, null, 2);
    },
    toSARIF() {
      return {
        $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
        version: '2.1.0',
        runs: [
          {
            tool: {
              driver: {
                name: 'why-is-this',
                version: '0.1.0',
                informationUri: 'https://github.com/debuglab/why-is-this',
              },
            },
            results: explainRes.findings.map((f) => ({
              ruleId: `why-is-this/${f.kind}`,
              level: f.severity === 'warning' ? 'warning' : 'note',
              message: { text: f.description },
            })),
          },
        ],
      };
    },
  });
}
