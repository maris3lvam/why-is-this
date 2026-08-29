/**
 * @fileoverview Demo Traffic Generator for API Doctor Reference App
 *
 * Generates realistic API traffic against http://localhost:3000 to demonstrate
 * all API Doctor features:
 *   - Healthy baseline metrics
 *   - Dynamic route parameters
 *   - Response size variations
 *   - Artificial slow requests (High Latency)
 *   - Repeated 500 errors (Error Burst)
 *   - Latency spikes
 *   - Status code distribution (200, 201, 204, 400, 404, 500)
 *   - Header redaction
 */

import http from 'node:http';

const BASE_URL = 'http://localhost:3000';

function makeRequest(
  path: string,
  method = 'GET',
  headers: Record<string, string> = {}
): Promise<{ status: number; durationMs: number }> {
  return new Promise((resolve) => {
    const start = performance.now();
    const url = new URL(path, BASE_URL);

    const req = http.request(
      url,
      {
        method,
        headers: {
          'User-Agent': 'API-Doctor-Demo-Generator/1.0',
          ...headers,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const durationMs = Math.round(performance.now() - start);
          resolve({ status: res.statusCode ?? 0, durationMs });
        });
      }
    );

    req.on('error', () => {
      resolve({ status: 0, durationMs: Math.round(performance.now() - start) });
    });

    if (method === 'POST') {
      req.write(JSON.stringify({ item: 'Demo Item', quantity: 1 }));
    }

    req.end();
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDemo(): Promise<void> {
  console.log('\n  ⬡  API Doctor — Demo Traffic Generator\n');
  console.log(`  Targeting application at ${BASE_URL}…`);
  console.log('  Generating mixed request patterns to populate dashboard…\n');

  // Verify server is up
  const initial = await makeRequest('/api/health');
  if (initial.status !== 200) {
    console.error('  ✖ Could not connect to http://localhost:3000/api/health.');
    console.error('    Please start the server first in another terminal:');
    console.error('    npm start\n');
    process.exit(1);
  }

  console.log('  [1/6] Generating healthy baseline traffic…');
  for (let i = 0; i < 15; i++) {
    await makeRequest('/api/health');
    await makeRequest('/api/users');
    await makeRequest('/api/products');
    await makeRequest(`/api/search?q=query_${i}`);
    await sleep(50);
  }
  console.log('        ✓ 60 healthy baseline requests sent.');

  console.log('\n  [2/6] Generating dynamic route traffic (/api/users/:id & /api/orders/:id)…');
  const userIds = [1, 2, 3, 4, 5, 10, 42, 99, 100];
  for (const id of userIds) {
    await makeRequest(`/api/users/${id}`);
    await makeRequest(`/api/orders/ord-${id}`);
    await makeRequest('/api/orders', 'POST');
    await sleep(40);
  }
  console.log('        ✓ Dynamic route requests sent.');

  console.log('\n  [3/6] Demonstrating response size & header redaction…');
  for (let i = 0; i < 5; i++) {
    await makeRequest('/api/stats');
    await makeRequest('/api/secret-test', 'GET', {
      Authorization: 'Bearer secret_api_token_xyz123',
      Cookie: 'session_id=abc987654321',
    });
    await sleep(50);
  }
  console.log('        ✓ Headers & size demonstration requests sent.');

  console.log('\n  [4/6] Generating High Latency traffic (/api/slow)…');
  for (let i = 0; i < 8; i++) {
    const res = await makeRequest('/api/slow');
    console.log(`        • GET /api/slow -> HTTP ${res.status} (${res.durationMs}ms)`);
  }
  console.log('        ✓ High latency requests completed.');

  console.log('\n  [5/6] Generating Error Burst traffic (/api/error & /api/not-found)…');
  for (let i = 0; i < 10; i++) {
    await makeRequest('/api/error');
    await makeRequest('/api/not-found');
    await sleep(30);
  }
  console.log('        ✓ Error burst requests completed (HTTP 500 & 404).');

  console.log('\n  [6/6] Generating Latency Spike traffic (/api/latency-spike)…');
  for (let i = 0; i < 10; i++) {
    const res = await makeRequest('/api/latency-spike');
    console.log(`        • GET /api/latency-spike -> HTTP ${res.status} (${res.durationMs}ms)`);
    await sleep(50);
  }
  console.log('        ✓ Latency spike requests completed.');

  console.log('\n  ================================================================');
  console.log('  ✔ Demo traffic generation complete!');
  console.log('');
  console.log('  Open your browser to view diagnostics:');
  console.log('    http://localhost:5034');
  console.log('  ================================================================\n');
}

runDemo().catch((err) => {
  console.error('Error running demo traffic:', err);
  process.exit(1);
});
