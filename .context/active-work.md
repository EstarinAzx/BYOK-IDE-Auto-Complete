---
type: active-work
project: wisp
updated: 2026-09-02
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-09-02 by Opus 5 (user bug report → systematic-debugging → live probe → fix + release cut)_
_At commit: `58e9d7f` on main, tag `v2.0.46`. Released: **`wisp-router@2.0.46`** (npm `latest`) and **vsix 1.13.1 built + installed**. `wisp-slot` 1.7.4 unchanged._

## Current focus

**2.0.46 is SHIPPED, verified and installed. Nothing is in flight.** The only thing standing between
the user and a working `claude-fable-5-1` is a **Bridge restart** — see Blocked.

Started as a user report: a newly released Claude model was selectable in Wisp but 502'd, with a
truncated `Anthropic API error 400: "Claude Code 2.1.219 does not …"`. The number was the tell — the
reporting machine's own CLI was already **2.1.258**, so 2.1.219 could only be Wisp's own pinned claim.
Root-caused, then **proven on the live wire** rather than argued from the source.

**The advertised `claude-cli` version is a per-model floor the backend enforces**
([[2026-09-02-the-advertised-claude-cli-version-is-a-per-model-floor]]). `claude-fable-5-1` released
2026-09-01 wanting **2.1.251**; Wisp had claimed 2.1.219 since 2026-07-25.

- **`anthropicClient.ts:113`** — `CLAUDE_CODE_VERSION` 2.1.219 → **2.1.258**. Feeds the `User-Agent`
  and the body's `cc_version` attribution block as one constant, so the two can never disagree.
- **`routingScreens.tsx:54`** — the one-tap bind table's `fable` entry → `claude-fable-5-1`. The
  **second pin stale on the same event**, and the silent one: pressing the button downgraded a working
  hand-set route with no error.
- Both now carry comments naming each other, so the next Claude release trips one check, not two
  mysteries.

**Model discovery was never at fault, and its correctness is what exposed this.** The models.dev pull
has no family whitelist by design, so the new model reached the picker on release day while the pinned
fingerprint could not reach the wire
([[a-live-picker-in-front-of-a-pinned-client-fingerprint-drifts-apart]]).

## State

- **In flight:** nothing.
- **Done this session:** built + verified + installed the owed **vsix 1.13.0** (the 2.0.45 leftover);
  pushed the unpushed `f8f3207`; diagnosed the 502 to Wisp's own version pin; drove a three-cell live
  probe; fixed both stale pins; full gate; cut, published, verified and installed **2.0.46 + vsix
  1.13.1**; probe deleted.
- **Blocked:** nothing in the repo. **On the user's machine:** two `wisp` PIDs (**6328**, **27788**)
  are still serving the old image — see Pick up here.

## Pick up here

**No active work — pick a new task.** The queue is empty by query (`gh issue list --label
ready-for-agent --state open` → `[]`, re-checked at the cut; still verify by query, not by this note —
[[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]).

Before anything else, if the user reports `claude-fable-5-1` still failing: **it is the stale process,
not the fix.** `npm i -g` upgraded the package and npm pruned the old platform binary, but the running
PIDs hold their image in memory and keep serving 2.0.45 behavior
([[an-upgraded-package-does-not-touch-the-process-already-running]]). Restarting is the **user's**
call — a bridged Claude Code session is talking to that very process.

Open but deliberately **not** agent-ready: **#207** (active quota probe — blocked on the same three
scoping calls), **#69**, **#163**.

## Verification

- Pre-cut `git rev-list --left-right --count origin/main...main` → `0 0` (and `0 0` after the push)
- `bun run test` (core vitest) — **1036/1036 across 22 files**
- `bun run --cwd packages/core typecheck` — clean
- `bun run --cwd packages/tui compile` — clean; `bun test packages/tui/tests/` — **28/28**
- **Live wire, three cells, one variable** — the probe that settled it:

  | cell | result |
  |---|---|
  | `claude-fable-5-1` @ 2.1.219 | **400** `claude_code_version_too_old`, names 2.1.251 |
  | `claude-fable-5-1` @ 2.1.258 | **200**, answered |
  | `claude-opus-5` @ 2.1.219 | **200** — control |

  The control is what makes the 400 the wire's verdict rather than a malformed request, and is
  simultaneously the evidence the bump cannot break an already-accepted request. The `anthropic-beta`
  list rode **both** cells unchanged (still the 2.1.216 capture), which closed the open risk that a new
  beta gated the model alongside the version.
- `release.yml` run `33592983325` — **5/5 green**, all four platform binaries on `v2.0.46`
- **npm verified past the registry read:** both versions scratch-installed, **both bins executed**
  (banners self-report `v2.0.46` / `v2.0.45`), then the shipped binaries grepped — `2.1.258` **1/0**,
  `2.1.219` **0/1** (a proven swap, not just an addition), `claude-fable-5-1` **1/0** (npm face only,
  correct), with `claude-cli/` **1/1** and `fetchAntigravityModels` **2/2** as shared controls
- **vsix verified in the bundle:** 1.13.1 vs 1.13.0 — `2.1.258` **1/0**, `2.1.219` **0/1**, controls
  `claude-cli/` **1/1** and `thinkingLevel` **5/5**
- Installed: global `wisp-router` 2.0.45 → **2.0.46**, `esarinazx.wisp` 1.13.0 → **1.13.1**

## Skills for next session

- `/preset pick-up` — baton at [[pick-up]] is current: queue empty, nothing owed in the repo.
- Next move is a decision, not a task: scope #207's three calls, or #69 / #163.

## Open questions

- **#207's three scoping calls** — unchanged: poll **cadence**; **precedence** when a poll and a turn
  header disagree; **opt-in or always-on**.
- **Restart the Bridge** (PIDs 6328 / 27788) to make 2.0.46 live. User's call, user's timing.
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
