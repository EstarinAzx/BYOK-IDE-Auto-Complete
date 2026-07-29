---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (relay leg 2 — #166 landed)._
_At commit: `07969d2` on main, pushed. The relay chain is live; leg 3 works #167._

## Current focus

**The relay is draining the CLIProxyAPI harvest** (spec #164). Legs 1–2 landed **#165** (real usage) and
**#166** (error classification) — the two tickets the 502 diagnosis rests on. Seven remain.

The headline finding still holds: **the codex 502s are a usage-reporting bug, not a window bug.** #165 makes
Codex/Grok turns report real tokens so Claude Code can size auto-compaction; #166 makes the failure that
happens anyway say *what* failed, so the client compacts instead of retrying a request that can only get
bigger.

**The verdict is still not in.** #165's last acceptance criterion — a bridged Codex session reading non-zero
`/context` — needs a human with a restarted Bridge. Two shipped tickets now ride on that check.

## State

- **In flight:** nothing. Working tree clean on main; relay leg 3 due on #167.
- **Done this session (relay leg 2):**
  - **#166 landed** — `07969d2` on main, pushed, ticket closed. `classifyCodexError(status, body)` in
    `codex.ts` recognises four backend conditions in every wire form (upstream code / error type / message
    prose); `classifyCodexErrorMessage` adapts it to the thrown `Codex API error <status>: <body>` string the
    Bridge actually holds. Both Codex-reachable doors answer with the mapped status and log the code.
    **Unmatched → undefined → the existing 502 stands.**
  - **Uncovered and fixed a live hole:** the doors called `res.writeHead(200, …)` **before** the upstream
    request had run at all — provider streams are async generators, so the fetch (and its 400) only fires on
    the first pull, by which time `headersSent` was true. Every pre-stream failure was a **200 with an empty
    body**; the 502 branch was dead code. `primeStream` pulls the first event ahead of the head. New gotcha:
    [[a-door-commits-its-200-head-before-the-upstream-request-has-run]].
  - Gate: **690/690 tests** (676 before, 14 added), `bun run compile` clean. No existing assertion touched.
  - Decision recorded: [[2026-07-29-codex-failures-classified-unmatched-stays-502]].
- **User action pending:**
  - **Verify #165 live** — restart the Bridge on this build, bridge a Codex session, read `/context`.
    This is the #163 verdict; see [[pick-up]] for what each outcome means.
  - **Install `packages/vscode/wisp-1.9.0.vsix`** (carried over, still not done).
  - **Restart the Bridge if not done since 2.0.37** — installed ≠ running. Now doubly needed (above).

## Queue — 7 tickets left, all `ready-for-agent`

| # | Ticket | Blocked by |
|---|---|---|
| ~~165~~ | ~~Codex and Grok turns report real token usage~~ | **DONE — `1971541`** |
| ~~166~~ | ~~Codex failures classified into real HTTP statuses~~ | **DONE — `07969d2`** |
| 167 | Collapse three Bridge handlers into one ProviderExecutor record | — (165, 166 done) |
| 168 | Transient failures retried and cooled down | 167 |
| 169 | API-key Providers report real token usage | 167 |
| 170 | Kimi Provider via device flow | 167, 169 |
| 171 | Statusline: live context percentage + quota meters | 169 |
| 172 | Codex Provider default model rejected by ChatGPT-account path | — |
| 173 | **Cut `wisp-router` 2.0.38** — ship the harvest | 167–172 |

Also open, ungroomed: **#69** (copilot-wisp launcher), **#163** (502 observation — #165+#166 are its
candidate fix; leave open until the live `/context` check confirms).

- **Blocked:** nothing. **#167** and **#172** can start immediately; #167 is next by age and unblocks four.

## Pick up here

The relay is running — leg 3 takes #167. Do not re-plan; the tickets carry their own acceptance criteria and
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
  cause** rather than an opaque 502, which is itself the capture the old gotcha asked for.
- **ANSWERED this session:** ~~can the doors even set an error status on a streaming request?~~ Not before
  #166 — see the gotcha. They can now, on the two Codex paths; the other three are #167's job.
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
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]]
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]]
- [[cc-transcript-rows-are-blocks-not-messages]]
