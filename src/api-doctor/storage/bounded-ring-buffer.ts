/**
 * @fileoverview API Doctor — Bounded Ring Buffer Storage
 *
 * Manages in-memory storage for captured HTTP request records.
 * Automatically evicts oldest entries when the configured byte limit is reached.
 * Provides safe destroy() for clean shutdown.
 */

import type { RequestRecord } from '../types.js';

// ─── Size Parsing ─────────────────────────────────────────────────────────────

const SIZE_UNITS: Record<string, number> = {
  B: 1,
  KB: 1_024,
  MB: 1_024 * 1_024,
  GB: 1_024 * 1_024 * 1_024,
};

const MIN_BYTES = 10 * SIZE_UNITS['MB']!; // 10MB minimum
const MAX_BYTES = 1 * SIZE_UNITS['GB']!; // 1GB maximum
const DEFAULT_BYTES = 100 * SIZE_UNITS['MB']!; // 100MB default

/**
 * Parse a human-readable size string (e.g. "100MB", "50KB", "1GB") into bytes.
 * Falls back to the default (100MB) if the string is unparseable or out of range.
 */
export function parseSizeString(raw: string | undefined): number {
  if (!raw) return DEFAULT_BYTES;
  const match = /^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i.exec(raw.trim());
  if (!match) return DEFAULT_BYTES;
  const value = parseFloat(match[1]!);
  const unit = match[2]!.toUpperCase();
  const multiplier = SIZE_UNITS[unit] ?? 1;
  const bytes = Math.floor(value * multiplier);
  return Math.min(MAX_BYTES, Math.max(MIN_BYTES, bytes));
}

// ─── Estimated record size ────────────────────────────────────────────────────

/** Rough in-memory size estimate for a RequestRecord (in bytes). */
function estimateRecordSize(record: RequestRecord): number {
  // Use JSON serialization length as a proxy for memory usage
  return JSON.stringify(record).length * 2; // UTF-16 chars × 2 bytes each
}

// ─── BoundedRingBuffer ────────────────────────────────────────────────────────

export class BoundedRingBuffer {
  private readonly _records: RequestRecord[] = [];
  private _totalBytes = 0;
  private readonly _maxBytes: number;
  private readonly _cleanupOnExit: boolean;
  private _destroyed = false;
  private readonly _exitHandler: () => void;

  constructor(maxBytes: number, cleanupOnExit: boolean) {
    this._maxBytes = maxBytes;
    this._cleanupOnExit = cleanupOnExit;

    this._exitHandler = () => this.destroy();

    if (cleanupOnExit) {
      process.on('exit', this._exitHandler);
      process.on('SIGINT', this._exitHandler);
      process.on('SIGTERM', this._exitHandler);
    }
  }

  /** Add a new record, evicting oldest entries if needed. */
  push(record: RequestRecord): void {
    if (this._destroyed) return;

    const size = estimateRecordSize(record);
    this._records.push(record);
    this._totalBytes += size;

    // Evict oldest entries until we're under the limit
    while (this._totalBytes > this._maxBytes && this._records.length > 1) {
      const evicted = this._records.shift();
      if (evicted) {
        this._totalBytes -= estimateRecordSize(evicted);
      }
    }
  }

  /** Return all stored records (oldest first). */
  getAll(): readonly RequestRecord[] {
    return this._records;
  }

  /** Return the N most recent records. */
  getRecent(n: number): RequestRecord[] {
    return this._records.slice(-n);
  }

  /** Current number of records stored. */
  get size(): number {
    return this._records.length;
  }

  /** Current estimated memory usage in bytes. */
  get usedBytes(): number {
    return this._totalBytes;
  }

  /** Maximum allowed bytes. */
  get maxBytes(): number {
    return this._maxBytes;
  }

  /** Whether this buffer has been destroyed. */
  get isDestroyed(): boolean {
    return this._destroyed;
  }

  /** Release all records and remove process listeners. */
  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this._records.length = 0;
    this._totalBytes = 0;

    if (this._cleanupOnExit) {
      process.off('exit', this._exitHandler);
      process.off('SIGINT', this._exitHandler);
      process.off('SIGTERM', this._exitHandler);
    }
  }
}
