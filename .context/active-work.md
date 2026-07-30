---
type: active-work
project: wisp
updated: 2026-07-30
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-30 15:45 by Opus 5 (1M) (auto)_
_At commit: `175c694` on main. Released: `wisp-router@2.0.42`, `wisp-slot` 1.7.1._

## Current focus

**Nothing in flight. The tracker queue is empty.**

**#200 closed recon-complete — and the answer was "build nothing".** The last ticket in the queue asked which
of the four wires that never call `onQuota` (xai, antigravity, keyed ×2) actually report quota on their
response head. All four were driven with real turns and captured; **none earned `parseable meter`**, so no
child implementation ticket was filed. That was the acceptance criterion, not a shortcut.

The substance, in one line each:

- **xai has the headers and they are a trap.** `x-ratelimit-limit/remaining-requests|tokens` ride both
  endpoints (public `api.x.ai` and the subscription proxy `cli-chat-proxy.grok.com`) and **never move** —
  `864/864` across 3 fully-drained `grok-build` turns, `8300/8300` across 2 on `grok-4.5` — with **no
  `x-ratelimit-reset*` header at all**. Advertised plan ceilings, not readings.
- **antigravity puts nothing quota-shaped on the head**, twice, drained (only `server-timing` + transport
  noise). Credits exist on a separate endpoint the reference **polls**, reporting an absolute balance with no
  window and no reset — and empty on this free-tier account.
- **keyed opencode-go: nothing on the head.** Which retires the `.withResponse()` question at
  `bridgeServer.ts:703` for free. `opencode-zen` shares the credential and answered `401 CreditsError`
  (no balance) → recorded *not captured*.

Full capture in [[quota-recon]]; the reasoning is settled in
[[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]].

## State

- **In flight:** nothing.
- **Done this pass:**
  - `.context/quota-recon.md` — the #200 capture: per-wire response heads verbatim (credentials redacted),
    a verdict each, and why no follow-up ticket exists.
  - `.context/decisions/2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter.md`
  - `.context/gotchas/a-cancelled-response-body-cannot-test-whether-a-counter-decrements.md`
  - `.context/gotchas/loadcodeassist-answers-with-the-account-email-inside-it.md`
  - Amended [[an-empty-quota-ledger-is-usually-correct-not-broken]] — the two-wire limit is now **settled**
    (their heads carry nothing usable), not a pending gap someone should file.
  - **No source change.** The recon script was a throwaway `bun` file, deleted; the ticket branch was
    deleted unused because the only deliverable was a note, and `.context/` belongs on main.
- **Blocked:** nothing. Every open item is human-optional (below).

## Pick up here

**Queue is empty** — `gh issue list --label ready-for-agent --state open` returns nothing. Verify by query,
never from this file.

Two open issues, neither agent-ready:

1. **#69** — copilot-wisp launcher, ungroomed backlog. `grill-me` / `/preset init` is the right shape.
2. **#163** — waiting, not working (watch the 217k–245k band for Anthropic `stop_reason=refusal`).

So the next session either grooms #69 into tickets, picks up something from the human-optional list, or the
user brings new work. **Do not invent a ticket to keep a loop fed.**

## Skills for next session

- `/preset pick-up` — the baton at [[pick-up]] is current as of `175c694`.
- `packages/tui:verify` — scoped skill (`packages/tui/.claude/skills/verify`). Sandboxed `WISP_HOME` + real
  Bun entry points; use it for any `packages/tui` or core-that-tui-bundles change, and before any npm cut.

## Open questions

- **`/plugin update wisp-slot`** — hygiene only, safe to ignore. Cache is **1.7.0** (verified on disk; an
  earlier note said 1.6.0), checkout is 1.7.1. Only the version bump, README, `check.js` and the statusline
  script moved between them — **no hooks, no skills** — and the block the user sees comes from the checkout
  via the wrapper, which hardcodes that path
  ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]).
- **`packages/vscode/wisp-1.11.0.vsix` still not installed.** No vsix cut this pass either — nothing touched
  the extension.
- Carried over, unchanged: dismiss the two secret-scanning alerts as won't-fix; rotate `bridgeSecret` in
  `~/.wisp/auth.json` (low urgency); **#170** needs a Kimi Code subscription; **#189**'s last criterion (a
  Claude-model turn *completing* on Antigravity after the `2026-07-30T20:55:48Z` reset — note it on closed
  #189); ~19 stale local `ticket/*` branches.

## Recent context

- **`packages/core` has no `compile` script.** The gate there is `bun run typecheck` (`tsc --noEmit`); only
  `packages/tui` has `compile` (`tsc -p ./`). The older "run `bun run compile` in BOTH packages" wording
  errors with `Script not found "compile"` in core. Full gate this pass: **1016/1016 vitest**, core
  `typecheck` clean, tui `compile` clean.
- **Recon that reads a head must drain the body.** Cancelling the stream means the turn may never be billed,
  so a `remaining` counter has nothing to move and a dead ceiling looks exactly like an untouched meter. The
  first #200 pass did this and would have reported the opposite conclusion
  ([[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]).
- **`opencode-zen` needs no key of its own** — `keyId: 'opencode-go'` (`catalog.ts:77`), so one stored key
  covers both, and two keyed Providers were reachable from a single credential. Its `401` was a *balance*
  failure, not an auth one.
- **opencode signals exhaustion by failing the turn** with a typed `CreditsError`, not by reporting a level on
  a header — closer to the Antigravity 429 verdict path than to a meter.
- **Antigravity's turns answered on the daily host both times** (chain position 1/2), so the production
  fallback went unexercised; `loadCodeAssist` remains pinned to production. The asymmetry the code warns about
  is real and still current.
- **The ledger reading empty on this machine is still correct, not broken** — every turn is
  `opus → anthropic`, and the active Provider is deliberately never in the ledger.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[quota-recon]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]
- [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]]
- [[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]
- [[an-empty-quota-ledger-is-usually-correct-not-broken]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
