import type { ServerResponse } from 'node:http';

/** Artificial slow endpoint (600ms - 1200ms delay) to trigger High Latency anomaly detector */
export async function handleSlowRequest(_reqUrl: URL, res: ServerResponse): Promise<void> {
  const delay = Math.floor(600 + Math.random() * 600);
  await new Promise((resolve) => setTimeout(resolve, delay));
  const body = JSON.stringify({
    message: 'Slow operation completed',
    artificialDelayMs: delay,
  });
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/** Intentionally failing 500 error endpoint to trigger Error Burst anomaly detector */
export function handleErrorRequest(_reqUrl: URL, res: ServerResponse): void {
  const body = JSON.stringify({
    error: 'InternalServerError',
    message: 'Database connection pool exhausted',
    code: 'ERR_DB_CONN_TIMEOUT',
  });
  res.writeHead(500, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/** 404 Not Found response endpoint */
export function handleNotFound(_reqUrl: URL, res: ServerResponse, customPath?: string): void {
  const body = JSON.stringify({
    error: 'NotFound',
    message: 'Requested API resource does not exist',
    path: customPath ?? _reqUrl.pathname,
  });
  res.writeHead(404, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/** Mixed random status codes & latencies endpoint */
export async function handleRandomRequest(_reqUrl: URL, res: ServerResponse): Promise<void> {
  const statusCodes = [200, 201, 204, 400, 401, 404, 500];
  const code = statusCodes[Math.floor(Math.random() * statusCodes.length)]!;
  const delay = Math.floor(10 + Math.random() * 150);
  await new Promise((resolve) => setTimeout(resolve, delay));

  if (code === 204) {
    res.writeHead(204);
    res.end();
    return;
  }

  const body = JSON.stringify({ statusCode: code, timestamp: new Date().toISOString() });
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

/** Latency spike endpoint (1 in 3 requests delayed by 1500ms) to trigger Latency Spike anomaly detector */
export async function handleLatencySpike(_reqUrl: URL, res: ServerResponse): Promise<void> {
  const isSpike = Math.random() < 0.35;
  const delay = isSpike ? 1500 : 15;
  await new Promise((resolve) => setTimeout(resolve, delay));
  const body = JSON.stringify({
    message: isSpike ? 'Latency spike triggered!' : 'Normal fast response',
    delayMs: delay,
    isSpike,
  });
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}
