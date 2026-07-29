---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (relay leg 3 — #167 landed)._
_At commit: `c697733` on main, pushed. The relay chain is live; leg 4 works #168._

## Current focus

**The relay is draining the CLIProxyAPI harvest** (spec #164). Legs 1–3 landed **#165** (real usage),
**#166** (error classification) and **#167** (the ProviderExecutor seam). Six remain.

The headline finding still holds: **the codex 502s are a usage-reporting bug, not a window bug.** #165 makes
Codex/Grok turns report real tokens so Claude Code can size auto-compaction; #166 makes the failure that
happens anyway say *what* failed; #167 puts both behind one seam so #168's retry is written once.

**The verdict is still not in.** #165's last acceptance criterion — a bridged Codex session reading non-zero
`/context` — needs a human with a restarted Bridge. Three shipped tickets now ride on that check.

## State

- **In flight:** nothing. Working tree clean on main; relay leg 4 due on #168.
- **Done this session (relay leg 3):**
  - **#167 landed** — `c697733` on main, pushed, ticket closed. The OpenAI door's three per-Provider chat
    handlers plus its inline keyed path are one `handleChat` over a **`ProviderExecutor` table** (four
    records: `id`, `open()` returning `BridgeStreamEvent`s, `classify()`). The **five** copy-pasted
    gateway-error sites are one `failProviderRequest`, called by **both** doors.
    `mapOAuthStream`/`mapKeyedStream` moved out of the Anthropic-door section — always door-neutral, and the
    OpenAI door renders from them now. Net **-63 lines** in one file.
  - **The Anthropic door's `startProviderStream` deliberately keeps its own arms.** Its request shaping
    carries what the records don't — the #139 system split, the #156 diagnosis chain, vision, non-strict
    tools — so folding the doors would move those onto the other door's wire. The shared piece is the error
    answer, not the request. Decision:
    [[2026-07-29-two-doors-share-the-error-answer-not-the-request]].
  - **One deliberate behaviour change: priming is uniform.** Only Codex primed before; anthropic, xai and
    keyed still wrote the 200 head before the upstream request had run. This is the fix
    [[a-door-commits-its-200-head-before-the-upstream-request-has-run]] named as #167's job.
  - Gate: **690/690 tests**, `bun run compile` clean, and — the ticket's hard bar — **no test file
    modified** (`git status` showed `bridgeServer.ts` and nothing else).
- **User action pending:**
  - **Verify #165 live** — restart the Bridge on this build, bridge a Codex session, read `/context`.
    This is the #163 verdict; see [[pick-up]] for what each outcome means.
  - **#167's manual criterion is outstanding** — one turn each through Codex, Anthropic and Grok to confirm
    all three still stream. An unattended leg cannot do it; the ticket was closed with that box unticked so
    #168–#171 unblock.
  - **Install `packages/vscode/wisp-1.9.0.vsix`** (carried over, still not done).

## Queue — 6 tickets left, all `ready-for-agent`

| # | Ticket | Blocked by |
|---|---|---|
| ~~165~~ | ~~Codex and Grok turns report real token usage~~ | **DONE — `1971541`** |
| ~~166~~ | ~~Codex failures classified into real HTTP statuses~~ | **DONE — `07969d2`** |
| ~~167~~ | ~~Collapse three Bridge handlers into one ProviderExecutor record~~ | **DONE — `c697733`** |
| 168 | Transient failures retried and cooled down | — (167 done) |
| 169 | API-key Providers report real token usage | — (165, 167 done) |
| 170 | Kimi Provider via device flow | 169 |
| 171 | Statusline: live context percentage + quota meters | 169 |
| 172 | Codex Provider default model rejected by ChatGPT-account path | — |
| 173 | **Cut `wisp-router` 2.0.38** — ship the harvest | 168–172 |

Also open, ungroomed: **#69** (copilot-wisp launcher), **#163** (502 observation — #165+#166 are its
candidate fix; leave open until the live `/context` check confirms).

- **Blocked:** #170 and #171 on #169; #173 on the rest. **#168**, **#169** and **#172** can start
  immediately; #168 is next by age.

## Pick up here

The relay is running — leg 4 takes #168. Do not re-plan; the tickets carry their own acceptance criteria and
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
  cause** rather than an opaque 502.
- **Should the two doors' provider dispatch ever fully merge?** Left open on purpose (#167). It costs one flag
  per wire difference today; revisit only when a backend actually needs the same shaping on both doors, and
  only with permission to move wire behaviour.
- **ANSWERED this session:** ~~is `startProviderStream` a fourth copy of the OpenAI door's handlers?~~ No —
  it shares their four kinds but not their request shaping. See the decision entry.
- **ANSWERED (leg 2):** ~~can the doors even set an error status on a streaming request?~~ Only if the stream
  is primed first — now uniform across every path.
- **ANSWERED (leg 1):** ~~do non-Anthropic Providers report usage?~~ No — fixed for the two Responses
  backends; API-key Providers stay zeroed until #169.
- **Should the door echo the resolved target instead of the requested model name?** Unchanged, still open.
- **The 2026-07-25 10:11 turn reports 484 output tokens with no surviving content block.** Still unexplained.
- **Does the Agent tool ever take a non-enum model?** Re-check after a Claude Code minor bump.

## Recent context

- **CLIProxyAPI is worth re-reading, not re-cloning blind.** Sponsor-funded and further along on usage, error
  taxonomy, retry and multi-provider auth. Most does not apply; the three modules worth reading are named in
  the decision entry.
- **It ships Kimi and Antigravity today** — Kimi is ~570 lines of plain RFC 8628; Antigravity is ~5,600 and
  gets its own spec.
- **Response headers are load-bearing and Wisp currently discards them** — #171 adds the snapshot.
- **The vsix is the ship vehicle for picker/native-chat surfaces**; npm releases don't reach them.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]]
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]]
- [[cc-transcript-rows-are-blocks-not-messages]]
