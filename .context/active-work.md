---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (relay leg 4 — #168 landed)._
_At commit: `89f94c5` on main, pushed. The relay chain is live; leg 5 works #169._

## Current focus

**The relay is draining the CLIProxyAPI harvest** (spec #164). Legs 1–4 landed **#165** (real usage),
**#166** (error classification), **#167** (the ProviderExecutor seam) and **#168** (retry + transient
cooldown). Five remain.

The headline finding still holds: **the codex 502s are a usage-reporting bug, not a window bug.** #165 makes
Codex/Grok turns report real tokens so Claude Code can size auto-compaction; #166 makes the failure that
happens anyway say *what* failed; #167 put both behind one seam; #168 now retries the failures that were only
ever blips and stops re-picking a Provider that keeps dying.

**The verdict is still not in.** #165's last acceptance criterion — a bridged Codex session reading non-zero
`/context` — needs a human with a restarted Bridge. **Four** shipped tickets now ride on that check.

## State

- **In flight:** nothing. Working tree clean on main; relay leg 5 due on #169.
- **Done this session (relay leg 4):**
  - **#168 landed** — `89f94c5` on main (PR #175, squash-merged), ticket closed with **all eleven
    acceptance criteria machine-checked**; no manual criterion outstanding on it.
  - **The retry wraps `openPrimed`, not `failProviderRequest`.** The handoff predicted the latter; that
    turned out right for the **cooldown** (`noteProviderError` already sits there and both doors call it, so
    it landed once for free) and wrong for the **retry** — the terminal answer has no way to re-open a
    stream. #167's uniform priming is what made the boundary expressible at all: everything up to and
    including the first pull is retryable, everything after has reached the client.
  - **Two cooldown channels, two maps.** Not one map with careful arithmetic — separate maps make
    "blip sidelines a Provider for days" and "six-day quota shortened to seconds" impossible to *write*.
    `coolingUntil` reports the later horizon; `noteProviderError` returns after a usage-limit hit.
  - **The streak is a 120s decay window, not a success hook** — keeps the store pure (no new call sites in
    either door) and is the honest reading of "repeated": repeated *recently*.
  - Gate: **719/719 tests** (+29), `bun run compile` clean.
  - Decision: [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]].
    New trap: [[readablestream-error-discards-the-queued-chunks]].
- **User action pending:**
  - **Verify #165 live** — restart the Bridge on this build, bridge a Codex session, read `/context`.
    This is the #163 verdict; see [[pick-up]] for what each outcome means.
  - **#167's manual criterion is still outstanding** — one turn each through Codex, Anthropic and Grok to
    confirm all three still stream. Unchanged by #168, and now doubly worth doing: #168 touched the same
    open+prime path on both doors.
  - **Install `packages/vscode/wisp-1.9.0.vsix`** (carried over, still not done).

## Queue — 5 tickets left, all `ready-for-agent`

| # | Ticket | Blocked by |
|---|---|---|
| ~~165~~ | ~~Codex and Grok turns report real token usage~~ | **DONE — `1971541`** |
| ~~166~~ | ~~Codex failures classified into real HTTP statuses~~ | **DONE — `07969d2`** |
| ~~167~~ | ~~Collapse three Bridge handlers into one ProviderExecutor record~~ | **DONE — `c697733`** |
| ~~168~~ | ~~Transient failures retried and cooled down~~ | **DONE — `89f94c5`** |
| 169 | API-key Providers report real token usage | — (165, 167 done) |
| 170 | Kimi Provider via device flow | 169 |
| 171 | Statusline: live context percentage + quota meters | 169 |
| 172 | Codex Provider default model rejected by ChatGPT-account path | — |
| 173 | **Cut `wisp-router` 2.0.38** — ship the harvest | 169–172 |

Also open, ungroomed: **#69** (copilot-wisp launcher), **#163** (502 observation — #165+#166 are its
candidate fix; leave open until the live `/context` check confirms).

- **Blocked:** #170 and #171 on #169; #173 on the rest. **#169** and **#172** can start immediately;
  **#169 is next by age** — and it unblocks two of the three remaining tickets, so it is also the
  throughput pick.

## Pick up here

The relay is running — leg 5 takes #169. Do not re-plan; the tickets carry their own acceptance criteria and
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
- **Are the #168 constants right in production?** 3 attempts / 200ms base / 30s cooldown after 3 failed
  requests in 120s were picked cold, never tuned against a real outage. They are one-line changes in
  `routing.ts`; revisit after the first real transient event shows up in the Bridge log (grep `#168`).
- **Should the two doors' provider dispatch ever fully merge?** Left open on purpose (#167). It costs one flag
  per wire difference today; revisit only when a backend actually needs the same shaping on both doors, and
  only with permission to move wire behaviour.
- **ANSWERED (leg 4):** ~~does the retry wrap the shared error answer?~~ No — the cooldown does, the retry
  wraps priming. See the decision entry.
- **ANSWERED (leg 3):** ~~is `startProviderStream` a fourth copy of the OpenAI door's handlers?~~ No — it
  shares their four kinds but not their request shaping.
- **ANSWERED (leg 2):** ~~can the doors even set an error status on a streaming request?~~ Only if the stream
  is primed first — now uniform across every path, and #168 depends on that.
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
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]]
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]]
- [[readablestream-error-discards-the-queued-chunks]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]]
- [[cc-transcript-rows-are-blocks-not-messages]]
