---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (relay leg 5 — #169 landed)._
_At commit: `7b8d73d` on main, pushed. The relay chain is live; leg 6 works #170._

## Current focus

**The relay is draining the CLIProxyAPI harvest** (spec #164). Legs 1–5 landed **#165** (Responses-wire
usage), **#166** (error classification), **#167** (the ProviderExecutor seam), **#168** (retry + transient
cooldown) and **#169** (API-key usage). Four remain.

**Usage reporting is now complete across the catalog.** The headline finding — *the codex 502s are a
usage-reporting bug, not a window bug* — has had its full fix shipped: every Provider kind now reports real
tokens, so Claude Code can size auto-compaction on all of them. #169 closed the last ten rows, including the
**default** Provider (OpenCode Go).

**The verdict is still not in.** #165's last acceptance criterion — a bridged Codex session reading non-zero
`/context` — needs a human with a restarted Bridge. **Five** shipped tickets now ride on that check, and
#169 adds a second live check on the same trip.

## State

- **In flight:** nothing. Working tree clean on main; relay leg 6 due on #170.
- **Done this session (relay leg 5):**
  - **#169 landed** — `7b8d73d` on main (PR #176, squash-merged), ticket closed with **seven of eight
    acceptance criteria machine-checked**; the eighth is manual and carried (#167 precedent).
  - **The mapper is a sibling, not a shared function.** `chatCompletionsUsage` in `bridge.ts` duplicates
    every one of `responsesUsage`'s conventions instead of sharing code. The two differ only in source
    field names; unifying them would thread a field-name shim through the middle of the conversion that
    *is* the substance.
  - **The opt-in is unconditional at both call sites.** Both already pass `stream: true` regardless of what
    the client asked (the door always streams upstream), so there is no request shape where asking for
    usage would be wrong.
  - **Purely additive.** The usage chunk carries an **empty `choices` array**, so `mapKeyedStream`'s
    existing delta reads already skipped it. No new `BridgeStreamEvent` member either — `usage` existed.
  - Gate: **731/731 tests** (+12), `bun run compile` clean.
  - Decision: [[2026-07-29-chat-completions-usage-is-a-sibling-mapper-not-a-shared-one]].
    New trap: [[harvest-tickets-carry-body-text-blockers-not-native-links]].
- **User action pending:**
  - **Verify #165 live** — restart the Bridge on this build, bridge a Codex session, read `/context`.
    This is the #163 verdict; see [[pick-up]] for what each outcome means.
  - **Verify #169 live** — same trip, different door: a bridged session on the **default** Provider
    (OpenCode Go) must report non-zero tokens in `/context`. Watch for a **400 naming `stream_options`**
    rather than silence — that is the failure mode the acceptance criteria did *not* cover.
  - **#167's manual criterion is still outstanding** — one turn each through Codex, Anthropic and Grok to
    confirm all three still stream. Unchanged by #168/#169 in intent, but both touched shared paths.
  - **Install `packages/vscode/wisp-1.9.0.vsix`** (carried over, still not done).

## Queue — 4 tickets left, all `ready-for-agent`

| # | Ticket | Blocked by |
|---|---|---|
| ~~165~~ | ~~Codex and Grok turns report real token usage~~ | **DONE — `1971541`** |
| ~~166~~ | ~~Codex failures classified into real HTTP statuses~~ | **DONE — `07969d2`** |
| ~~167~~ | ~~Collapse three Bridge handlers into one ProviderExecutor record~~ | **DONE — `c697733`** |
| ~~168~~ | ~~Transient failures retried and cooled down~~ | **DONE — `89f94c5`** |
| ~~169~~ | ~~API-key Providers report real token usage~~ | **DONE — `7b8d73d`** |
| 170 | Kimi Provider via device flow | — (167, 169 done) |
| 171 | Statusline: live context percentage + quota meters | — (169 done) |
| 172 | Codex Provider default model rejected by ChatGPT-account path | — |
| 173 | **Cut `wisp-router` 2.0.38** — ship the harvest | 170–172 |

Also open, ungroomed: **#69** (copilot-wisp launcher), **#163** (502 observation — #165+#166 are its
candidate fix; leave open until the live `/context` check confirms).

- **Blocked:** only #173, on the other three. **#170**, **#171** and **#172** can all start immediately;
  **#170 is next by age.**
- **These edges are body text, not native links** — GraphQL `blockedBy` reports empty for all four. See
  [[harvest-tickets-carry-body-text-blockers-not-native-links]] before trusting a dependency query.

## Pick up here

The relay is running — leg 6 takes #170. Do not re-plan; the tickets carry their own acceptance criteria and
the ordering rationale is settled in
[[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]].

## Skills for next session

- `/preset pick-up` — session door (the baton points straight at the relay).
- `/relay N=1 /preset ticket-loop` — exact command preserved in [[pick-up]].
- `packages/tui:verify` — sandboxed CLI verification for TUI command-surface changes.

## Open questions

- **Does #165 actually kill the 502s?** Still THE decisive test. Restart the Bridge, bridge a Codex session,
  confirm `/context` reads non-zero, then watch whether the 217k–245k cluster stops recurring. If it does not,
  the tighter-OAuth-cap hypothesis is back — and #166 now means the next failure arrives as a **400 naming the
  cause** rather than an opaque 502, with #168 having already retried it three times first.
- **Does any keyed backend reject `stream_options`?** New with #169 and unverified live. The criterion covered
  a backend that *ignores* the opt-in; the untested case is a strict one that **400s on an unknown parameter**.
  Loud rather than silent post-#168. If one does, the fix is a per-row opt-out flag, not removing the opt-in.
- **Are the #168 constants right in production?** 3 attempts / 200ms base / 30s cooldown after 3 failed
  requests in 120s were picked cold, never tuned against a real outage. They are one-line changes in
  `routing.ts`; revisit after the first real transient event shows up in the Bridge log (grep `#168`).
- **Should the two doors' provider dispatch ever fully merge?** Left open on purpose (#167). It costs one flag
  per wire difference today; revisit only when a backend actually needs the same shaping on both doors, and
  only with permission to move wire behaviour.
- **ANSWERED (leg 5):** ~~can the two usage mappers be one function?~~ No — sibling, not shared. See the
  decision entry.
- **ANSWERED (leg 4):** ~~does the retry wrap the shared error answer?~~ No — the cooldown does, the retry
  wraps priming.
- **ANSWERED (leg 3):** ~~is `startProviderStream` a fourth copy of the OpenAI door's handlers?~~ No — it
  shares their four kinds but not their request shaping.
- **ANSWERED (leg 2):** ~~can the doors even set an error status on a streaming request?~~ Only if the stream
  is primed first — now uniform across every path.
- **ANSWERED (leg 1):** ~~do non-Anthropic Providers report usage?~~ No — and as of #169 every Provider kind
  does.
- **Should the door echo the resolved target instead of the requested model name?** Unchanged, still open.
- **The 2026-07-25 10:11 turn reports 484 output tokens with no surviving content block.** Still unexplained.
- **Does the Agent tool ever take a non-enum model?** Re-check after a Claude Code minor bump.

## Recent context

- **CLIProxyAPI is worth re-reading, not re-cloning blind.** Sponsor-funded and further along on usage, error
  taxonomy, retry and multi-provider auth. Most does not apply; the three modules worth reading are named in
  the decision entry.
- **It ships Kimi and Antigravity today** — Kimi is ~570 lines of plain RFC 8628 (that is #170, next up);
  Antigravity is ~5,600 and gets its own spec.
- **Response headers are load-bearing and Wisp currently discards them** — #171 adds the snapshot.
- **The vsix is the ship vehicle for picker/native-chat surfaces**; npm releases don't reach them.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
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
