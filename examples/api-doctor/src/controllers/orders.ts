import type { ServerResponse } from 'node:http';

export function handleCreateOrder(_reqUrl: URL, res: ServerResponse): void {
  const body = JSON.stringify({
    orderId: `ord-${Date.now()}`,
    status: 'created',
    itemsCount: 2,
    totalAmount: 149.99,
    createdAt: new Date().toISOString(),
  });
  res.writeHead(201, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function handleGetOrderById(id: string, res: ServerResponse): void {
  const body = JSON.stringify({
    orderId: id,
    status: 'shipped',
    trackingCode: 'TRK-987654321',
    totalAmount: 149.99,
  });
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}
