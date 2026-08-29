import type { ServerResponse } from 'node:http';

export function handleHealth(_reqUrl: URL, res: ServerResponse): void {
  const body = JSON.stringify({
    status: 'healthy',
    service: 'api-doctor-reference-app',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}
