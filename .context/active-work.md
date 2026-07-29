---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (relay leg 8 — #171 landed)._
_At commit: `3e0125e` on main, pushed. **One ticket left: #173, the release cut.**_

## Current focus

**Eight of the harvest's nine tickets are shipped.** Legs 1–8 landed **#165** (Responses-wire usage),
**#166** (error classification), **#167** (the ProviderExecutor seam), **#168** (retry + transient cooldown),
**#169** (API-key usage), **#170** (the Kimi Provider), **#172** (the Codex default model) and now **#171**
(the live statusline). Every leg gate-green.

**Only #173 remains — cut `wisp-router` 2.0.38 and ship the harvest.** All eight of its blockers are closed,
it carries the `ready-for-agent` label, and it is the last ticket in spec #164.

**The verdict is still not in.** #165's last acceptance criterion — a bridged Codex session reading non-zero
`/context` — needs a human with a restarted Bridge. **Eight** shipped tickets now ride on that check, and
#171's own end-to-end path (a real turn actually writing `status.json`) rides the same session.

## State

- **In flight:** nothing. Working tree clean on main; relay chain live (`stop: false`).
- **Done this session (relay leg 8):**
  - **#171 landed** — `3e0125e` on main (PR #179, squash-merged), ticket closed, all acceptance criteria
    checked.
  - **The Bridge now writes `~/.wisp/status.json`** after each bridged turn on the **Anthropic door** — the
    turn's real usage against the model's window, plus the account's utilization off the response head. The
    `wisp-slot` statusline reads it back and renders
    `[WISP haiku→gpt-5.6-sol ctx 122% 5h 4% 7d 22%]`.
  - **New pure module `packages/core/src/status.ts`** — `parseCodexQuota` / `parseAnthropicQuota` normalize
    two header families with different units onto one 0..100 scale; `contextTokens` / `contextPercent` /
    `contextWindowFor` / `buildStatus` assemble the snapshot. 20 new tests, fixtures copied verbatim from the
    recon's live dumps.
  - **Quota travels by callback, not by stream event** — the load-bearing call this session.
    [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]].
  - **Keyed Providers get no context reading**, on purpose: they report usage, but their window is only
    known from models.dev, which the door does not fetch per turn.
  - Gate: **779/779 tests** (759 → 779, +20), `bun run compile` clean in **both** packages, and an 8-path
    smoke run of the statusline script against an isolated `WISP_HOME`.
- **User action pending:**
  - **Verify #165 live** — restart the Bridge on this build, bridge a Codex session, read `/context`.
    This is the #163 verdict; see [[pick-up]] for what each outcome means.
  - **Verify #171 live** — the same trip covers it: after a real bridged turn, `~/.wisp/status.json` should
    exist and the statusline should carry `ctx …%`. Absent file ⇒ `recordStatus` never fired; present but no
    badge readings ⇒ the reader's staleness / model-match guards.
  - **Verify #169 live** — a bridged session on the **default** Provider (OpenCode Go) must report non-zero
    tokens in `/context`. Watch for a **400 naming `stream_options`** rather than silence.
  - **Verify #172 live** — a fresh Codex sign-in that never picks a model completes a turn.
  - **#167's manual criterion** — one turn each through Codex, Anthropic and Grok to confirm all three
    still stream.
  - **#170's two open criteria** — needs a Kimi Code subscription; the sign-in attempt doubles as the
    unverified-constants check.
  - **Install `packages/vscode/wisp-1.9.0.vsix`** (carried over, still not done).

## Queue — 1 ticket left

| # | Ticket | Blocked by |
|---|---|---|
| ~~165~~ | ~~Codex and Grok turns report real token usage~~ | **DONE — `1971541`** |
| ~~166~~ | ~~Codex failures classified into real HTTP statuses~~ | **DONE — `07969d2`** |
| ~~167~~ | ~~Collapse three Bridge handlers into one ProviderExecutor record~~ | **DONE — `c697733`** |
| ~~168~~ | ~~Transient failures retried and cooled down~~ | **DONE — `89f94c5`** |
| ~~169~~ | ~~API-key Providers report real token usage~~ | **DONE — `7b8d73d`** |
| ~~170~~ | ~~Kimi Provider via device flow~~ | **DONE — `d656686`** |
| ~~172~~ | ~~Codex Provider default model rejected by ChatGPT-account path~~ | **DONE — `49761d8`** |
| ~~171~~ | ~~Statusline: live context percentage + quota meters~~ | **DONE — `3e0125e`** |
| **173** | **Cut `wisp-router` 2.0.38** — ship the harvest | — (**next**, all 8 blockers closed) |

Also open, ungroomed: **#69** (copilot-wisp launcher), **#163** (502 observation — #165+#166 are its
candidate fix; leave open until the live `/context` check confirms).

- **These edges are body text, not native links** — GraphQL `blockedBy` reports empty for all of them. See
  [[harvest-tickets-carry-body-text-blockers-not-native-links]] before trusting a dependency query.
- **#173 publishes to npm.** It is the one ticket in this batch whose work is outward-facing and hard to
  reverse. It is labelled `ready-for-agent` and the spec calls it "the final leg of the relay run", so the
  authorization is explicit — but its acceptance criteria include a **judgement call** (whether a matching
  vsix bump is owed, given #172 touched the shared catalog) that must be recorded with reasoning, not
  guessed silently.

## Pick up here

The relay takes **#173** next and the harvest ships. Do not re-plan; the ticket carries its own acceptance
criteria and the release mechanics are established (tag must equal `packages/tui/package.json`'s version or
the workflow will not match).

## Skills for next session

- `/preset pick-up` — session door (the baton points straight at the relay).
- `/relay N=1 /preset ticket-loop` — exact command preserved in [[pick-up]].
- `packages/tui:verify` — sandboxed CLI verification for TUI command-surface changes. **#173 bumps the TUI
  package**, so this one is finally the right tool.

## Open questions

- **Does #165 actually kill the 502s?** Still THE decisive test. Restart the Bridge, bridge a Codex session,
  confirm `/context` reads non-zero, then watch whether the 217k–245k cluster stops recurring. If it does not,
  the tighter-OAuth-cap hypothesis is back — and #166 now means the next failure arrives as a **400 naming the
  cause** rather than an opaque 502, with #168 having already retried it three times first.
- **Is the 30-minute staleness window on the statusline snapshot right?** Picked cold (#171). Too short and a
  long thinking pause blanks the readings; too long and a finished session's numbers linger. One constant in
  `wisp-statusline.js`; revisit after living with it.
- **Should the snapshot be per-session rather than global?** `status.json` is one file for the whole machine,
  so two concurrent bridged sessions overwrite each other. The model-match guard hides the worst of it, but
  two sessions on the SAME family would still cross. Deliberately not solved — no evidence it bites yet.
- **Which Codex ids does the ChatGPT-account path actually accept?** Only `gpt-5.6-sol` and `gpt-5.4` are
  probed 200; `gpt-5.3-codex` and bare `gpt-5.6` are probed 400. The rule behind that split is unknown — the
  refused pair share no shape — so the test whitelists rather than pattern-matches.
- **Does any keyed backend reject `stream_options`?** New with #169 and unverified live. If one does, the fix
  is a per-row opt-out flag, not removing the opt-in.
- **Are the #168 constants right in production?** 3 attempts / 200ms base / 30s cooldown after 3 failed
  requests in 120s were picked cold, never tuned against a real outage. Revisit after the first real
  transient event (grep `#168`).
- **Should the two doors' provider dispatch ever fully merge?** Left open on purpose (#167).
- **Is `kimi-k2.7-code` a real Kimi Code model id?** Best-effort; the row serves a live `/models` route, so
  the picker is the correction path.
- **ANSWERED (leg 8):** ~~can quota ride the existing stream union like usage did?~~ It can, but it
  shouldn't — see the decision entry.
- **ANSWERED (leg 7):** ~~is the caps table or the model list wrong too?~~ Neither — the account-path
  restriction is orthogonal to both.
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

- **The relay pattern has now held for eight legs**, every one gate-green — including one clean stop on an
  apparent human-decision boundary and one clean restart when that boundary turned out to be stale prose.
- **`status.json` is a new compatibility surface.** It is written by core (npm/vsix) and read by the
  `wisp-slot` plugin's statusline script (marketplace). Adding fields is free; renaming or removing one needs
  both sides to move together.
- **Anything volatile written into `~/.wisp` must be excluded from the dir watcher**, or every write wakes
  both faces to re-read `config.json`. `status.json` is the first such file; it will not be the last.
- **The vsix is the ship vehicle for picker/native-chat surfaces**; npm releases don't reach them. #172
  changed the shared catalog, so #173 must decide explicitly whether a vsix bump is owed.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]]
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
