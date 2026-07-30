// ---------------- check.js — runnable self-check for the Wisp statusline block ---------------- //

/*
Depends on:
  node:fs / node:os / node:path — sandbox WISP_HOME
  node:child_process — run the real script as Claude Code runs it (stdin JSON in, ANSI out)

Run: node plugins/slot/statusline/check.js   (exit 0 = pass, 1 = fail)

Why this exists: wisp-statusline.js runs out-of-process under Claude Code, so vitest never sees it, and it
necessarily RE-IMPLEMENTS resolveRoute (packages/core/src/routing.ts) in plain JS. That duplicate drifted
once already — it knew families and not aliases, so every aliased route (`sol`, `grok`) rendered a bare
`wisp` row with the previous Provider's quota as the only reading. These four cases pin the resolution order
and the degrade ladder; they are not a test suite and need no framework.
*/

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const script = path.join(__dirname, 'wisp-statusline.js');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'wisp-statusline-check-'));
const now = Date.now();

const write = (file, body) => fs.writeFileSync(path.join(home, file), JSON.stringify(body));

write('config.json', {
  routing: {
    families: {
      opus: { providerId: 'anthropic', model: 'claude-opus-5' },
      sonnet: { providerId: 'codex', model: 'gpt-5.6-sol' },
    },
    aliases: [
      { name: 'sol', target: { providerId: 'codex', model: 'gpt-5.6-sol' } },
      { name: 'grok', target: { providerId: 'xai', model: 'grok-4.5' } },
    ],
  },
});

// ANSI stripped: the assertions are about content, and colour is verified by eye.
const plain = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');

const render = (model, status) => {
  const file = path.join(home, 'status.json');
  if (status) write('status.json', status);
  else if (fs.existsSync(file)) fs.unlinkSync(file);
  return plain(execFileSync(process.execPath, [script], {
    input: JSON.stringify({ model }),
    // ANTHROPIC_BASE_URL is half the bridged check — without it the script prints nothing at all.
    env: { ...process.env, WISP_HOME: home, ANTHROPIC_BASE_URL: 'http://127.0.0.1:8787' },
    encoding: 'utf8',
  }));
};

const codexTurn = {
  updatedAt: now,
  providerId: 'codex',
  model: 'gpt-5.6-sol',
  contextPercent: 12,
  meters: [{ label: '5h', percent: 22, resetAt: Math.floor(now / 1000) + 3600 }, { label: '7d', percent: 61 }],
  providers: { anthropic: { updatedAt: now - 7 * 60_000, model: 'claude-opus-5', meters: [{ label: '5h', percent: 5 }, { label: '7d', percent: 36 }] } },
};

let failures = 0;
const ok = (label, condition, output) => {
  if (condition) return;
  failures += 1;
  console.error(`FAIL ${label}\n${output}`);
};

// 1. An ALIASED route names its own Provider and shows that Provider's live windows.
let out = render({ id: 'sol', display_name: 'gpt-5.6-sol' }, codexTurn);
ok('alias route row', out.includes('sol → gpt-5.6-sol') && out.includes('codex'), out);
ok('alias context', out.includes('ctx 12%'), out);
ok('alias live meters', /5h {2}.*22%/.test(out) && /7d {2}.*61%/.test(out), out);
ok('alias ledger row', /anthropic {2}5h 5%.*7d 36% {2}7m ago/.test(out), out);

// 2. A family route is unchanged — the fuzzy rung still fires when no alias matches.
out = render({ id: 'claude-opus-5', display_name: 'Opus 5' }, {
  updatedAt: now, providerId: 'anthropic', model: 'claude-opus-5', contextPercent: 7, meters: [{ label: '5h', percent: 5 }],
});
ok('family route row', out.includes('opus → claude-opus-5') && out.includes('anthropic'), out);
ok('family live meter', /5h {2}.*5%/.test(out), out);

// 3. A Provider that reports no quota headers (xai) still gets its route row, and the readings that DO
//    exist stay dated rows — never restated as this route's live windows.
out = render({ id: 'grok', display_name: 'grok-4.5' }, codexTurn);
ok('grok route row', out.includes('grok → grok-4.5') && out.includes('xai'), out);
ok('grok claims no context', !out.includes('ctx '), out);
ok('grok demotes both readings', /codex {2}5h 22%/.test(out) && /anthropic {2}5h 5%/.test(out), out);

// 4. No status.json: the route row must survive alone (every read is independently fallible).
out = render({ id: 'sol', display_name: 'gpt-5.6-sol' }, null);
ok('bare route row', out.trim() === 'wisp │ sol → gpt-5.6-sol │ codex', out);

fs.rmSync(home, { recursive: true, force: true });

if (failures) { console.error(`\n${failures} failing check(s)`); process.exit(1); }
console.log('wisp-statusline: 10/10 checks passed');
