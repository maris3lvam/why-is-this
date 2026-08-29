import type { ServerResponse } from 'node:http';

const MOCK_PRODUCTS = [
  { id: 'p1', title: 'Diagnostic Toolkit', price: 0.00 },
  { id: 'p2', title: 'API Monitoring License', price: 49.99 },
  { id: 'p3', title: 'Enterprise Support Plan', price: 299.00 },
];

export function handleGetProducts(_reqUrl: URL, res: ServerResponse): void {
  const body = JSON.stringify(MOCK_PRODUCTS);
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function handleSearch(reqUrl: URL, res: ServerResponse): void {
  const query = reqUrl.searchParams.get('q') ?? 'default';
  const body = JSON.stringify({
    query,
    resultsCount: 3,
    matches: [`Match for "${query}" #1`, `Match for "${query}" #2`, `Match for "${query}" #3`],
  });
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function handleStats(_reqUrl: URL, res: ServerResponse): void {
  const metrics = Array.from({ length: 50 }, (_, i) => ({
    metricId: i + 1,
    metricName: `system.metric.${i + 1}`,
    value: Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
  }));
  const body = JSON.stringify({ metrics, totalCount: 50 });
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}
