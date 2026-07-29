---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (CLIProxyAPI recon → spec #164 + 8 tickets)._
_At commit: 9785a29 on main, NOT pushed. No code changed this session — spec + tickets + recon only._

## Current focus

**A queue exists again.** `router-for-me/CLIProxyAPI` was cloned and mined; the harvest is spec'd as
**#164** and broken into **8 `ready-for-agent` tickets**. Nothing is built yet — the next session's job is
to run the relay, not to design anything.

The headline finding: **the codex 502s are probably a usage-reporting bug, not a window bug.** Only
`anthropicClient` ever emits a usage event, so every Codex/Grok/API-key turn closes with zeros; Claude Code
sizes auto-compaction from that number, never compacts, and the history grows until Codex rejects it. See
[[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]].

## State

- **In flight:** nothing. Working tree clean on main.
- **Done this session:**
  - Cloned CLIProxyAPI to `D:\scratch\CLIProxyAPI` (scratch, not in the repo) and read its Codex
    terminal-error module, usage accounting package, and cooldown module.
  - **Verified the usage-zeros hypothesis against real transcripts** — Anthropic-served bridged turn
    records `input_tokens: 2, cache_creation: 65366, cache_read: 51864`; a bridged turn with real
    assistant content and `stop_reason: tool_use` records all zeros.
  - Published spec **#164** + tickets **#165–#170**, plus **#173** (the 2.0.38 release cut).
  - **Live header recon** (probe script written, run, deleted — not committed): both OAuth Providers ship
    quota data, so **#171** was unblocked and labelled. Surfaced **#172** as a side effect.
  - `9785a29` — gotcha + spec committed to `.context/`.
- **User action pending:**
  - **Run the relay next session** — command in [[pick-up]].
  - **Install `packages/vscode/wisp-1.9.0.vsix`** (carried over, still not done — no `wisp` in the default
    `code` profile, so install by hand wherever the extension lives).
  - **Restart the Bridge if not done since 2.0.37** — installed ≠ running.
  - `9785a29` is unpushed.

## Queue — 9 tickets, all `ready-for-agent`

| # | Ticket | Blocked by |
|---|---|---|
| 165 | Codex and Grok turns report real token usage | — |
| 166 | Codex failures classified into real HTTP statuses | — |
| 167 | Collapse three Bridge handlers into one ProviderExecutor record | 165, 166 |
| 168 | Transient failures retried and cooled down | 167 |
| 169 | API-key Providers report real token usage | 165, 167 |
| 170 | Kimi Provider via device flow | 167, 169 |
| 171 | Statusline: live context percentage + quota meters | 165, 169 |
| 172 | Codex Provider default model rejected by ChatGPT-account path | — |
| 173 | **Cut `wisp-router` 2.0.38** — ship the harvest | 165–172 (all) |

Also open, ungroomed: **#69** (copilot-wisp launcher), **#163** (502 observation — #165 may close it).

- **Blocked:** nothing. #165, #166 and #172 can all start immediately.

## Pick up here

Run the relay. Do not re-plan — the tickets carry their own acceptance criteria and the ordering rationale
is settled in [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]].

## Skills for next session

- `/preset pick-up` — session door (the baton points straight at the relay).
- `/relay N=1 /preset ticket-loop` — exact command preserved in [[pick-up]].
- `packages/tui:verify` — sandboxed CLI verification for TUI command-surface changes.

## Open questions

- **Does #165 actually kill the 502s?** The decisive test. Ship it, bridge a Codex session, check
  `/context` reads non-zero, then watch whether the 217k–245k cluster stops recurring. If it does not, the
  tighter-OAuth-cap hypothesis is back and the next 502's exact error text is still the thing to capture.
- **ANSWERED this session:** ~~do non-Anthropic Providers report usage?~~ No — confirmed zeros.
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
