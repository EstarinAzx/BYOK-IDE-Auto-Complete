---
type: active-work
project: wisp
updated: 2026-08-14
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-08-14 by Opus 5 (relay leg 3, ticket-loop)_
_At commit: `caeeec8` on main. Released: `wisp-router@2.0.42`, `wisp-slot` 1.7.4. **npm 2.0.43 cut still OWED — and it is now the only thing left.**_

## Current focus

**2.0.43's ticket queue is DRY. #202, #203 and #204 all landed; the cut is the user's move.**

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

## Release owed

**npm `wisp-router` 2.0.43 — cut is OWED, and nothing else is blocking it.** Unchanged by #204, which
shipped no code. `packages/tui/CHANGELOG.md` still carries `## [2.0.43] — unreleased` with its Surfaces
already derived; `package.json` deliberately not bumped — the bump and the `v2.0.43` tag stay a deliberate
human act, and the tag must equal `package.json` exactly or `release.yml` fails loud.

`wisp-slot` 1.7.4 is **live for the user already** on this machine — the badge runs from the repo checkout
([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]).

## State

- **In flight:** nothing. Leg complete, queue drained.
- **Done this leg:** #204 recon driven end to end (both endpoints probed, comparison table, build verdict on
  #201), #207 filed, #204 breadcrumbed + closed + label cleared, probe scripts deleted, two gotchas and one
  decision recorded.
- **Blocked:** nothing. The release cut is a human step, not a block.

## Verification

- `gh issue list --label ready-for-agent --state open` → `[]` (queue dry — the loop's stop signal)
- `gh issue view 204` → `CLOSED`, labels `[enhancement]` (`ready-for-agent` cleared by hand, as always)
- `git status --short` → only the user's untracked `.context/Untitled.canvas`; `out/` empty, both probe
  scripts deleted per the ticket's own acceptance criterion
- Pre-work `git rev-list --left-right --count origin/main...main` → `0 0`
- Comment scanned for identifier-shaped values before posting (`wrkspc_`, `req_01`, email patterns) → clean.
  No account-identifying value reached the tracker or the repo.
- No code gate claimed — **no code changed.** Nothing to typecheck, nothing to test.

## Skills for next session

- `/preset pick-up` — baton at [[pick-up]] is current as of this leg and says `queue empty`.
- The next real move is the **2.0.43 release cut**, which is a human step with its own landmine list in
  [[pick-up]] (tag must equal `package.json`; verify past the registry read; a fix release needs the previous
  version as a control).

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
