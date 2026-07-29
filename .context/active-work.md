---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (relay leg 7 — #172 landed; chain stopped, then restarted on #171)._
_At commit: `49761d8` on main, pushed. **Leg 8 spawned on #171 after the block turned out to be stale.**_

## Current focus

**The relay has drained everything an agent may take.** Legs 1–7 landed **#165** (Responses-wire usage),
**#166** (error classification), **#167** (the ProviderExecutor seam), **#168** (retry + transient cooldown),
**#169** (API-key usage), **#170** (the Kimi Provider) and **#172** (the Codex default model). Seven of the
harvest's nine tickets, every leg gate-green.

**Leg 7 stopped the chain on an apparent block, then the block dissolved on inspection.** #171's body asked
that its `ready-for-agent` label be withheld pending a response-header recon — but that recon had already been
completed and written to the gotchas before the relay chain even started, and the note was simply never
removed. Body corrected, criterion ticked, chain restarted. **Leg 8 is on #171; #173 unblocks behind it and
ships the harvest.**

**The verdict is still not in.** #165's last acceptance criterion — a bridged Codex session reading non-zero
`/context` — needs a human with a restarted Bridge. **Seven** shipped tickets now ride on that check.

## State

- **In flight:** nothing. Working tree clean on main; relay chain stopped (`stop: true`).
- **Done this session (relay leg 7):**
  - **#172 landed** — `49761d8` on main (PR #178, squash-merged), ticket closed with **three of four**
    acceptance criteria machine-checked; the fourth needs a ChatGPT subscription.
  - **The production diff is one field**: the `codex` row's `defaultModel`, `gpt-5.3-codex` → `gpt-5.6-sol`.
    Every surface reaches the model through `resolveModel(modelMap, provider)` — both Bridge doors, the VS
    Code chat provider, Inquire, the status bar, the TUI test screen — so nothing hardcodes a Codex model and
    one field covers all of them.
  - **A model list is not an accepted list.** `CODEX_MODELS` says which ids exist; the ChatGPT-account path
    separately says which a subscription may send, and it is narrower. Nowhere in the code said so. The new
    test asserts the default against a **whitelist of live-probed ids**, not a pattern — the two refused ids
    (`gpt-5.3-codex`, bare `gpt-5.6`) share no shape.
    [[2026-07-29-a-model-list-is-not-an-accepted-list-whitelist-the-probed-ids]].
  - **An invariant in a comment is an invariant that ships broken.** `codex.ts:197` already carried *"the
    codex row's defaultModel must stay a member of this list"* with nothing enforcing it. That is half the
    reason this bug existed. It is now checked against the real `PROVIDERS` row.
  - **Scope held:** `gpt-5.3-codex` was not deleted anywhere — still in `CODEX_MODELS`, still tiered by
    `codexModelCaps`, still valid for API-key callers.
  - Gate: **759/759 tests** (758 → 759, exactly the one new test), caps-tiering tests **4 passed untouched**,
    `bun run compile` clean in **both** packages.
- **User action pending:**
  - **Decide what #171 is** — this is now THE blocker. Nothing else can proceed; see the queue.
  - **Verify #165 live** — restart the Bridge on this build, bridge a Codex session, read `/context`.
    This is the #163 verdict; see [[pick-up]] for what each outcome means.
  - **Verify #169 live** — same trip, different door: a bridged session on the **default** Provider
    (OpenCode Go) must report non-zero tokens in `/context`. Watch for a **400 naming `stream_options`**
    rather than silence.
  - **Verify #172 live** — a fresh Codex sign-in that never picks a model completes a turn. Rides the same
    Bridge session as the two above.
  - **#167's manual criterion** — one turn each through Codex, Anthropic and Grok to confirm all three
    still stream.
  - **#170's two open criteria** — needs a Kimi Code subscription; the sign-in attempt doubles as the
    unverified-constants check.
  - **Install `packages/vscode/wisp-1.9.0.vsix`** (carried over, still not done).

## Queue — 2 tickets left, NEITHER agent-takeable

| # | Ticket | Blocked by |
|---|---|---|
| ~~165~~ | ~~Codex and Grok turns report real token usage~~ | **DONE — `1971541`** |
| ~~166~~ | ~~Codex failures classified into real HTTP statuses~~ | **DONE — `07969d2`** |
| ~~167~~ | ~~Collapse three Bridge handlers into one ProviderExecutor record~~ | **DONE — `c697733`** |
| ~~168~~ | ~~Transient failures retried and cooled down~~ | **DONE — `89f94c5`** |
| ~~169~~ | ~~API-key Providers report real token usage~~ | **DONE — `7b8d73d`** |
| ~~170~~ | ~~Kimi Provider via device flow~~ | **DONE — `d656686`** |
| ~~172~~ | ~~Codex Provider default model rejected by ChatGPT-account path~~ | **DONE — `49761d8`** |
| **171** | Statusline: live context percentage + quota meters | — (**next** — recon was already done, body corrected 2026-07-29) |
| 173 | **Cut `wisp-router` 2.0.38** — ship the harvest | **171** (its only remaining blocker) |

Also open, ungroomed: **#69** (copilot-wisp launcher), **#163** (502 observation — #165+#166 are its
candidate fix; leave open until the live `/context` check confirms).

- **#171 was never actually blocked — resolved 2026-07-29.** Its body carried a note asking that
  `ready-for-agent` be withheld until the response-header recon resolved. **The recon had already been done**
  and written into
  [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]] — all three required steps, with
  the unblocking verdict that both Providers expose utilization headers. The label was applied; the note was
  never removed. Legs 6 and 7 read the note, honoured it over the label, and skipped — correct on the
  information they had. Body corrected, recon criterion ticked, audit trail in the ticket comment.
- **#173 is genuinely blocked, not skipped.** Seven of its eight blockers are closed; #171 is the last.
- **These edges are body text, not native links** — GraphQL `blockedBy` reports empty for all of them. See
  [[harvest-tickets-carry-body-text-blockers-not-native-links]] before trusting a dependency query. #171 is
  the sharper version of that trap: **the label itself can lie too.**

## Pick up here

The relay is running — leg 8 takes **#171**, then #173 cuts the release. Do not re-plan; the tickets carry
their own acceptance criteria. #171's quota-meter half is now fully specified in its body (header names,
units, and the four consumption traps), so the work is plumbing a header snapshot through the Bridge, not
discovery.

## Skills for next session

- `/preset pick-up` — session door (the baton points straight at the relay).
- `/relay N=1 /preset ticket-loop` — exact command preserved in [[pick-up]].
- `packages/tui:verify` — sandboxed CLI verification for TUI command-surface changes.

## Open questions

- **Does #165 actually kill the 502s?** Still THE decisive test. Restart the Bridge, bridge a Codex session,
  confirm `/context` reads non-zero, then watch whether the 217k–245k cluster stops recurring. If it does not,
  the tighter-OAuth-cap hypothesis is back — and #166 now means the next failure arrives as a **400 naming the
  cause** rather than an opaque 502, with #168 having already retried it three times first.
- **Which Codex ids does the ChatGPT-account path actually accept?** Only `gpt-5.6-sol` and `gpt-5.4` are
  probed 200; `gpt-5.3-codex` and bare `gpt-5.6` are probed 400. The rule behind that split is unknown — the
  refused pair share no shape — so the test whitelists rather than pattern-matches. Probe more ids if the
  dropdown's other offerings matter for the account path.
- **Does any keyed backend reject `stream_options`?** New with #169 and unverified live. The untested case is
  a strict backend that **400s on an unknown parameter**. If one does, the fix is a per-row opt-out flag, not
  removing the opt-in.
- **Are the #168 constants right in production?** 3 attempts / 200ms base / 30s cooldown after 3 failed
  requests in 120s were picked cold, never tuned against a real outage. One-line changes in `routing.ts`;
  revisit after the first real transient event (grep `#168`).
- **Should the two doors' provider dispatch ever fully merge?** Left open on purpose (#167).
- **Is `kimi-k2.7-code` a real Kimi Code model id?** Best-effort; models.dev carries no first-party
  Kimi/Moonshot provider. The row serves a live `/models` route, so the picker is the correction path.
- **ANSWERED (leg 7):** ~~is the caps table or the model list wrong too?~~ Neither — the account-path
  restriction is orthogonal to both, which is exactly why it went unnoticed.
- **ANSWERED (leg 6):** ~~does the keyed record cover an OAuth-token Provider unchanged?~~ No — but the gap
  is one seam (`keyFor`), not one executor.
- **ANSWERED (leg 5):** ~~can the two usage mappers be one function?~~ No — sibling, not shared.
- **ANSWERED (leg 4):** ~~does the retry wrap the shared error answer?~~ No — the cooldown does.
- **ANSWERED (leg 3):** ~~is `startProviderStream` a fourth copy of the OpenAI door's handlers?~~ No.
- **ANSWERED (leg 2):** ~~can the doors even set an error status on a streaming request?~~ Only if primed.
- **ANSWERED (leg 1):** ~~do non-Anthropic Providers report usage?~~ No — and as of #169 every kind does.
- **Should the door echo the resolved target instead of the requested model name?** Still open.
- **The 2026-07-25 10:11 turn reports 484 output tokens with no surviving content block.** Still unexplained.
- **Does the Agent tool ever take a non-enum model?** Re-check after a Claude Code minor bump.

## Recent context

- **The relay pattern held for seven consecutive legs**, every one gate-green, and it stopped itself cleanly
  on a human-decision boundary rather than thrashing. That stop is the design working, not a failure.
- **CLIProxyAPI is worth re-reading, not re-cloning blind.** It ships Kimi (harvested as #170) and
  Antigravity (~5,600 lines, its own spec). The source path the Kimi ticket cited **404s**, so plan to
  re-derive constants rather than quote them.
- **Response headers are load-bearing and Wisp currently discards them** — #171 adds the snapshot, and that
  is precisely the half that needs recon first.
- **The vsix is the ship vehicle for picker/native-chat surfaces**; npm releases don't reach them. #172
  changed the shared catalog, so #173 must decide explicitly whether a vsix bump is owed.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[2026-07-29-a-model-list-is-not-an-accepted-list-whitelist-the-probed-ids]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[2026-07-29-oauth-credentialed-but-keyed-on-the-wire-resolves-at-the-keyfor-seam]]
- [[a-shared-bearer-rule-or-the-oauth-row-401s-on-half-the-paths]]
- [[2026-07-29-chat-completions-usage-is-a-sibling-mapper-not-a-shared-one]]
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]]
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]]
- [[readablestream-error-discards-the-queued-chunks]]
- [[harvest-tickets-carry-body-text-blockers-not-native-links]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]]
- [[cc-transcript-rows-are-blocks-not-messages]]
