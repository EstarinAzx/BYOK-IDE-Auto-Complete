// -------- bridgeLog.ts — the Bridge log file: serve's writer + the headless `wisp log` reader -------- //

/*
 * Depends on:
 *   - node fs/path: the log IS the filesystem — append-only writes, offset reads for the follower.
 *   - @wisp/core: wispHomeDir, so the WISP_HOME override rule lives in exactly one place.
 *
 * Data shapes: none of its own.
 *
 * #202: `wisp serve` keeps its terminal output and additionally appends every Bridge log line here, so
 * the user can read what the Bridge said from any other terminal — live (`-f`) or post-mortem. The file
 * is regenerable telemetry like status.json: never overwrite-protected (#182's rule guards stores whose
 * contents the user cannot regenerate), and invisible to the home-store directory watcher through the
 * existing non-`.json` name filter (homeStore.watch) — no watcher change was needed for it.
 *
 * Every write is best-effort and swallowed. Telemetry must never take the Bridge down.
 */

import {
  appendFileSync, closeSync, existsSync, mkdirSync, openSync, readSync, renameSync, statSync, watchFile,
} from 'fs';
import { join } from 'path';
import { wispHomeDir } from '@wisp/core';

// ----------------------------- Paths ----------------------------- //

const LOG_FILE = 'bridge.log';

export const bridgeLogPath = (): string => join(wispHomeDir(), LOG_FILE);

// One generation only, by design: no size or time policy to tune, and the previous run stays readable
// after a restart. `.1` is deliberately not `.json` so the home watcher keeps ignoring it too.
const rotatedPath = (): string => `${bridgeLogPath()}.1`;

// ----------------------------- Writer (serve) ----------------------------- //

// The stamp is a prefix, never a rewrite: whatever the Bridge said rides through verbatim after it.
export const stampLine = (message: string, at: Date = new Date()): string => `[${at.toISOString()}] ${message}\n`;

// Called once at serve start. renameSync replaces an existing `.1` on both POSIX and Windows.
export const rotateBridgeLog = (): void => {
  try {
    mkdirSync(wispHomeDir(), { recursive: true, mode: 0o700 });
    if (existsSync(bridgeLogPath())) renameSync(bridgeLogPath(), rotatedPath());
  } catch { /* best-effort — a log that cannot rotate must not stop the Bridge starting */ }
};

export const appendBridgeLog = (message: string, at?: Date): void => {
  try { appendFileSync(bridgeLogPath(), stampLine(message, at), { mode: 0o644 }); } catch { /* best-effort */ }
};

// ----------------------------- Reader (`wisp log`) ----------------------------- //

// Named so staleness is self-evident: a log whose last write was hours ago is a dead Bridge, and the
// header says so before a single line of content invites the wrong conclusion.
export const logHeader = (path: string, mtime: Date): string => `${path}  (last write: ${mtime.toISOString()})`;

// Print everything from `offset` to EOF and return the new offset. Reads by fd rather than re-reading the
// whole file so a long-lived follow stays O(appended), not O(file) per tick.
const printFrom = (path: string, offset: number): number => {
  const { size } = statSync(path);
  if (size <= offset) return offset;
  const fd = openSync(path, 'r');
  try {
    const buf = Buffer.alloc(size - offset);
    readSync(fd, buf, 0, buf.length, offset);
    process.stdout.write(buf.toString('utf8'));
  } finally { closeSync(fd); }
  return size;
};

// Renderer-free, like `routing` / `snapshot` / `providers` — imports node fs and core only, never opentui.
export const runLogCli = (args: string[]): number => {
  const follow = args.includes('-f') || args.includes('--follow');
  const path = bridgeLogPath();

  if (!existsSync(path)) {
    console.log(`No Bridge log yet at ${path} — run \`wisp serve\` to start one.`);
    return 0;
  }

  console.log(logHeader(path, statSync(path).mtime));
  let offset = printFrom(path, 0);
  if (!follow) return 0;

  // watchFile polls, which is what survives an append-only writer on every platform we ship to (fs.watch
  // misses appends on some Windows setups). It is persistent, so it holds the event loop open until Ctrl+C.
  watchFile(path, { interval: 300 }, (curr) => {
    if (curr.size < offset) offset = 0; // rotated or truncated under us → start again from the top
    offset = printFrom(path, offset);
  });
  return 0;
};
