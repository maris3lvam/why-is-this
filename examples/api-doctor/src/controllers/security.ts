import type { ServerResponse } from 'node:http';

export function handleSecretTest(_reqUrl: URL, res: ServerResponse): void {
  const body = JSON.stringify({
    message: 'Header redaction test endpoint',
    note: 'Authorization and Cookie headers are redacted in API Doctor storage.',
  });
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}
