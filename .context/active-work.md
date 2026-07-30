---
type: active-work
project: wisp
updated: 2026-07-30
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-30 17:05 by Opus 5 (1M) (auto)_
_At commit: `3974441` on main. Released: `wisp-router@2.0.42`, `wisp-slot` 1.7.2._

## Current focus

**Nothing in flight. The tracker queue is empty.** This pass was a user-reported statusline bug, diagnosed
and fixed off-tracker.

**"Why isn't my codex quota showing up? It's showing anthropic's instead."** Second time that sentence has
been reported, different cause. Screenshot showed a complete route row — `wisp │ sonnet → gpt-5.6-sol │
codex` — and beneath it `anthropic 5h 15% · 7d 37% just now` as the only quota reading.

Two findings, in order:

1. **Codex quota was never broken.** Two drained turns against `chatgpt.com/backend-api/codex` returned
   `x-codex-primary-used-percent: 1` / `x-codex-primary-window-minutes: 10080`, and one bridge turn on
   `claude-sonnet-5` wrote `status.json` with `providerId: codex`, a `7d` meter, and anthropic correctly
   folded into `providers`. The whole write path works end to end.
2. **The reader looked in one place.** `status.json` is **one global slot**, so the top-level snapshot is the
   last turn on the *machine*, not this session. A concurrent `opus → anthropic` session owned it
   continuously; the codex reading sat in the `providers` ledger, unread, because the block only trusted the
   top level for a live reading. So it rendered the other session's windows where this session's quota
   belongs. In the reported frame codex had not turned at all, so no reading existed anywhere — the fixed
   block correctly shows the route row alone.

**Also settled in passing:** codex on a Plus plan has **exactly one window** —
`x-codex-secondary-window-minutes: 0`, which `parseCodexQuota` correctly refuses. A codex session renders a
single `7d` row and never a pair, so **a `5h`/`7d` pair in the block is Anthropic's**. That is now the
fastest tell for this bug.

## State

- **In flight:** nothing.
- **Done this pass** (`3974441`, main, wisp-slot **1.7.2**):
  - `plugins/slot/statusline/wisp-statusline.js` — reader-only fix. The meter rows are now the route's own
    Provider's windows, looked up by **`providerId`** in the top-level snapshot *or*
    `status.providers[<id>]`; aged readings stamp their age on the group's first row; the route's Provider is
    excluded from the tail rows. `ctx` keeps the stricter **model** match; both sources prune on read at 24h.
  - `plugins/slot/statusline/check.js` — 10 → **20 assertions**, three new cases: cross-session displacement,
    a Provider that has reported nothing, and a sibling model on the same Provider.
  - `.context/decisions/2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places.md`
  - Amended three gotchas: [[status-json-is-global-so-it-cannot-observe-another-session]] (it displaces your
    own reading, not just other sessions'), [[the-statusline-duplicates-resolveroute-and-drifts]] (the symptom
    has two causes; the route row distinguishes them), [[an-empty-quota-ledger-is-usually-correct-not-broken]]
    (codex Plus = one `7d` window).
  - Both recon probes were throwaway `bun` files under gitignored `out/`, deleted.
- **Blocked:** nothing. Every open item is human-optional (below).

## Verification

- `node plugins/slot/statusline/check.js` → **20/20**, exit 0.
- **Control:** `git show HEAD~1:plugins/slot/statusline/wisp-statusline.js` + the new `check.js` → **4 failing**
  (`displaced route leads with its own Provider`, `displaced reading is stamped aged`, `sibling model shares
  the account window`, `sibling reading is stamped aged`). Without the control the new assertions prove nothing
  ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]).
- **Live render** against the real `~/.wisp/`, both routes: sonnet leads with
  `7d ●○○○○○○○○○ 1% ↻ Wed 4:59pm  4m ago` and anthropic drops to the dimmed tail; opus keeps its own two bars
  with `codex 7d 1% 4m ago` in the tail.
- **No package gate run** — nothing under `packages/` was touched, so `bun run test` / `typecheck` / `compile`
  had nothing to say about this diff. `check.js` is the whole gate for a statusline-only change.

## Pick up here

**Queue is empty** — `gh issue list --label ready-for-agent --state open` returns nothing. Verify by query,
never from this file.

Two open issues, neither agent-ready:

1. **#69** — copilot-wisp launcher, ungroomed backlog. `grill-me` / `/preset init` is the right shape.
2. **#163** — waiting, not working (watch the 217k–245k band for Anthropic `stop_reason=refusal`).

So the next session either grooms #69 into tickets, picks up something from the human-optional list, or the
user brings new work. **Do not invent a ticket to keep a loop fed.**

## Skills for next session

- `/preset pick-up` — the baton at [[pick-up]] is current as of `3974441`.
- `packages/tui:verify` — scoped skill (`packages/tui/.claude/skills/verify`). Sandboxed `WISP_HOME` + real
  Bun entry points; use it for any `packages/tui` or core-that-tui-bundles change, and before any npm cut.

## Open questions

- **No release is owed.** `git log v2.0.42..main` per face: `packages/tui`, `packages/core` and
  `packages/vscode` are all still **empty** — this pass touched `plugins/` only, shipping as wisp-slot **1.7.2**
  via `marketplace.json` on main. No tag, no npm cut
  ([[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]).
- **`/plugin update wisp-slot`** — cache is at 1.7.1, checkout is now 1.7.2. **Cosmetic**: the wrapper
  hardcodes the checkout path, so the block the user sees is already the fixed one
  ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]).
- **`packages/vscode/wisp-1.11.0.vsix` still not installed.** Nothing touched the extension this pass either.
- Carried over, unchanged: dismiss the two secret-scanning alerts as won't-fix; rotate `bridgeSecret` in
  `~/.wisp/auth.json` (low urgency); **#170** needs a Kimi Code subscription; **#189**'s last criterion (a
  Claude-model turn *completing* on Antigravity after the `2026-07-30T20:55:48Z` reset — note it on closed
  #189); ~19 stale local `ticket/*` branches.

## Recent context

- **A complete route row plus a foreign quota row means displacement, not resolution.** The two causes of the
  same complaint are told apart by the route row alone: bare `wisp` → the resolveRoute copy drifted; a named
  route → the global slot. Costs one glance, saved a whole wrong investigation this pass.
- **The two-place lookup is safe only because `mergeStatus` evicts the incoming Provider from the ledger** —
  so a Provider is in exactly one of the two places and the reader can never find two readings for one wire.
  That eviction rule was written for an unrelated reason; weakening it now breaks the reader.
- **The write path was proved by driving it, not by reading it.** A direct probe to the Codex backend showed
  the headers exist; a second probe through the running bridge door (`POST $ANTHROPIC_BASE_URL/v1/messages`,
  `stream: true`, model `claude-sonnet-5`) showed `status.json` flip to codex with the meter and the ledger
  entry. Both took under a minute and removed all guesswork about which half was broken.
- **`stream: false` never records a snapshot** — the non-streaming branch is Claude Code's `/model` validation
  probe, deliberately excluded (`bridgeServer.ts:843` sits on the streaming path only). A probe that does not
  stream will look like a Provider that never reports.
- **`packages/core` has no `compile` script.** The gate there is `bun run typecheck` (`tsc --noEmit`); only
  `packages/tui` has `compile` (`tsc -p ./`). Carried forward — untested this pass, no package changed.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[quota-recon]]
- [[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]
- [[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[the-statusline-duplicates-resolveroute-and-drifts]]
- [[an-empty-quota-ledger-is-usually-correct-not-broken]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
