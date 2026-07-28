---
type: pick-up
project: wisp
updated: 2026-07-28
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-28): codex caps fixed, wisp 1.9.0 (extension) cut; queue empty.**
Main clean at `690fd3f`, pushed. Fix `e3ddfa2` tiers the `codexModelCaps` fallback to real
windows (5.4+/5.6 flagships 1.05M/128K; old code said 400K/32K for everything). Release is
the **vsix** (`packages/vscode/wisp-1.9.0.vsix`), NOT npm — the doors advertise ids/labels
only, so nothing in wisp-router reads the caps
([[2026-07-28-codex-caps-fallback-tiers-picker-fix-ships-in-the-vsix]]).

**Nothing is queued. No task is half-done.** Strongest lead: the user's codex 502s are
*not* fixed by this (display metadata only, bridge never trims) — the next 502's exact
error text names the enforced limit and settles whether the Codex OAuth path caps below
the 1.05M sticker. Other options in [[active-work]] Open questions, or ask the user.

## Landmines

- **The 1.9.0 vsix is built but NOT installed.** No `wisp` in the default `code` profile,
  so auto-install was skipped — the user installs it by hand (Insiders/other profile).
  Until then the picker still shows the old 400K windows and native chat lacks the
  2.0.37 marker fix.
- **Codex 502s may keep happening after the caps fix.** Expected, not a regression: the
  fix is advertised-window honesty; the 502 is upstream's own rejection
  ([[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]]).
  Operational relief stays `/compact` before codex turns.
- **The running Bridge may still predate 2.0.37.** Installed npm = 2.0.37, but installed
  ≠ running; restart before debugging any truncation / `stop_reason` behavior.
- **Fold transcript rows by `message.id` before concluding anything** —
  [[cc-transcript-rows-are-blocks-not-messages]].
- **Any new `BridgeStreamEvent` member must be handled in the Anthropic encoder's
  `push()`** — its fallthrough invents a bogus `tool_use` block for unknown events.
- **A transcript's `model` may not be the model that served the turn** —
  `bridgeServer.ts:613` echoes the *requested* name. Open question in [[active-work]];
  confirm Claude Code doesn't validate the echo before "fixing".
- **`codexModelCaps` branch order is load-bearing** — o-series before `-mini`
  (`o4-mini`), spark before `-codex` (`gpt-5.3-codex-spark`). Reorder = wrong tier.
- **`.context/` commits go to main, never a ticket branch.**

## Re-seeding the relay chain

`ready-for-agent` is empty; open backlog is **#69** (copilot-wisp launcher, needs
grooming) and **#163** (observation, no code owed). When new work exists: label tickets
`ready-for-agent`, then re-seed (state file `.claude/relay/ticket-loop.md` has
`stop: true`; re-running re-inits):

```
/relay N=1 /preset ticket-loop -> after the ticket's gate (tests green + landed, or ready-for-human relabel), run /preset wrap-up gateless: eyeball gate auto-go (unattended), /context-update, rewrite .context/pick-up.md to the next unblocked ready-for-agent ticket or 'queue empty', commit .context on main — never the ticket branch. At leg boot also read .context/pick-up.md.
```

Relay landmines (unchanged): leg boot reads `overview.md` + `active-work.md`, NOT this
file — hence the trailing "at leg boot also read .context/pick-up.md"; `/preset wrap-up`
step 1 is a human eyeball gate an unattended leg treats as auto-go; relay spawns with
`binary: claude` (native, NOT `claude-wisp`); the body uses 'queue empty' in single
quotes (double quotes shred the cmd spawn quoting).

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-28-codex-caps-fallback-tiers-picker-fix-ships-in-the-vsix]]
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]]
