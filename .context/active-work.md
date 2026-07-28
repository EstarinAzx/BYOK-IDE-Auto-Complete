---
type: active-work
project: wisp
updated: 2026-07-28
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-28 by Opus 5 (codex caps fallback fix + wisp 1.9.0 vsix)._
_At commit: 690fd3f on main, pushed. No new wisp-router release (deliberate)._

## Current focus

**wisp 1.9.0 (extension) cut** — codex picker windows fixed + the vsix catches up with the
TUI line (2.0.32–2.0.37). Triggered by user-reported codex 502s: the caps *fallback* was
still advertising 400K/32K for gpt-5.x while the 5.4+/5.6 flagships are 1.05M/128K.

## State

- **In flight:** nothing. Working tree clean on main except this `.context/` wrap-up.
- **Done this session:**
  - `e3ddfa2` — `codexModelCaps` fallback tiers mirror models.dev: gpt-5.4+ flagships
    (incl. 5.6 sol/terra/luna) 1.05M/128K, `-codex`/`-mini`/`-nano` 400K/128K, spark
    128K/32K, o-series 200K/100K. Branch order load-bearing (o-series first, spark
    before `-codex`). Live models.dev lookup wins when the catalog is loaded — `openai`
    now carries the codex ids, killing the old "not in models.dev" premise.
  - `690fd3f` — release wisp 1.9.0 (vscode package bump + CHANGELOG; vsix packaged at
    `packages/vscode/wisp-1.9.0.vsix`). Carries this fix + everything since 1.8.0:
    Opus 5, `[1m]` strip, #161 cooldown, cache-advisory sharpening (#156/#158/#159/#162),
    truncation stop_reason + marker (2.0.37) — the native-chat marker fix finally has a
    build vehicle.
  - **wisp-router 2.0.38 deliberately NOT cut** — the doors advertise ids/labels only
    (no window fields on the wire), nothing npm-side reads `codexModelCaps`; an npm
    release would have been empty. Decision:
    [[2026-07-28-codex-caps-fallback-tiers-picker-fix-ships-in-the-vsix]].
  - Verified: 664/664 core tests, core typecheck, full compile, vsce package all green.
- **User action pending:**
  - **Install `packages/vscode/wisp-1.9.0.vsix`** — no `wisp` extension in the default
    `code` profile (`code --list-extensions` empty), so auto-install was skipped;
    wherever the extension actually lives (Insiders / another profile), install by hand.
  - **Restart the Bridge if not done since 2.0.37** — installed npm package is 2.0.37,
    but installed ≠ running.
- **Queue:** empty. Open: **#69** (backlog, copilot-wisp launcher, needs grooming),
  **#163** (observation, no code owed).
- **Blocked:** nothing.

## Pick up here

No queued agent work. Options in [[pick-up]] — the strongest lead is capturing the exact
text of the next codex 502 (names the enforced limit → settles whether the OAuth path
caps below the 1.05M sticker).

## Skills for next session

- `/preset pick-up` / `catch-up` — session doors.
- `/preset ticket-loop` — re-seed via `/relay` when tickets get `ready-for-agent`
  (exact command preserved in [[pick-up]]).
- `packages/tui:verify` — sandboxed CLI verification for TUI command-surface changes.

## Open questions

- **What limit does the Codex OAuth path actually enforce for the 5.6 flagships?** The
  sticker is 1.05M (models.dev), but the user's 502s predate any 1M-scale conversation
  proof. Next 502: capture the exact error text — it usually names the limit. If it's
  tight, the floating bridge-side pre-trim plan gains weight; if it's ~1M, the 502s were
  genuine overflow and `/compact` discipline is the whole answer.
- **Should the door echo the resolved target instead of the requested model name?**
  `bridgeServer.ts:613` reports the name the client asked for — cost a full
  investigation once (chasing `claude-opus-4-8` on turns served by `claude-opus-5`).
  Not changed: Claude Code may validate that the name it sent comes back. Confirm first.
- **Is there a context threshold where an upstream refusal becomes likely?** All 15
  recorded occurrences ≥56k, clustered 217k–245k. Tracked in #163.
- **The 2026-07-25 10:11 turn reports 484 output tokens with no surviving content
  block.** Every other marker-only case is 2–9 tokens. Unexplained.
- **Does the Agent tool ever take a non-enum model?** Today `model` is
  `["sonnet","opus","haiku","fable"]`, which killed slot 1.4.0. Re-check after a Claude
  Code minor bump; the 1.4.0 text is in `73e57bd`.

## Recent context

- **models.dev's `openai` provider now lists the codex ids** (5.6 trio, 5.5, 5.4,
  5.4-mini, 5.3-codex, spark) with real limits — any remaining hardcoded-caps comment
  claiming otherwise is stale.
- **The vsix is the ship vehicle for picker/native-chat surfaces** — npm releases don't
  reach them; check which surface a fix lives on before deciding which release to cut.
- **Beta token list is still the 2.1.216 capture** — only the advertised UA version
  moved to 2.1.219.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[2026-07-28-codex-caps-fallback-tiers-picker-fix-ships-in-the-vsix]]
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]]
- [[2026-07-25-truncation-reason-rides-out-of-band-marker-gated-on-answer-text]]
- [[cc-transcript-rows-are-blocks-not-messages]]
