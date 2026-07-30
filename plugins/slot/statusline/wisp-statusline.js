// ---------------- wisp-statusline.js — Wisp block for a composed statusline ---------------- //

/*
Depends on:
  node:fs — stdin read, config reads
  node:os — home dir resolution
  node:path — path joins

Data shapes:
  stdin — Claude Code statusline JSON; model at { model: { id, display_name } }
  config.json — { routing: { families: { [family]: { providerId, model } },
                             aliases: [{ name, target: { providerId, model } }] },
                  snapshots: { [row]: { providerId, model } | null }, ... }
  status.json — the Bridge's per-turn snapshot (#171):
                { updatedAt, providerId, model, contextTokens?, contextWindow?,
                  contextPercent?, meters?: [{ label, percent, resetAt? }],
                  providers?: { [id]: { updatedAt, model, meters } } }

Renders a multi-row BLOCK, not a badge:

    wisp │ fable → claude-fable-5 │ ctx 38% │ anthropic
      5h  ●●○○○○○○○○   11%  ↻ 9:04pm
      7d  ●●●●○○○○○○   35%  ↻ Sun 9:59pm
      codex  7d 7%                 3h ago

Row 1 is the route — a family or an alias, whichever the picked model resolved through. The middle
rows are the ACTIVE Provider's quota windows — its live reading when this session's turn wrote the
snapshot, otherwise its ledger entry stamped with an age. The
tail rows are every OTHER Provider the ledger remembers, dimmed and stamped with their age — a limit
you are not currently spending is still a limit worth seeing, but it is never presented as current.

No leading newline: the composing statusline owns where the block starts (see plugins/slot/README.md).
*/

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// ------------------------------- Bridged detection ------------------------------- //

const wispHome = process.env.WISP_HOME || path.join(os.homedir(), '.wisp');

// Same two-part check as the SessionStart hook; unbridged sessions get no block.
if (!process.env.ANTHROPIC_BASE_URL || !fs.existsSync(wispHome)) process.exit(0);

// A snapshot older than this is a previous session's turn, not this one's. Its CONTEXT reading is then a
// confident wrong number — the one thing #171 forbids — so it ages out. Its quota meters do not: a window
// belongs to the account, not the conversation, so they demote to a dated row instead of vanishing.
const STATUS_MAX_AGE_MS = 30 * 60 * 1000;

// Mirrors QUOTA_LEDGER_MAX_AGE_MS in packages/core/src/status.ts. Pruning on read as well as on write is
// what keeps an idle machine from showing yesterday's limits: nothing rewrites status.json while nothing runs.
const LEDGER_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const BAR_CELLS = 10;
const MAX_REMEMBERED_ROWS = 2;

// --------------------------------- Paint --------------------------------- //

// xterm-256. Wisp purple is 141 — the nearest 256-color to the TUI theme's #a78bfa.
const PURPLE = 141, TEXT = 252, LABEL = 244, DIM = 240, FAINT = 238, SNAP = 208;

const paint = (code, text) => `\x1b[38;5;${code}m${text}\x1b[0m`;

// Utilization → colour. The bands are the ones a user acts on: green is fine, amber is "plan the session",
// red is "this window is nearly gone", bright red is spent-or-over. Context percent uses the same ramp, so
// a full window and a full context look equally alarming — because they cost the same thing.
const scale = (percent) => (percent >= 100 ? 196 : percent >= 80 ? 203 : percent >= 50 ? 179 : 114);

// Ambiguous-width glyphs on purpose: ●/○ are what the reference statusline uses and what reads as a meter
// at a glance. They are single-width everywhere except terminals configured to treat CJK-ambiguous as wide.
const bar = (percent) => {
  // A non-zero reading never renders as an empty bar — floor it at one cell. 0% and 3% mean different
  // things, and rounding 3% down to nothing would make an account that has started spending look untouched.
  const cells = Math.round((percent / 100) * BAR_CELLS);
  const filled = percent <= 0 ? 0 : Math.max(1, Math.min(BAR_CELLS, cells));
  return paint(scale(percent), '●'.repeat(filled)) + paint(FAINT, '○'.repeat(BAR_CELLS - filled));
};

// ------------------------------- Time labels ------------------------------- //

const clockTime = (date) =>
  date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s+/g, '').toLowerCase();

// When a window refills. Same-day resets are the common case and need no date; anything further out gets a
// weekday, because "9:59pm" three days from now would read as tonight.
const resetLabel = (epochSeconds) => {
  const date = new Date(epochSeconds * 1000);
  if (Number.isNaN(date.getTime())) return undefined;
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay ? clockTime(date) : `${date.toLocaleDateString([], { weekday: 'short' })} ${clockTime(date)}`;
};

const ageLabel = (ms) => {
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
};

// --------------------------------- Reads --------------------------------- //

// Every read is independently fallible: a missing status.json must cost the readings, never the route row.
const readJson = (file) => {
  try { return JSON.parse(fs.readFileSync(path.join(wispHome, file), 'utf8')); } catch { return undefined; }
};

const stdin = (() => { try { return JSON.parse(fs.readFileSync(0, 'utf8')); } catch { return {}; } })();

const cfg = readJson('config.json') || {};
const status = readJson('status.json');
const now = Date.now();

// --------------------------------- The route --------------------------------- //

// Resolved live from config on every refresh, so a mid-session Slot rebind shows up on the next repaint.
// Lookup order mirrors resolveRoute (packages/core/src/routing.ts): an exact ALIAS match wins BEFORE the
// family fuzzy. Matching families only was the hole — an aliased route (`sol`, `grok`, `gemini`) resolved to
// no Target at all, so the row lost its model/provider and the live verdict below could never pass, leaving
// the previous Provider's reading as the only thing on screen.
const names = [stdin.model?.id, stdin.model?.display_name].filter(Boolean).map((n) => String(n).toLowerCase());
const alias = (cfg.routing?.aliases || []).find((a) => names.includes(String(a.name).toLowerCase()));
const family = alias ? undefined : ['haiku', 'sonnet', 'opus', 'fable'].find((f) => names.join(' ').includes(f));
const route = alias?.name || family;
const target = alias?.target || (family && cfg.routing?.families?.[family]) || undefined;
const heldCount = Object.keys(cfg.snapshots || {}).length;

// The snapshot is only THIS session's turn when it is both recent and about the model we are routed to —
// otherwise it describes another route's window. Meters survive that verdict as history; context does not.
const live = status && now - (status.updatedAt || 0) < STATUS_MAX_AGE_MS && status.model === target?.model
  ? status
  : undefined;

// The ACTIVE Provider's own quota, wherever it currently lives. status.json is ONE global slot, so the last
// bridged turn on the MACHINE owns the top level — a second session on another Provider pushes this route's
// reading down into the `providers` ledger, and reading only the top level then prints that other session's
// numbers as if they were yours. mergeStatus evicts the active Provider from the ledger, so a Provider is in
// exactly one of the two places: check both. Keyed on providerId, not model, because a quota window belongs
// to the ACCOUNT — a sibling model on the same Provider spends the same window. Context keeps the stricter
// model test above: that one belongs to the conversation.
// Either place is pruned on read at the ledger's own max age: nothing rewrites status.json while nothing
// runs, so an idle machine would otherwise render yesterday's limits as this session's.
const quotaSource = (() => {
  if (!target?.providerId || !status) return undefined;
  if (status.providerId === target.providerId && status.meters?.length) {
    return { meters: status.meters, updatedAt: status.updatedAt || 0, live: Boolean(live) };
  }
  const entry = status.providers?.[target.providerId];
  return entry?.meters?.length ? { meters: entry.meters, updatedAt: entry.updatedAt || 0, live: false } : undefined;
})();
const activeQuota = quotaSource && now - quotaSource.updatedAt <= LEDGER_MAX_AGE_MS ? quotaSource : undefined;

const rows = [];

const head = [paint(PURPLE, 'wisp')];
if (target?.model) head.push(`${paint(PURPLE, route)} ${paint(DIM, '→')} ${paint(TEXT, target.model)}`);
// Rendered verbatim, including past 100% — a 122% reading is a conversation already over the window and
// doomed upstream, and seeing it BEFORE the request fails is the point.
if (typeof live?.contextPercent === 'number') {
  head.push(`${paint(LABEL, 'ctx')} ${paint(scale(live.contextPercent), `${live.contextPercent}%`)}`);
}
if (target?.providerId) head.push(paint(LABEL, target.providerId));
if (heldCount) head.push(paint(SNAP, heldCount > 1 ? `!SNAP×${heldCount}` : '!SNAP'));
rows.push(head.join(paint(DIM, ' │ ')));

// --------------------------------- Meter rows --------------------------------- //

const activeMeters = activeQuota?.meters || [];
const labelWidth = Math.max(3, ...activeMeters.map((m) => String(m.label).length));
// The reading's age, stamped ONCE on the group's first row when it did not come from this session's own
// turn. A window's level is still the account's level minutes later, so an aged reading is worth showing —
// but never worth passing off as this turn's.
let ageStamp = activeQuota && !activeQuota.live ? ageLabel(now - activeQuota.updatedAt) : undefined;

for (const meter of activeMeters) {
  if (typeof meter.percent !== 'number') continue;
  const reset = typeof meter.resetAt === 'number' ? resetLabel(meter.resetAt) : undefined;
  rows.push([
    '  ',
    paint(LABEL, String(meter.label).padStart(labelWidth)),
    '  ',
    bar(meter.percent),
    paint(scale(meter.percent), `${meter.percent}%`.padStart(5)),
    reset ? `  ${paint(DIM, '↻')} ${paint(LABEL, reset)}` : '',
    ageStamp ? `  ${paint(FAINT, ageStamp)}` : '',
  ].join(''));
  ageStamp = undefined;
}

// ------------------------------ Remembered rows ------------------------------ //

// Providers whose limits are known but not being spent right now: the ledger's entries, plus the top-level
// snapshot when another session's Provider wrote it (its meters are still the last thing that wire said).
// The route's OWN Provider is excluded from both — it is the meter rows above, and rendering it twice would
// present the same wire as current and stale at once.
const remembered = [];
if (status) {
  if (status.meters?.length && status.providerId && status.providerId !== target?.providerId) {
    remembered.push({ id: status.providerId, updatedAt: status.updatedAt || 0, meters: status.meters });
  }
  for (const [id, entry] of Object.entries(status.providers || {})) {
    if (entry?.meters?.length && id !== target?.providerId) {
      remembered.push({ id, updatedAt: entry.updatedAt || 0, meters: entry.meters });
    }
  }
}

const shown = remembered
  .filter((e) => now - e.updatedAt <= LEDGER_MAX_AGE_MS)
  .sort((a, b) => b.updatedAt - a.updatedAt)
  .slice(0, MAX_REMEMBERED_ROWS);

for (const entry of shown) {
  const readings = entry.meters
    .filter((m) => typeof m.percent === 'number')
    .map((m) => `${paint(LABEL, m.label)} ${paint(scale(m.percent), `${m.percent}%`)}`)
    .join(paint(FAINT, ' · '));
  if (!readings) continue;
  rows.push(`  ${paint(LABEL, entry.id)}  ${readings}  ${paint(FAINT, ageLabel(now - entry.updatedAt))}`);
}

process.stdout.write(rows.join('\n'));
