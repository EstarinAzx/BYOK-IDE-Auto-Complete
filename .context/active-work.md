---
type: active-work
project: wisp
updated: 2026-07-25
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-25 by Opus 5 (2.0.36 release + `[1m]` investigation)._
_At commit: 0965cab on main, pushed. Tag v2.0.36, Release CI green, npm `wisp-router@2.0.36` live._

## Current focus

**2.0.36 shipped.** Opus 5 support (effort ladder, catalog default, claude-cli 2.1.219
UA), the `[1m]` tier strip, and wisp-slot — which went 1.3.0 → 1.4.0 → **1.5.0** inside
one day, the 1.4.0 feature reverted after the Agent tool's contract was actually checked.

## State

- **In flight:** nothing. Working tree clean on main except this `.context/` wrap-up.
  Main pushed through 0965cab.
- **Done this session:**
  - Merged `claude/opus-5-wisp-models-6iwgcc` to main (ff), released **2.0.36** —
    tag pushed, Release run `30142298815` success, `npm view wisp-router version` → 2.0.36.
  - `c667bc8` — `stripModelTier` in `anthropic.ts`, applied at the single `model` field
    in `buildAnthropicMessagesBody`. 3 tests, 658 core green. Live round trip verified:
    typed `claude-opus-5[1m]` → wire `claude-opus-5` → HTTP 200.
  - `0965cab` — reverted wisp-slot step 5a (1.4.0 → **1.5.0**); one rationalization row
    kept as the tombstone. Design + evidence in
    [[2026-07-25-1m-tier-is-a-harness-label-not-a-wire-model]].
  - Re-pinned the `opus` family route: was `anthropic/claude-opus-4-8` (the silent
    downgrade the last baton warned about), now `anthropic/claude-opus-5`.
  - User's `~/.claude/settings.json` `model` moved off the bare `opus` family word to a
    `[1m]` id, so sessions boot budgeted at 1M.
- **User action pending:** `npm i -g wisp-router@2.0.36` + restart the Bridge — the
  running one is **2.0.35**, which drops `output_config.effort` on every opus-5 turn
  (`isClaude5` there is `includes('fable-5') || includes('sonnet-5')`) and does not strip
  the tier.
- **Queue:** empty. Open: #69 (backlog, copilot-wisp launcher, needs grooming).
- **Blocked:** nothing.

## Pick up here

No queued agent work. Options in [[pick-up]]; the one live thread is the discovery-id
budget question below.

## Skills for next session

- `/preset pick-up` / `catch-up` — session doors.
- `/preset ticket-loop` — re-seed via `/relay` when tickets get `ready-for-agent`
  (exact command preserved in [[pick-up]]).
- `packages/tui:verify` — sandboxed CLI verification for TUI command-surface changes.

## Open questions

- ~~Do alias / Provider rows get a 1M budget?~~ **RESOLVED 2026-07-25: yes, name the
  alias with the tier.** Claude Code's window function tests `/\[1m\]/i` against the raw
  model string as its FIRST branch, with no registry lookup, so `claude-wisp-<alias>[1m]`
  budgets 1M exactly like a native suffixed id. `withAlias` imposes no charset rule and
  the door advertises the bracketed name verbatim. Full code path + the two limits (no
  "(1M context)" label; anthropic non-Haiku Targets only) in
  [[2026-07-25-1m-tier-is-a-harness-label-not-a-wire-model]].
- **Does the Agent tool ever take a non-enum model?** Today `model` is
  `["sonnet","opus","haiku","fable"]`, which is what killed slot 1.4.0. Worth a re-check
  after a Claude Code minor bump; the 1.4.0 text is in `73e57bd` if it ever loosens.
- **2.1.220's `/context` accounting is wrong**, not just cosmetic — it blocks real turns.
  Nothing to fix here; captured in
  [[claude-code-can-refuse-a-turn-before-the-bridge-ever-sees-it]] so the next
  investigation does not start by suspecting the Bridge.

## Recent context

- **The `[1m]` question is closed** (both baton checks): Anthropic 404s a suffixed id,
  so the tier never was a wire model; and opus-5 effort, previously carried as UNPROBED
  in a source comment, live-probed at `xhigh` with a thinking block in the reply.
- **Diagnostic technique worth keeping:** Claude Code's own transcript
  (`~/.claude/projects/<slug>/*.jsonl`) settles "harness or bridge?" faster than the
  serve log — per-event timestamps expose a local block as a millisecond gap, and each
  assistant record carries its `usage` block.
- **Live-probe technique (unchanged):** scratchpad script inside `packages/core`
  importing `./src/*` with stored `~/.wisp/auth.json` creds; delete it after.
- **Beta token list is still the 2.1.216 capture** — only the advertised UA version moved
  to 2.1.219. A real 2.1.220 capture may differ; re-capture before assuming parity.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[2026-07-25-1m-tier-is-a-harness-label-not-a-wire-model]]
- [[claude-code-can-refuse-a-turn-before-the-bridge-ever-sees-it]]
- [[2026-07-23-usage-limit-cooldown-family-fallback-only]]
