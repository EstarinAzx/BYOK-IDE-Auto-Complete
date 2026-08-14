---
type: active-work
project: wisp
updated: 2026-08-14
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-08-14 by Opus 5 (relay leg 1, ticket-loop)_
_At commit: `3465c7c` on main. Released: `wisp-router@2.0.42`, `wisp-slot` 1.7.3. **npm 2.0.43 cut now OWED.**_

## Current focus

**2.0.43 is being built. #202 landed; #203 and #204 remain.**

**#202 — `wisp log` — DONE** (PR #205, squashed as `3465c7c`, issue closed and `ready-for-agent` cleared).
`wisp serve` now appends every Bridge log line to `~/.wisp/bridge.log` with an ISO stamp, rotating the
previous run one generation aside to `.1` on start; `wisp log` reads it behind a header naming the file and
its last-write time, and `wisp log -f` streams appends by offset until Ctrl+C. New file
`packages/tui/src/bridgeLog.ts`, wired at `serve.ts` (the single existing log callback) and `index.tsx`
(a `log` dispatch branch beside `snapshot`, lazily imported). No core seam, as the ticket specified.

Two decisions inside it worth carrying:

- **The serve banner is deliberately not mirrored into the log** — it prints the Bridge **access secret**,
  which must not reach a file. Only the Bridge's own callback is captured. Verified live.
- **`-f` prints the whole existing file, not a last-N tail.** Picking an N would have been unrequested
  policy, and the ticket explicitly rejects size/time policy on rotation. Noted on the ticket as a two-line
  change if a bounded tail is ever wanted.

## Queue: #203, #204

- **#203 — statusline expired-meter semantics** (plugin-only; `resetAt <= now` → dimmed "refilled" row;
  `check.js` + a pre-fix control is the whole gate; `wisp-slot` bump in **two** files).
- **#204 — usage-endpoint recon spike** (throwaway probes under gitignored `out/`, redact on values, ≤3
  reads — the Anthropic usage endpoint carries a multi-minute 429 penalty; verdict as a comment on #201,
  build ticket only on a build verdict).

Both independent, neither blocked. #69 and #163 unchanged, neither agent-ready.

## Release owed

**npm `wisp-router` 2.0.43 — cut is OWED, not cut.** `packages/tui/CHANGELOG.md` carries a
`## [2.0.43] — unreleased` entry with its `### Surfaces` section. `package.json` was deliberately **not**
bumped: the bump and the `v2.0.43` tag stay a deliberate act, since npm cannot republish a version.

Surfaces derived from `git log v2.0.42..HEAD` per face, not copied from the ticket:

- **npm `wisp-router` 2.0.43** — the only face #202 changes. `packages/tui` had no commits since `v2.0.42`;
  this is the first.
- **vsix — untouched, no bump owed.** `packages/core` has **no** commits since `v2.0.42`, and `wisp log` is
  a TUI-face command the extension does not host. Stays 1.11.0 (still not installed).
- **`wisp-slot`** — the three statusline commits since `v2.0.42` already shipped as 1.7.1–1.7.3 through the
  marketplace, independent of this npm entry.

## State

- **In flight:** nothing. Leg complete.
- **Done this leg:** #202 built, gated, merged, closed, label cleared, breadcrumbed; 2.0.43 changelog entry
  with derived Surfaces; new gotcha
  [[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]] + index line.
- **Blocked:** nothing.

## ⚠ `3465c7c` contains more than #202

Local `main` was **4 commits ahead of origin and unpushed** (`4315455`, `2705bac`, `e31c92d`, `9a4b797` —
`.context/` docs, the `claude-wisp-` prefix statusline fix, the `wisp-slot` plugin bumps). The ticket
branch was cut from that main, so the squash-merge swept all four into one 18-file commit under the #202
subject. **Nothing lost, nothing wrong landed** — origin/main holds exactly the union, verified by diffing
local against origin (only delta was the ticket's own files). What is lost is history granularity:
`2705bac` no longer stands as its own commit, so a future Surfaces derivation over `plugins/slot` reads a
feat commit where a fix belonged. Separating them would mean force-pushing a public default branch —
maintainer's call, left alone. Local main is reset to `origin/main`. Full trap + the one-command guard:
[[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]].

## Verification

All green on merged main (`3465c7c`), re-run after the merge, not just on the branch:

- workspace `bun run test` (vitest) — **1016/1016**, baseline unchanged
- `bun test packages/tui/tests/bridgeLog.test.ts` — **13/13** new (bun runner, matching the tui convention)
- `packages/tui` compile, `packages/core` typecheck, extension compile — all exit 0
- `node plugins/slot/statusline/check.js` — **24/24**

Live through the real Bun entry points under a sandboxed `WISP_HOME` on port 41999 (never 41184): the
no-log pointer line, header + verbatim content, **0 ANSI escape bytes** by `od -c` count (renderer-free
measured, not assumed), serve rotating `.1` and stamping its listening line with the secret absent from the
file, and `-f` catching a real `[bridge] route active 'opus' -> opencode-go` line live. Teardown by port,
41184 re-confirmed LISTENING.

## Skills for next session

- `/preset pick-up` — baton at [[pick-up]] is current as of this leg.
- `packages/tui:verify` — for any further tui-face work.

## Open questions

- **#204's verdict is genuinely open** — nobody has driven the usage endpoint with our token yet.
- Carried over, unchanged: install `packages/vscode/wisp-1.11.0.vsix`; dismiss the two secret-scanning
  alerts as won't-fix; rotate `bridgeSecret` (low urgency); #170 needs a Kimi Code subscription; note
  #189's last criterion on the closed issue when observed; ~20 stale local `ticket/*` branches.
- `.context/Untitled.canvas` sits untracked in the repo — user's own file, left alone, not committed.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[quota-recon]]
- [[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
- [[2026-08-14-a-cursor-provider-has-no-wire-to-route-through]]
- [[the-statusline-duplicates-resolveroute-and-drifts]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
