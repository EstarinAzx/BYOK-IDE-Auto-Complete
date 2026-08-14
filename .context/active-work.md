---
type: active-work
project: wisp
updated: 2026-08-14
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-08-14 by Fable 5 (direct user ask → feature + release cut)_
_At commit: `a712745` on main, tag `v2.0.44`. Released: **`wisp-router@2.0.44`** (npm `latest`), vsix 1.12.0 built (NOT installed), `wisp-slot` 1.7.4 unchanged. **Nothing is owed.**_

## Current focus

**2.0.44 is SHIPPED. The Antigravity model list is live-fetched; nothing is in flight.**

The user asked why a newly released Antigravity model didn't show in the Wisp picker. Answer: the lineup
was a hardcoded snapshot (`ANTIGRAVITY_MODEL_SPECS`). On the user's call ("has to be a live fetch"), the
pickers now prefer the upstream's own `POST /v1internal:fetchAvailableModels` answer, with the static
table demoted to signed-out/offline fallback ([[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]).

What shipped (`88e8a39` feat + `a712745` release):

- **core** — `parseAntigravityModels` (the answer's `models` MAP keys; editor-internal rows dropped on
  SHAPE: `tab_*` and `chat_<digits>`, never pinned ids), `antigravityModelsUrl`,
  `fetchAntigravityModels` (turn host chain daily→prod, mirrored headers, `{project}` or `{}` body,
  any-failure host walk per the reference fetch tool, 10s/host timeout, API-error contract shape on
  final failure). 10 new vitest cases in `packages/core/tests/antigravityModels.test.ts`.
- **tui** — `fetchModelList` (modelFetch.ts) branches antigravity-first: signed in → live, any
  failure/empty → curated static. `wisp models antigravity` and the picker both inherit.
- **vscode** — `antigravityModelIds` helper feeds `getState.modelOptions` and `providerModelIds`, raced
  at the same 4s ceiling as the models.dev fetches so panel open can't stall.

First live drive answered **21 rows** where the static table holds 13 — `gemini-3.7-flash-tiered` (the
model the user was missing) among them, plus the known-400 `gemini-3.1-pro-high` and the 2.5-era rows
the reference curates out. Deliberately NOT re-curated: the picker stays the correction path (#186
stance), only shape-internal rows are dropped.

## Queue: empty

`gh issue list --label ready-for-agent --state open` → `[]` at session start. **Verify by query, not by
this note.** No ticket existed for this work — direct user ask, shipped straight on main (solo-repo
convention for a pre-authorized cut).

Open but not agent-ready: **#207** (active quota probe — still blocked on the same three scoping calls),
**#69**, **#163**.

## Release: cut and verified

**npm `wisp-router` 2.0.44 is published and is `latest`.** Run `31781936359`, all five jobs green.
GitHub release `v2.0.44` carries all four platform binaries.

**Verified past the registry read, with a control.** Scratch `npm i wisp-router@2.0.44`, bin executed:
`wisp models antigravity` against the real signed-in `~/.wisp` printed the live 21 (contains
`gemini-3.7-flash-tiered`); the same command on a scratch **2.0.43 fails the check** — static 13, no
3.7 row ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]). Signed-out sandbox on
2.0.44 still prints the curated 13 (fallback proven, exit 0, renderer-free).

**vsix 1.12.0 built and bundle-checked with a control** — the `v1internal:fetchAvailableModels` URL
literal is in the 1.12.0 bundle and absent from 1.11.0's. (Plain `fetchAvailableModels` greps 1 in the
OLD bundle too — a stale comment string — so the URL literal is the discriminating marker.) The vsix is
**not installed**; that supersedes the carried 1.11.0 install item.

## State

- **In flight:** nothing.
- **Done this session:** recon of the reference's fetch tool (`CLIProxyAPI cmd/fetch_antigravity_models`
  — endpoint, headers, `models`-map shape, internal-row skip list), TDD core client (10 red → green),
  tui + vscode glue, full gate, live drive, straight-to-main ship, 2.0.44 npm cut + vsix 1.12.0,
  scratch-install verify with 2.0.43 control.
- **Blocked:** nothing.

## Verification

- Pre-work `git rev-list --left-right --count origin/main...main` → `0 0`
- `bun run test` (core vitest) — **1026/1026 across 22 files** (10 new)
- `bun run --cwd packages/core typecheck` — clean
- `bun run --cwd packages/tui compile` — clean
- `bun run --cwd packages/vscode compile` — clean (tsc ×2 + esbuild + vite)
- `bun test packages/tui/tests/` — **28/28**
- `release.yml` run `31781936359` — 5/5 green
- Post-publish: scratch installs of BOTH versions, bins executed, discriminating output (live 21 vs
  static 13)

## Skills for next session

- `/preset pick-up` — baton at [[pick-up]] is current: queue empty, nothing owed.
- Next move is still a decision, not a task: scope #207's three calls, or pick up #69 / #163.

## Open questions

- **#207's three open calls** — unchanged: poll cadence, poll-vs-header precedence, opt-in.
- **Install `packages/vscode/wisp-1.12.0.vsix`** (supersedes the 1.11.0 item — 1.11.0 was never
  installed and is now stale).
- Carried over, unchanged: dismiss the two secret-scanning alerts as won't-fix; rotate `bridgeSecret`;
  #170 needs a Kimi Code subscription; note #189's last criterion when observed; ~20 stale local
  `ticket/*` branches; `.context/Untitled.canvas` untracked, user's file, left alone.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
