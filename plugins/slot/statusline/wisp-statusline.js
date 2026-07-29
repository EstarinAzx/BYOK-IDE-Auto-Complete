// ---------------- wisp-statusline.js — Wisp badge for a composed statusline ---------------- //

/*
Depends on:
  node:fs — stdin read, config reads
  node:os — home dir resolution
  node:path — path joins

Data shapes:
  stdin — Claude Code statusline JSON; model at { model: { id, display_name } }
  config.json — { routing: { families: { [family]: { providerId, model } } },
                  snapshots: { [row]: { providerId, model } | null }, ... }
  status.json — the Bridge's per-turn snapshot (#171):
                { updatedAt, providerId, model, contextTokens?, contextWindow?,
                  contextPercent?, meters?: [{ label, percent, resetAt? }] }
*/

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// ------------------------------- Bridged detection ------------------------------- //

const wispHome = process.env.WISP_HOME || path.join(os.homedir(), '.wisp');

// Same two-part check as the SessionStart hook; unbridged sessions get no badge.
if (!process.env.ANTHROPIC_BASE_URL || !fs.existsSync(wispHome)) process.exit(0);

// A snapshot older than this is a previous session's turn, not this one's. Showing it would be a confident
// wrong number — the one thing #171 forbids — so it ages out and the fields simply disappear.
const STATUS_MAX_AGE_MS = 30 * 60 * 1000;

// --------------------------------- Badge assembly --------------------------------- //

// Resolve the session's family live from config on every refresh, so a
// mid-session Slot rebind shows up on the next repaint. The held-Snapshot count
// comes from the same config read (the Wisp snapshot store). Any failure along
// the way degrades to the bare badge rather than lying.
let badge = '[WISP]';
let heldCount = 0;
try {
  const stdin = JSON.parse(fs.readFileSync(0, 'utf8'));
  const cfg = JSON.parse(fs.readFileSync(path.join(wispHome, 'config.json'), 'utf8'));
  heldCount = Object.keys(cfg.snapshots || {}).length;
  const name = `${stdin.model?.id || ''} ${stdin.model?.display_name || ''}`.toLowerCase();
  const family = ['haiku', 'sonnet', 'opus', 'fable'].find((f) => name.includes(f));
  const target = family && cfg.routing?.families?.[family];
  if (target?.model) {
    // #171: the live cost of the session, from the snapshot the Bridge writes after each turn. Read in its
    // OWN try so a missing/corrupt status.json costs the readings, never the model badge itself.
    // ponytail: one line, appended fields — this is a badge inside a composed statusline row, so the
    // reference screenshot's stacked meter rows would fight every other badge sharing the line.
    let live = '';
    try {
      const status = JSON.parse(fs.readFileSync(path.join(wispHome, 'status.json'), 'utf8'));
      // Both guards are about honesty, not tidiness: a stale snapshot describes a finished session, and a
      // snapshot for another model describes another route's window. Either way the number would be wrong.
      const fresh = Date.now() - (status.updatedAt || 0) < STATUS_MAX_AGE_MS;
      if (fresh && status.model === target.model) {
        // Rendered verbatim, including past 100% — a 122% reading is a conversation already over the window
        // and doomed upstream, and seeing it BEFORE the request fails is the point.
        if (typeof status.contextPercent === 'number') live += ` ctx ${status.contextPercent}%`;
        for (const m of status.meters || []) live += ` ${m.label} ${m.percent}%`;
      }
    } catch { /* no snapshot yet, or unreadable — the badge just carries no readings */ }
    badge = `[WISP ${family}→${target.model}${live}]`;
  }
} catch {}

// Snapshot marker rides on any badge form — visibility must not depend on the model
// match. ASCII on purpose: wide ⚠ glyphs overlap the next cell in some terminals.
if (heldCount) badge = badge.replace(/\]$/, heldCount > 1 ? ` !SNAP×${heldCount}]` : ' !SNAP]');

// Wisp purple — the signature accent (#a78bfa in the TUI theme; xterm 141 is the nearest
// 256-color). Joins the colored badge row (caveman orange, elucidate purple, ponytail pink).
process.stdout.write(`\x1b[38;5;141m${badge}\x1b[0m`);
