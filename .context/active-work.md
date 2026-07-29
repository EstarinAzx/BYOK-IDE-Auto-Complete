---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (relay leg 1 — #165 landed)._
_At commit: 1971541 on main, pushed. The relay chain is live; leg 2 works #166._

## Current focus

**The relay is running the CLIProxyAPI harvest** (spec #164). Leg 1 landed **#165** — the first ticket of
the queue and the one the whole 502 diagnosis rests on. Eight tickets remain.

The headline finding held up: **the codex 502s are a usage-reporting bug, not a window bug.** Only
`anthropicClient` emitted a usage event, so every Codex/Grok/API-key turn closed with zeros; Claude Code
sizes auto-compaction from that number, never compacts, and the history grows until Codex rejects it.
#165 fixes that for the two Responses backends. See
[[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]].

**The verdict is not in yet.** #165's last acceptance criterion — a bridged Codex session reading non-zero
`/context` — needs a human with a restarted Bridge. Until that check runs, the diagnosis is well-evidenced
but unconfirmed.

## State

- **In flight:** nothing. Working tree clean on main; relay leg 2 spawned for #166.
- **Done this session (relay leg 1):**
  - **#165 landed** — `1971541` on main, pushed, ticket closed. `responsesUsage()` in `codex.ts` maps the
    Responses API's usage block onto the Anthropic-shaped `BridgeUsage`; `codexStream` + `xaiStream` emit
    it off the terminal frame. Cached input moves to cache-read (floored at 0), cache-write is a hard 0,
    output keeps reasoning inside it. No usage block → no event, never a synthesized zero.
  - No Bridge or encoder change was needed — `mapOAuthStream` already forwarded the usage member.
  - **Six consumer sites had to be fixed:** widening `CodexStreamEvent` broke `if text … else assume
    toolCall` narrowing in `bridgeServer.ts` (×4) and `chatProvider.ts` (×2). `tsc` caught it; Vitest did
    not. New gotcha: [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]].
  - Gate: **676/676 tests** (666 before, 10 added), `bun run compile` clean. No existing assertion touched.
- **User action pending:**
  - **Verify #165 live** — restart the Bridge on this build, bridge a Codex session, read `/context`.
    This is the #163 verdict; see [[pick-up]] for what each outcome means.
  - **Install `packages/vscode/wisp-1.9.0.vsix`** (carried over, still not done — no `wisp` in the default
    `code` profile, so install by hand wherever the extension lives).
  - **Restart the Bridge if not done since 2.0.37** — installed ≠ running. Now doubly needed (above).

## Queue — 8 tickets left, all `ready-for-agent`

| # | Ticket | Blocked by |
|---|---|---|
| ~~165~~ | ~~Codex and Grok turns report real token usage~~ | **DONE — `1971541`** |
| 166 | Codex failures classified into real HTTP statuses | — |
| 167 | Collapse three Bridge handlers into one ProviderExecutor record | 166 (165 done) |
| 168 | Transient failures retried and cooled down | 167 |
| 169 | API-key Providers report real token usage | 167 (165 done) |
| 170 | Kimi Provider via device flow | 167, 169 |
| 171 | Statusline: live context percentage + quota meters | 169 (165 done) |
| 172 | Codex Provider default model rejected by ChatGPT-account path | — |
| 173 | **Cut `wisp-router` 2.0.38** — ship the harvest | 166–172 |

Also open, ungroomed: **#69** (copilot-wisp launcher), **#163** (502 observation — #165 is its candidate
fix, but leave it open until the live `/context` check confirms).

- **Blocked:** nothing. **#166** and **#172** can start immediately; #166 is next by age.

## Pick up here

The relay is already running — leg 2 is working #166. Do not re-plan; the tickets carry their own
acceptance criteria and the ordering rationale is settled in
[[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]].

## Skills for next session

- `/preset pick-up` — session door (the baton points straight at the relay).
- `/relay N=1 /preset ticket-loop` — exact command preserved in [[pick-up]].
- `packages/tui:verify` — sandboxed CLI verification for TUI command-surface changes.

## Open questions

- **Does #165 actually kill the 502s?** Still THE decisive test — now shipped and awaiting the check.
  Restart the Bridge, bridge a Codex session, confirm `/context` reads non-zero, then watch whether the
  217k–245k cluster stops recurring. If it does not, the tighter-OAuth-cap hypothesis is back and the next
  502's exact error text is still the thing to capture.
- **ANSWERED this session:** ~~do non-Anthropic Providers report usage?~~ No — confirmed zeros. #165 now
  fixes the two Responses backends; API-key Providers stay zeroed until #169.
- **ANSWERED this session:** ~~are quota meters buildable?~~ Yes, both OAuth Providers ship the headers
  ([[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]).
- **Should the door echo the resolved target instead of the requested model name?** Unchanged, still open —
  Claude Code may validate that the name it sent comes back. Confirm before touching.
- **The 2026-07-25 10:11 turn reports 484 output tokens with no surviving content block.** Still
  unexplained.
- **Does the Agent tool ever take a non-enum model?** Re-check after a Claude Code minor bump.

## Recent context

- **CLIProxyAPI is worth re-reading, not re-cloning blind.** It is sponsor-funded and further along on
  usage, error taxonomy, retry and multi-provider auth. Most of it does not apply (many credentials per
  Provider, five dialects, plugin host, management API) — the three modules worth reading are named in the
  decision entry.
- **It ships Kimi and Antigravity today**, which is why both are on the roadmap at all; Kimi is ~570 lines
  and plain RFC 8628, Antigravity is ~5,600 and gets its own spec.
- **Response headers are load-bearing and Wisp currently discards them** — #171 adds the snapshot.
- **The vsix is the ship vehicle for picker/native-chat surfaces**; npm releases don't reach them.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]]
- [[cc-transcript-rows-are-blocks-not-messages]]
