import type { ServerResponse } from 'node:http';

const MOCK_USERS = [
  { id: 1, name: 'Alice Smith', role: 'admin' },
  { id: 2, name: 'Bob Jones', role: 'developer' },
  { id: 3, name: 'Carol Danvers', role: 'user' },
];

export function handleGetUsers(_reqUrl: URL, res: ServerResponse): void {
  const body = JSON.stringify(MOCK_USERS);
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function handleGetUserById(id: string, res: ServerResponse): void {
  const numericId = Number(id);
  const body = JSON.stringify({
    id: isNaN(numericId) ? id : numericId,
    name: `User ${id}`,
    email: `user${id}@example.com`,
    accountStatus: 'active',
  });
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}
