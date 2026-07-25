---
type: active-work
project: wisp
updated: 2026-07-25
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-25 by Opus 5 (truncation stop_reason fix + 2.0.37 release)._
_At commit: b25e862 on main, pushed. Tag v2.0.37 pushed._

## Current focus

**2.0.37 shipped** — one fix, cut same day as 2.0.36. A truncated Anthropic turn now reports its
real `stop_reason` instead of being flattened to `end_turn` / `tool_use`.

## State

- **In flight:** nothing. Working tree clean on main except this `.context/` wrap-up.
- **Done this session:**
  - `641f544` — `truncation` BridgeStreamEvent carries upstream's cut-short reason
    (`max_tokens` / `content_filter` / `refusal`) into the reply's `stop_reason`, outranking
    `tool_use`. Both door renderers (SSE encoder + buffered reducer) had hardcoded
    `sawTool ? 'tool_use' : 'end_turn'`. Narrowed `anthropicTruncationReason`'s return type so the
    reason threads to the wire without casts.
  - `39b4100` — the visible marker is gated on `sawDelta`, not `delivered`. The first cut suppressed
    it whenever *anything* arrived, and thinking counts — which would have blanked the commonest
    shape on record. Design + the three sub-rules in
    [[2026-07-25-truncation-reason-rides-out-of-band-marker-gated-on-answer-text]].
  - `b25e862` — release 2.0.37 (version bump + CHANGELOG).
  - Filed **#163** — high-context refusal observation. Corrects a bug report that alleged content
    loss, discarded tokens, and a `stop_reason` contract violation; all three were per-row transcript
    artifacts ([[cc-transcript-rows-are-blocks-not-messages]]).
  - Cleared all 3 held Wisp snapshots (`kimi`, `minimax`, `probe[1m]`) — every revert was a no-op
    (`was X → X`), so nothing live had drifted. Dropped the leftover `probe[1m]` test alias. Store
    now reports `held: {}` and the statusline badge loses `!SNAP×3`.
- **User action pending:** `npm i -g wisp-router@2.0.37` + restart the Bridge. The fix only reaches
  Claude Code through the published package; an unrestarted Bridge keeps mislabelling refusals.
- **Queue:** empty. Open: **#69** (backlog, copilot-wisp launcher, needs grooming),
  **#163** (observation, no code owed).
- **Blocked:** nothing.

## Pick up here

No queued agent work. Options in [[pick-up]].

## Skills for next session

- `/preset pick-up` / `catch-up` — session doors.
- `/preset ticket-loop` — re-seed via `/relay` when tickets get `ready-for-agent`
  (exact command preserved in [[pick-up]]).
- `packages/tui:verify` — sandboxed CLI verification for TUI command-surface changes.

## Open questions

- **Should the door echo the resolved target instead of the requested model name?**
  `bridgeServer.ts:613` reports the name the client asked for, so after a route change a transcript
  records a model that never served the turn — this cost a full investigation this session (chasing
  `claude-opus-4-8` on turns actually served by `claude-opus-5`). Not changed: Claude Code may
  validate that the name it sent comes back. Confirm that before touching it.
- **Is there a context threshold where an upstream refusal becomes likely?** All 15 recorded
  occurrences sit at ≥56k, clustered 217k–245k, and three consecutive ones answered "continue" /
  "hello" with 3–5 output tokens. Success rate at comparable context is unmeasured — a lead, not a
  finding. Tracked in #163.
- **The 2026-07-25 10:11 turn reports 484 output tokens with no surviving content block.** Every
  other marker-only case is 2–9 tokens. Unexplained.
- **Does the Agent tool ever take a non-enum model?** Today `model` is
  `["sonnet","opus","haiku","fable"]`, which killed slot 1.4.0. Re-check after a Claude Code minor
  bump; the 1.4.0 text is in `73e57bd`.

## Recent context

- **`[1m]` is closed** — a trailing tier is a harness-local budget label, never a wire model, and
  aliases can carry it because Claude Code regexes the raw string before any registry lookup.
- **Diagnostic technique, sharpened:** Claude Code's own transcript settles "harness or bridge?"
  faster than the serve log — but fold rows by `message.id` first, or it manufactures defects that
  aren't there. Cost a whole false bug report this session.
- **Beta token list is still the 2.1.216 capture** — only the advertised UA version moved to 2.1.219.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[2026-07-25-truncation-reason-rides-out-of-band-marker-gated-on-answer-text]]
- [[cc-transcript-rows-are-blocks-not-messages]]
- [[2026-07-25-1m-tier-is-a-harness-label-not-a-wire-model]]
- [[claude-code-can-refuse-a-turn-before-the-bridge-ever-sees-it]]
