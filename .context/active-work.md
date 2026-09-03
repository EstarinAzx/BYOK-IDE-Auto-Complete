---
type: active-work
project: wisp
updated: 2026-09-02
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-09-03 by Fable 5.1 (user quota-burn report → triage → 3-agent review + wire proofs → fix + release cut)_
_At commit: `831e61e` on main, tag `v2.0.47`. Released: **`wisp-router@2.0.47`** (npm `latest`) and **vsix 1.13.2 built + installed**. `wisp-slot` 1.7.4 unchanged._

## Current focus

**2.0.47 is SHIPPED, verified and installed. Nothing is in flight.** Start the Bridge (`wisp serve`/TUI)
to run it — nothing was running at the cut, so there is no stale process.

Started as a user quota-burn report on `claude-fable-5-1` (weekly ~46% on light use). **Triage: the burn
was mostly Fable's price ($10/$50 per M, 2× Opus) + `xhigh` effort on every turn + a 90k→347k context —
none of which are bugs.** But a real cache-placement bug (#363) was making long sessions worse, and the
bridge log that would have shown it was blind (#156/#162). Three Wisp fixes shipped, each verified before
the cut. See [[pick-up]] for the fix list, the Haiku wire proof, and the held-bugs triage.

**#363 is the money bug, proven on the wire.** The volatile `<system-reminder>` tail sat in the top-level
`system` array — inside the cached prefix of every message breakpoint — so a changed reminder re-billed
the whole history each turn (read frozen, creation growing). Now a **trailing role:system turn** behind
every breakpoint, gated to models that accept one (Sonnet/Haiku 400 on it — wire-confirmed)
([[2026-09-03-the-volatile-tail-must-sit-behind-every-message-breakpoint]]).

## State

- **In flight:** nothing.
- **Done this session:** triaged the Fable quota burn (mostly price + effort + context, not a bug);
  ran a 3-agent fresh-eyes review of the Anthropic door path; reproduced #363 on the live wire (Haiku);
  fixed #363 + #156/#162 + #204 with tests (core 1036→1039); full gate; cut, published, verified past the
  registry read, and installed **2.0.47 + vsix 1.13.2**; probes deleted.
- **Blocked:** nothing. No `wisp` process was running at the cut — start one to run 2.0.47.

## Pick up here

**No active work — pick a new task.** The queue is empty by query (`gh issue list --label
ready-for-agent --state open` → `[]` at session start; still verify by query, not by this note —
[[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]).

The most natural next move is **filing the held bugs** (see [[pick-up]] "Bugs found but NOT shipped"):
the statusline resolver drift is a **`wisp-slot`** cut, the rest are core. Or scope #207.

Open but deliberately **not** agent-ready: **#207** (active quota probe — blocked on the same three
scoping calls), **#69**, **#163**.

## Verification

- Pre-cut `git rev-list --left-right --count origin/main...main` → `0 0` (and `0 0` after the push)
- `bun run test` (core vitest) — **1039/1039 across 22 files** (was 1036; +3 fix tests)
- `bun run --cwd packages/core typecheck` — clean
- `bun run --cwd packages/tui compile` — clean; `bun test packages/tui/tests/` — **28/28**;
  `bun run --cwd packages/vscode compile` — clean
- **Live wire, #363 old-vs-new (Haiku, 4 growing turns, changing reminder):**

  | placement | read | creation |
  |---|---|---|
  | volatile in `system` (pre-#363) | **7610 frozen** | 3877 → 5793 → 7680 |
  | volatile behind the breakpoints (#363) | 9568 → 13367 | **~1900 flat** |

  The read climbs with history and creation holds flat once the volatile is out of the message-marker
  prefix — the leak closed. Model-acceptance wire-check: **Haiku 400s** on a trailing role:system turn
  (`role 'system' is not supported`), so the fix is gated to Opus 5/4.8 + Fable/Mythos 5.
- `release.yml` run `33726251888` — **5/5 green**, all four platform binaries on `v2.0.47`
- **npm verified past the registry read:** 2.0.47 scratch-installed, **bin executed** (splash self-reports
  `v2.0.47`), then the shipped binaries grepped 2.0.47 vs 2.0.46 — `modelSupportsMidConversationSystem`
  **2/0**, `authoritativeServerMiss` **2/0** (a proven swap), `claude-cli/` **1/1** shared control
- **vsix verified in the bundle:** `wisp-1.13.2.vsix` extension.js — the same two new symbols present
  (**2/2/3**), absent at `v2.0.46` (git-confirmed **0 files** → **1 file**)
- Installed: global `wisp-router` 2.0.46 → **2.0.47**, `esarinazx.wisp` 1.13.1 → **1.13.2**

## Skills for next session

- `/preset pick-up` — baton at [[pick-up]] is current: queue empty, held-bugs list ready to file.
- Next move is a decision: file the held bugs (statusline drift = `wisp-slot` cut; rest = core), or #207.

## Open questions

- **#207's three scoping calls** — unchanged: poll **cadence**; **precedence** when a poll and a turn
  header disagree; **opt-in or always-on**.
- **Start the Bridge** (`wisp serve`/TUI) to run 2.0.47 — nothing was running at the cut. User's timing.
- Carried over, unchanged: dismiss the two secret-scanning alerts as won't-fix; rotate `bridgeSecret`;
  #170 needs a Kimi Code subscription; note #189's last criterion when observed; ~20 stale local
  `ticket/*` branches; `.context/Untitled.canvas` untracked, user's file, left alone.
- Optional one-liner: `ANTHROPIC_MODELS` (the offline fallback) still knows only `claude-fable-5`.
  Deliberately skipped — unreachable while models.dev answers, which is why the new row reached the
  picker at all.

## Recent context

- The 502's inner 400 was **truncated** in the user's terminal at the load-bearing clause. Rather than
  block on asking for the full text, the wire was driven directly — which returned the exact floor
  (2.1.251) *and* settled the beta-token risk in the same run. Cheaper than the question.
- The vsix face carries the version pin but **not** the bind-table fix (that lives in `packages/tui`
  and has no extension counterpart), so the two faces deliberately ship different subsets of one fix.
- Patch bumps on both faces follow the **1.10.1 / 2.0.40** precedent for a bundled-core fix cut across
  both, not the minor-bump pattern of the last three releases.
- 2.0.46's platform npm package 404'd and the shim fell back to the GitHub release binary under
  `~/.wisp/bin/v2.0.46/`; 2.0.45's had resolved from npm. Both are working paths — do not read one
  clean release as the 404s being fixed.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[2026-09-02-the-advertised-claude-cli-version-is-a-per-model-floor]]
- [[a-live-picker-in-front-of-a-pinned-client-fingerprint-drifts-apart]]
- [[an-upgraded-package-does-not-touch-the-process-already-running]]
- [[a-bundled-dependency-is-not-a-face-but-every-face-carries-it]]
- [[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]
- [[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]
