#!/usr/bin/env node
/**
 * @fileoverview API Doctor — CLI Entry Point
 *
 * Usage:
 *   npx why-is-this doctor
 *   npx why-is-this doctor --port 5034
 *   npx why-is-this doctor --ipc-port 5035
 *
 * Starts the dashboard HTTP server at http://localhost:5034
 * and connects to the monitored app's IPC server at 127.0.0.1:5035.
 */

import { DashboardServer, DEFAULT_DASHBOARD_PORT } from '../api-doctor/dashboard/dashboard-server.js';
import { DEFAULT_IPC_PORT } from '../api-doctor/transport/ipc-server.js';

// ─── CLI Argument Parsing ────────────────────────────────────────────────────

function parseArgs(argv: string[]): { subcommand: string; flags: Record<string, string | boolean> } {
  const flags: Record<string, string | boolean> = {};
  let subcommand = '';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (!subcommand) {
      subcommand = arg;
    }
  }

  return { subcommand, flags };
}

const { subcommand, flags } = parseArgs(process.argv.slice(2));

// ─── Help Functions ──────────────────────────────────────────────────────────

function printGeneralHelp(): void {
  console.log(`
  ⬡  why-is-this — @debuglab/why-is-this

  USAGE
    npx why-is-this <command> [options]

  COMMANDS
    doctor               Start the API Doctor diagnostic dashboard

  OPTIONS
    --help, -h           Show this help message

  QUICK SETUP
    In your Node.js application:

      import why from '@debuglab/why-is-this';
      why.api.doctor(app);        // Express / Node http.Server / Fastify

    Then in a separate terminal:

      npx why-is-this doctor

    Open http://localhost:${DEFAULT_DASHBOARD_PORT}
`);
}

function printDoctorHelp(): void {
  console.log(`
  ⬡  API Doctor — @debuglab/why-is-this

  USAGE
    npx why-is-this doctor [options]

  OPTIONS
    --port <number>      Dashboard HTTP port (default: ${DEFAULT_DASHBOARD_PORT})
    --ipc-port <number>  App IPC server port (default: ${DEFAULT_IPC_PORT})
    --help, -h           Show this help message

  DESCRIPTION
    Monitor → Detect → Analyze → Explain → Suggest

    API Doctor watches your running application and provides a live
    terminal-debugger-inspired dashboard showing:
      • Real-time request stream
      • P50/P95/P99 latency per endpoint
      • Anomaly detection: high latency, error bursts, latency spikes
      • Diagnostic explanations with suggested next steps
`);
}

if (flags['help'] || flags['h']) {
  if (subcommand === 'doctor') {
    printDoctorHelp();
  } else {
    printGeneralHelp();
  }
  process.exit(0);
}

if (!subcommand) {
  printGeneralHelp();
  process.exit(0);
}

if (subcommand !== 'doctor') {
  console.error(`\n  ✖  Unknown command: "${subcommand}"\n`);
  console.error('  Run: npx why-is-this --help\n');
  process.exit(1);
}

const dashboardPort = parseInt(String(flags['port'] ?? DEFAULT_DASHBOARD_PORT), 10);
const ipcPort = parseInt(String(flags['ipc-port'] ?? DEFAULT_IPC_PORT), 10);

// ─── Start Dashboard ─────────────────────────────────────────────────────────

const server = new DashboardServer(dashboardPort, ipcPort);

server.start().then(() => {
  console.log('');
  console.log('  ⬡  API Doctor  ·  @debuglab/why-is-this');
  console.log('');
  console.log(`  Dashboard   →  http://localhost:${dashboardPort}`);
  console.log(`  IPC target  →  127.0.0.1:${ipcPort}`);
  console.log('');
  console.log('  Connecting to monitored application…');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
}).catch((err: Error) => {
  console.error('');
  console.error('  ✖  Failed to start API Doctor dashboard:');
  console.error('    ', err.message);
  console.error('');
  process.exit(1);
});

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

async function shutdown(): Promise<void> {
  console.log('\n  Shutting down API Doctor…');
  await server.stop();
  process.exit(0);
}

process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });
