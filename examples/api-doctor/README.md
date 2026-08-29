# API Doctor — Official Reference Application

Official reference implementation for `@debuglab/why-is-this` **API Doctor**.

Demonstrates real-time API monitoring, diagnostic anomaly detection, P50/P95/P99 latency calculations, error rate tracking, and terminal-debugger dashboard integration.

---

## Architecture

```text
┌─────────────────────────────────────────┐
│ Terminal 1                              │
│                                         │
│ Node.js Reference Server (port 3000)    │
│ why.api.doctor(app)                     │
└────────────────────┬────────────────────┘
                     │
                     │ Local Loopback IPC (127.0.0.1:5035)
                     ▼
┌─────────────────────────────────────────┐
│ Terminal 2                              │
│                                         │
│ npx why-is-this doctor                  │
│ API Doctor Diagnostic Engine            │
└────────────────────┬────────────────────┘
                     │
                     │ HTTP (port 5034)
                     ▼
┌─────────────────────────────────────────┐
│ Browser                                 │
│                                         │
│ http://localhost:5034                   │
│ Visual Terminal-Debugger Dashboard      │
└─────────────────────────────────────────┘
```

---

## Quick Start

### 1. Start the Reference Application

In your first terminal:

```bash
npm start
```

Or run directly with Node:

```bash
node --experimental-strip-types src/server.ts
```

The application will start listening on `http://localhost:3000`.

### 2. Start the API Doctor Dashboard

In a second terminal:

```bash
npx why-is-this doctor
```

### 3. Open the Dashboard

Open your web browser to:

```text
http://localhost:5034
```

### 4. Generate Demo Traffic

In a third terminal, run the automated demo traffic generator:

```bash
npm run demo
```

You will see live request streams, endpoint statistics, P95 latencies, and diagnostic findings populating the dashboard in real time!

---

## CLI Options

The API Doctor CLI supports custom ports and help flags:

```bash
# Default (Dashboard on :5034, IPC on :5035)
npx why-is-this doctor

# Custom dashboard HTTP port
npx why-is-this doctor --port 5034

# Custom app IPC port
npx why-is-this doctor --ipc-port 5035

# Both custom ports
npx why-is-this doctor --port 8080 --ipc-port 5036

# API Doctor CLI help
npx why-is-this doctor --help

# General package CLI help
npx why-is-this --help
```

---

## In-Code Integration

### Recommended Default Usage

```ts
import http from 'node:http';
import why from '@debuglab/why-is-this';

const app = http.createServer((req, res) => {
  // your request handler
});

// Attach API Doctor
why.api.doctor(app);

app.listen(3000);
```

### Custom Configuration Options

```ts
why.api.doctor(app, {
  storage: {
    maxSize: '100MB',      // Byte buffer cap (evicts oldest entries when full)
    cleanupOnExit: true,  // Automatically release resources on process exit
  },
  ipcPort: 5035,           // Custom IPC port for process communication
  maxRecentPerEndpoint: 20 // Recent requests kept per route pattern
});
```

---

## Manual Diagnostic Trigger Guide

You can trigger specific API Doctor diagnostic findings manually using `curl`:

### 1. Healthy Baseline Traffic

```bash
for i in {1..20}; do
  curl -s http://localhost:3000/api/health > /dev/null
  curl -s http://localhost:3000/api/users > /dev/null
  curl -s http://localhost:3000/api/products > /dev/null
done
```

### 2. High Latency Anomaly

Triggers `[HIGH]` or `[MEDIUM]` severity **High Latency** diagnostic finding (P95 > 500ms / 1000ms):

```bash
for i in {1..6}; do
  curl -s http://localhost:3000/api/slow
  echo ""
done
```

### 3. Error Burst Anomaly

Triggers `[HIGH]` severity **Error Burst** diagnostic finding (error rate > 2% / 5xx cluster):

```bash
for i in {1..10}; do
  curl -s http://localhost:3000/api/error
  echo ""
done
```

### 4. Latency Spike Anomaly

Triggers **Latency Spike** diagnostic finding (endpoint P95 > 3.5× fleet average):

```bash
for i in {1..10}; do
  curl -s http://localhost:3000/api/latency-spike
  echo ""
done
```

### 5. Dynamic Route Pattern Normalization

Demonstrates route grouping under `/api/users/:id` and `/api/orders/:id`:

```bash
curl -s http://localhost:3000/api/users/1
curl -s http://localhost:3000/api/users/2
curl -s http://localhost:3000/api/users/42
curl -s http://localhost:3000/api/orders/ord-100
curl -s http://localhost:3000/api/orders/ord-200
```

### 6. Header Redaction Test

Demonstrates automatic redaction of sensitive headers (`Authorization`, `Cookie`, `X-API-Key`):

```bash
curl -s -H "Authorization: Bearer my_secret_token_12345" \
        -H "Cookie: session=secret_cookie_value" \
        http://localhost:3000/api/secret-test
```

---

## Available Endpoints

| Method | Path | Description | Expected Status |
|--------|------|-------------|-----------------|
| `GET` | `/api/health` | Healthy baseline endpoint | `200 OK` |
| `GET` | `/api/users` | User list collection | `200 OK` |
| `GET` | `/api/users/:id` | Dynamic user lookup | `200 OK` |
| `GET` | `/api/products` | Product catalog | `200 OK` |
| `GET` | `/api/search` | Search query | `200 OK` |
| `POST` | `/api/orders` | Create new order | `201 Created` |
| `GET` | `/api/orders/:id` | Dynamic order lookup | `200 OK` |
| `GET` | `/api/stats` | Larger JSON payload | `200 OK` |
| `GET` | `/api/slow` | Artificial latency (600–1200ms) | `200 OK` |
| `GET` | `/api/error` | Internal server error | `500 Server Error` |
| `GET` | `/api/not-found` | Missing resource | `404 Not Found` |
| `GET` | `/api/random` | Mixed status codes & timing | `200`–`500` |
| `GET` | `/api/latency-spike` | Intermittent 1500ms delay | `200 OK` |
| `GET` | `/api/secret-test` | Header redaction test | `200 OK` |

---

## What API Doctor Detects

1. **High Latency**: Endpoints with P95 response times exceeding 500ms or 1000ms.
2. **Latency Spikes**: Endpoints operating 3.5× slower than the fleet P95 baseline.
3. **Error Bursts**: High error rates (> 2%) or 5xx server error clusters.
4. **Slow Endpoints**: Individual requests taking > 2 seconds.
5. **Health Score**: Composite score (0–100) reflecting overall API health.

---

## Teardown & Clean Exit

Press `Ctrl+C` in any terminal to cleanly stop the server or CLI dashboard. All buffers and loopback IPC sockets are automatically released.

---

## 🤝 Collaboration & Community

Have questions or feedback? Join our community:

- 💬 **Telegram Group**: [t.me/thedebuglab](https://t.me/thedebuglab)
- 🐛 **Issue Tracker**: [GitHub Issues](https://github.com/thedebuglab/why-is-this/issues)

