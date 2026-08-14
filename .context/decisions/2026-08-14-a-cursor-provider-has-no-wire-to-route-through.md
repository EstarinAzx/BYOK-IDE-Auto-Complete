---
type: decision
project: wisp
date: 2026-08-14
tags: [context, decision, providers, cursor, traycer]
---

# A Cursor Provider has no wire to route through

## Decision

**No Cursor Provider for Wisp — no-build, settled by reference recon, not by guesswork.** The Traycer
repository (`github.com/traycerai/traycer`, shallow clone at `D:\scratch\traycer`) was examined specifically
because it ships a "cursor" provider. Verdict: nothing there is a model wire, so there is nothing for Wisp's
Bridge to route a turn through. Recorded in spec #201's Out of Scope; this page is the durable why.

## Why

**Traycer's "provider" and Wisp's "Provider" are different products wearing one word.** A Traycer provider is
a coding-agent *harness identity* — its closed host spawns the vendor's CLI or drives the vendor's SDK and
streams runtime events back. A Wisp Provider is a *credential-holding model backend* — Wisp keeps the OAuth
token and speaks the raw Messages/Responses HTTP itself. The whole Traycer clone contains zero raw model-API
calls: no `api.anthropic.com`, no `/v1/messages`, no token exchange for any model vendor. Their claude-code
and codex rows work by spawning `claude`/`codex` and letting *those* keep `~/.claude`/`~/.codex`.

**The cursor row specifically is the thinnest of all.** GUI-only, driven through `@cursor/sdk` in local mode,
authenticated by a user API key (`CURSOR_API_KEY`, AES-GCM-stored host-side, dashboard user-keys page). No
OAuth, no login flow (`loginCapability: null`), no TUI launch path, and the open repo never even names the
binary. There is no Cursor chat-completions-shaped endpoint behind a user key to imitate.

**An agent SDK is the wrong shape to sit behind the Bridge.** `@cursor/sdk` runs an agent loop — tools,
edits, permission modes (`full_access` only). The Bridge's contract is a model turn: messages in, streamed
tokens out. Putting an agent runtime behind `/v1/messages` nests an agent inside a model call — latency,
cost and semantics all wrong, and every Claude Code feature that rides the wire (advisor blocks, cache
breakpoints, usage accounting) would be emulated against a surface that has none of it.

**The reverse-engineering path was considered and rejected.** Cursor's internal IDE endpoints are fenced
(checksummed clients, no published contract) and carry ToS risk on a subscription the user pays for. That is
a different risk class from Codex/Anthropic OAuth, where the CLIs' own documented flows are being reused.

## Reversibility

**Nothing built, nothing to unwind.** Re-open if any of these change:

- Cursor ships a raw model API usable with user API keys (a completions/messages-shaped endpoint with a
  published contract). That is the only shape Wisp can route.
- The user's actual want turns out to be *harness* multiplexing (drive `cursor-agent` beside Claude Code)
  rather than a model backend — that is a different product surface (closer to #69's copilot-wisp launcher
  than to a Provider), and should be scoped as such, not as a Provider row.

## Related

- [[decisions]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
