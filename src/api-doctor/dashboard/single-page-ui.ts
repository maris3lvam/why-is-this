/**
 * @fileoverview API Doctor — Single-Page Dashboard Loader
 *
 * Loads the dashboard HTML template from `index.html` and exposes `getSinglePageUI(ipcPort)`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let _cachedHtml: string | null = null;

export function getDashboardHtml(): string {
  if (_cachedHtml) return _cachedHtml;

  try {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const htmlPath = path.join(dir, 'index.html');
    if (fs.existsSync(htmlPath)) {
      _cachedHtml = fs.readFileSync(htmlPath, 'utf8');
      return _cachedHtml;
    }
  } catch {
    // Fallback if filesystem read is unavailable
  }

  return '';
}

/**
 * Returns a fully self-contained HTML document with {{IPC_PORT}} replaced by the given port.
 */
export function getSinglePageUI(ipcPort: number): string {
  const html = getDashboardHtml();
  return html.replace(/\{\{IPC_PORT\}\}/g, String(ipcPort));
}
