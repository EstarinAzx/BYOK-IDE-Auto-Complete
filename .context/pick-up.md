---
type: pick-up
project: wisp
updated: 2026-07-25
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-25): 2.0.37 released and pushed; queue empty.** Main clean at `b25e862`,
tag `v2.0.37`, Release run `30154686109` success, `npm view wisp-router version` → 2.0.37.

What landed: the Anthropic door now reports a truncated turn's real `stop_reason` (`641f544`), the
visible marker is gated on answer text so a thinking-only refusal isn't blanked (`39b4100`), release
commit `b25e862`. Also filed **#163** and cleared all 3 held Wisp snapshots.

**Nothing is queued. No task is half-done.** Pick from Open questions in [[active-work]] or ask the
user.

## Landmines

- **The running Bridge is probably still 2.0.36.** Ask before debugging any truncation or
  `stop_reason` behavior — 2.0.36 flattens every cut-short turn to `end_turn` / `tool_use`.
  `npm i -g wisp-router@2.0.37` + restart fixes it. (Same trap as last session with 2.0.35→2.0.36:
  the *installed* package updating is not the *running* process updating.)
- **Fold transcript rows by `message.id` before concluding anything.** A row is one content BLOCK;
  `id` / `stop_reason` / `usage` repeat across a message's rows. Reading per-row manufactured three
  defects that did not exist and cost most of a session —
  [[cc-transcript-rows-are-blocks-not-messages]].
- **Any new `BridgeStreamEvent` member must be handled in the Anthropic encoder's `push()`.** Its
  fallthrough treats an unrecognized event as a client tool call, so an unhandled one invents a
  bogus `tool_use` block *and* mislabels `stop_reason`. The buffered reducer is guarded; the live
  encoder is not.
- **A transcript's `model` may not be the model that served the turn.** `bridgeServer.ts:613` echoes
  the *requested* name. After a route change this reads as a stale label — it sent this session
  chasing `claude-opus-4-8` on turns actually served by `claude-opus-5`. Open question in
  [[active-work]]; don't "fix" it before confirming Claude Code doesn't validate the echo.
- **The VS Code marker fix has not shipped.** `chatProvider.ts` rides the `.vsix`, not npm, so
  native chat only changes on a new extension build.
- **`.context/` commits go to main, never a ticket branch** — otherwise a session booting on main
  reads a stale baton.

## Re-seeding the relay chain

`ready-for-agent` is empty; open backlog is **#69** — copilot-wisp launcher for the Copilot CLI
(`enhancement`, needs grooming before it's agent-grabbable). **#163** is an observation, no code
owed. When new work exists: label tickets `ready-for-agent`, then re-seed with the exact command
below (state file `.claude/relay/ticket-loop.md` has `stop: true`; re-running the command re-inits
it):

```
/relay N=1 /preset ticket-loop -> after the ticket's gate (tests green + landed, or ready-for-human relabel), run /preset wrap-up gateless: eyeball gate auto-go (unattended), /context-update, rewrite .context/pick-up.md to the next unblocked ready-for-agent ticket or 'queue empty', commit .context on main — never the ticket branch. At leg boot also read .context/pick-up.md.
```

Relay landmines (unchanged): leg boot reads `overview.md` + `active-work.md`, NOT this file — hence
the trailing "at leg boot also read .context/pick-up.md"; `/preset wrap-up`'s step 1 is a human
eyeball gate an unattended leg must treat as auto-go; relay spawns with `binary: claude` (native,
NOT `claude-wisp`) — wisp legs die at boot when no Bridge runs at 127.0.0.1:41184, so keep the state
file's `binary:` as-is; the body uses 'queue empty' in single quotes (double quotes shred the cmd
spawn quoting).

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-25-truncation-reason-rides-out-of-band-marker-gated-on-answer-text]]
- [[cc-transcript-rows-are-blocks-not-messages]]
