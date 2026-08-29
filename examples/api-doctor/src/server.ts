/**
 * @fileoverview Official API Doctor Reference Application
 *
 * Demonstrates real-time monitoring and diagnostic anomaly detection using
 * `why.api.doctor(app)` with a native Node.js HTTP application.
 */

import http from 'node:http';
import why from '@debuglab/why-is-this';
import { routeRequest } from './router.js';

const PORT = 3000;

// Create Node HTTP Server and delegate to modular router
const server = http.createServer((req, res) => {
  routeRequest(req, res).catch((err) => {
    console.error('Unhandled request error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'InternalServerError' }));
    }
  });
});

// Attach API Doctor monitoring
const doctorHandle = why.api.doctor(server, {
  storage: {
    maxSize: '100MB',
    cleanupOnExit: true,
  },
});

// Start Server & Display Info Banner
server.listen(PORT, () => {
  console.log(`
  ================================================================
  ⬡  API DOCTOR REFERENCE APPLICATION
  ================================================================

  Monitored App  →  http://localhost:${PORT}
  IPC Port       →  ${doctorHandle.ipcPort}

  AVAILABLE ENDPOINTS
    GET  /api/health        (Healthy baseline)
    GET  /api/users         (User list)
    GET  /api/users/:id     (Dynamic route pattern)
    GET  /api/products      (Product catalog)
    GET  /api/search        (Search queries)
    POST /api/orders        (Create order, 201 Created)
    GET  /api/orders/:id    (Order details)
    GET  /api/stats         (Larger response payload)
    GET  /api/slow          (Artificial latency: 600ms - 1200ms)
    GET  /api/error         (500 Server Error)
    GET  /api/not-found     (404 Not Found)
    GET  /api/random        (Mixed status codes & timing)
    GET  /api/latency-spike (Triggers Latency Spike anomaly)
    GET  /api/secret-test   (Demonstrates header redaction)

  START API DOCTOR DASHBOARD (in a separate terminal)
    npx why-is-this doctor

  DASHBOARD URL
    http://localhost:5034

  GENERATE AUTOMATED DEMO TRAFFIC (in another terminal)
    npm run demo
  ================================================================
  `);
});

// Graceful Teardown
async function handleShutdown(signal: string): Promise<void> {
  console.log(`\n  Received ${signal}. Cleaning up API Doctor & shutting down server...`);
  await doctorHandle.stop();
  server.close(() => {
    console.log('  Server closed cleanly.');
    process.exit(0);
  });
}

process.on('SIGINT', () => { void handleShutdown('SIGINT'); });
process.on('SIGTERM', () => { void handleShutdown('SIGTERM'); });
