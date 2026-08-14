---
type: active-work
project: wisp
updated: 2026-08-14
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-08-14 by Opus 5 (relay leg 3, ticket-loop → release cut)_
_At commit: `dd0acb8` on main, tag `v2.0.43`. Released: **`wisp-router@2.0.43`** (npm `latest`), `wisp-slot` 1.7.4, vsix 1.11.0. **Nothing is owed.**_

## Current focus

**2.0.43 is SHIPPED. Queue dry, release cut, verified against a control. There is no open work item.**

The npm cut ran after the queue drained: `packages/tui/package.json` bumped to 2.0.43, changelog entry
dated, Surfaces **re-derived at the cut** (the entry had been written when #202 was the only ticket in the
window and still claimed wisp-slot 1.7.1–1.7.3), tag `v2.0.43` pushed, `release.yml` green on all five jobs.

**#204 — usage-endpoint recon spike — DONE** (verdict comment on #201, breadcrumb on #204, issue closed,
`ready-for-agent` cleared). Verdict: **build**, filed as **#207** and deliberately *not* `ready-for-agent`.

No code shipped and no branch was cut — the ticket's deliverable is an answered question, and its own
acceptance criteria require that nothing be committed. Working tree is unchanged apart from `.context/`.

What the spike established:

- Both account usage endpoints answer **Wisp's own stored OAuth credentials**, no extra scope or consent:
  Anthropic `GET https://api.anthropic.com/api/oauth/usage` (`Bearer` + `anthropic-beta: oauth-2025-04-20`)
  and Codex `GET https://chatgpt.com/backend-api/wham/usage` (`Bearer` + `chatgpt-account-id`). Both `200`.
  `/backend-api/api/codex/usage` is a **404** — recorded so nobody tries it again.
- They report the **same ledger as the turn headers**, exactly: Anthropic 5h `42%` / 7d `71%` with resets
  matching `status.json` to the second, Codex 7d `100%` at `reset_at 1787198654`. That agreement is what
  clears the advertised-ceiling trap, and it cost zero read budget
  ([[a-new-quota-source-is-cheapest-to-validate-against-one-already-trusted]]).
- The build reason is **reachability with zero turns spent**, not richer fields. Headers only arrive on a
  response, so a freshly-opened session has no meters until the user sends something — which is the hole
  #203's expired-window rendering sits in.
- Read budget honoured: Anthropic 2 spaced reads, Codex 1 (+1 404). No 429 seen.

Decisions inside it worth carrying:

- **Cross-source agreement beats a short time series** when the source under test is rate-limited and reports
  integer percents. Full page: [[a-new-quota-source-is-cheapest-to-validate-against-one-already-trusted]].
- **Deferred past 2.0.43 on purpose** — #201 declares the passive header lane this release's source of truth,
  and cadence / precedence / opt-in are human scoping calls. That is why #207 carries no `ready-for-agent`.

## Queue: empty

`gh issue list --label ready-for-agent --state open` → `[]`. **Verify by query, not by this note.**

Open but not agent-ready: **#207** (active quota probe — blocked on three scoping calls and on 2.0.43
shipping), **#69**, **#163**.

## Release: cut and verified

**npm `wisp-router` 2.0.43 is published and is `latest`.** Run `31769786239`, all five jobs green (four
native compiles + smoke tests, then publish). GitHub release `v2.0.43` carries all four platform binaries.

**Verified past the registry read, with a control.** A scratch `npm i wisp-router@2.0.43` then *executing*
the bin: `wisp log` printed `No Bridge log yet at <WISP_HOME>/bridge.log — run 'wisp serve' to start one`
and exited 0, respecting a sandboxed `WISP_HOME`; the splash reports `v2.0.43`. The same check on **2.0.42
fails** — `wisp log` is unrecognized there and falls through to the interactive TUI splash — which is what
makes the green result mean something ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]).

**The platform packages 404, and that is the documented steady state, not a regression.**
`wisp-router-win32-x64` does not exist on the registry for 2.0.42 either — npm's spam filter has removed
them before, which is why `release.yml` marks them best-effort and hard-fails only on the thin shell. The
shim's fallback downloads from the GitHub release, and the install proved that path works.

`wisp-slot` 1.7.4 and vsix 1.11.0 are unchanged by this cut — different faces, different doors. The
statusline badge already runs 1.7.4 from the repo checkout
([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]); the vsix is **still not installed**.

## State

- **In flight:** nothing. Queue drained and the release is out.
- **Done this leg:** #204 recon driven end to end (both endpoints probed, comparison table, build verdict on
  #201), #207 filed, #204 breadcrumbed + closed + label cleared, probe scripts deleted, two gotchas and one
  decision recorded — then, on the user's go, the **2.0.43 npm cut**: version bump, changelog dated,
  Surfaces re-derived, tag pushed, pipeline green, release verified against a 2.0.42 control.
- **Blocked:** nothing.

## Verification

- `gh issue list --label ready-for-agent --state open` → `[]` (queue dry — the loop's stop signal)
- `gh issue view 204` → `CLOSED`, labels `[enhancement]` (`ready-for-agent` cleared by hand, as always)
- `git status --short` → only the user's untracked `.context/Untitled.canvas`; `out/` empty, both probe
  scripts deleted per the ticket's own acceptance criterion
- Pre-work `git rev-list --left-right --count origin/main...main` → `0 0`
- Comment scanned for identifier-shaped values before posting (`wrkspc_`, `req_01`, email patterns) → clean.
  No account-identifying value reached the tracker or the repo.
- No code gate claimed for #204 — **no code changed** by the recon itself.

Release gate, run on main before the tag (there is no PR CI, so the local gate *is* the gate):

- `bun run test` (core vitest) — **1016/1016 across 21 files**
- `bun run --cwd packages/core typecheck` — clean
- `bun run --cwd packages/tui compile` — clean
- `bun test packages/tui/tests/` — **28/28** (the bun-runner half, which the workspace gate does not cover)
- `node plugins/slot/statusline/check.js` — **30/30**
- `release.yml` run `31769786239` — 5/5 jobs green, including its own tag-vs-`package.json` verify
- Post-publish: scratch install + **bin executed**, with 2.0.42 as a failing control (see above)

## Skills for next session

- `/preset pick-up` — baton at [[pick-up]] is current and says queue empty, nothing owed.
- There is **no queued work**. The next move is a decision, not a task: either scope #207's three open calls
  so it can be labelled `ready-for-agent`, or pick up #69 / #163.

## Open questions

- **#207's three open calls** — poll cadence, precedence when a poll and a turn header disagree (they agreed
  exactly here, so "freshest wins" is probably enough, but it is a decision), and whether the probe is opt-in.
- Carried over, unchanged: install `packages/vscode/wisp-1.11.0.vsix`; dismiss the two secret-scanning alerts
  as won't-fix; rotate `bridgeSecret` (low urgency); #170 needs a Kimi Code subscription; note #189's last
  criterion on the closed issue when observed; ~20 stale local `ticket/*` branches.
- `.context/Untitled.canvas` sits untracked in the repo — user's own file, left alone, not committed.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[quota-recon]]
- [[2026-08-14-the-usage-endpoint-is-the-same-ledger-reached-without-a-turn]]
- [[a-new-quota-source-is-cheapest-to-validate-against-one-already-trusted]]
- [[the-usage-payload-names-most-of-its-buckets-in-unstable-codenames]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]
- [[loadcodeassist-answers-with-the-account-email-inside-it]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]]
