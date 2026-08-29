import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleHealth } from './controllers/health.js';
import { handleGetUsers, handleGetUserById } from './controllers/users.js';
import { handleCreateOrder, handleGetOrderById } from './controllers/orders.js';
import { handleGetProducts, handleSearch, handleStats } from './controllers/products.js';
import {
  handleSlowRequest,
  handleErrorRequest,
  handleNotFound,
  handleRandomRequest,
  handleLatencySpike,
} from './controllers/diagnostics.js';
import { handleSecretTest } from './controllers/security.js';

export async function routeRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const host = req.headers.host ?? 'localhost:3000';
  const reqUrl = new URL(req.url ?? '/', `http://${host}`);
  const pathname = reqUrl.pathname;
  const method = (req.method ?? 'GET').toUpperCase();

  // Route matching dispatch
  if (method === 'GET' && pathname === '/api/health') {
    return handleHealth(reqUrl, res);
  }

  if (method === 'GET' && pathname === '/api/users') {
    return handleGetUsers(reqUrl, res);
  }

  if (method === 'GET' && pathname.startsWith('/api/users/')) {
    const id = pathname.slice('/api/users/'.length);
    return handleGetUserById(id, res);
  }

  if (method === 'GET' && pathname === '/api/products') {
    return handleGetProducts(reqUrl, res);
  }

  if (method === 'GET' && pathname === '/api/search') {
    return handleSearch(reqUrl, res);
  }

  if (method === 'POST' && pathname === '/api/orders') {
    return handleCreateOrder(reqUrl, res);
  }

  if (method === 'GET' && pathname.startsWith('/api/orders/')) {
    const id = pathname.slice('/api/orders/'.length);
    return handleGetOrderById(id, res);
  }

  if (method === 'GET' && pathname === '/api/stats') {
    return handleStats(reqUrl, res);
  }

  if (method === 'GET' && pathname === '/api/slow') {
    return handleSlowRequest(reqUrl, res);
  }

  if (method === 'GET' && pathname === '/api/error') {
    return handleErrorRequest(reqUrl, res);
  }

  if (method === 'GET' && pathname === '/api/not-found') {
    return handleNotFound(reqUrl, res);
  }

  if (method === 'GET' && pathname === '/api/random') {
    return handleRandomRequest(reqUrl, res);
  }

  if (method === 'GET' && pathname === '/api/latency-spike') {
    return handleLatencySpike(reqUrl, res);
  }

  if (method === 'GET' && pathname === '/api/secret-test') {
    return handleSecretTest(reqUrl, res);
  }

  // Fallback 404
  return handleNotFound(reqUrl, res, pathname);
}
