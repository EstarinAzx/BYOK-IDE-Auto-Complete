---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-29): CLIProxyAPI mined, harvest spec'd. Queue is FULL — 9 tickets.**
Main clean at `9785a29` (**unpushed**). No code changed — spec + tickets + recon only.

## The one next task: run the relay

`ready-for-agent` = **#165–#173**. Three are unblocked right now (**#165**, **#166**, **#172**).
**#173 cuts `wisp-router` 2.0.38 and is blocked by all eight others** — it is the last leg by
construction, and the ticket that makes any of this reach users.
Don't re-plan or re-scope — ordering is settled in
[[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]], and each ticket carries its own
acceptance criteria.

```
/relay N=1 /preset ticket-loop -> after the ticket's gate (tests green + landed, or ready-for-human relabel), run /preset wrap-up gateless: eyeball gate auto-go (unattended), /context-update, rewrite .context/pick-up.md to the next unblocked ready-for-agent ticket or 'queue empty', commit .context on main — never the ticket branch. At leg boot also read .context/pick-up.md.
```

The relay state file `.claude/relay/ticket-loop.md` still holds `stop: true` + a stale "CHAIN COMPLETE /
queue empty" handoff from 2026-07-22. **Re-running re-inits it** — that's expected, not a problem.
`max_legs: 20` is enough for nine tickets at `N=1`.

## Landmines

- **#167 is the leg to read closely.** Its bar is "existing suite passes with **no test file modified**" —
  an agent that breaks behaviour has an obvious escape hatch in editing the test. Test files in that
  diff = the refactor changed behaviour.
- **#165 is the 502 verdict.** Once it lands, bridge a Codex session and check `/context` reads non-zero.
  Non-zero ⇒ diagnosis right, #168 is a backstop not a cure. Still zero ⇒ tighter-OAuth-cap hypothesis is
  back, capture the next 502's exact error text.
- **Codex OAuth path rejects `gpt-5.3-codex` and bare `gpt-5.6`** — `gpt-5.6-sol` and `gpt-5.4` return 200.
  That's #172; don't delete the id, it's still valid for API-key callers and in caps tiering.
- **Anthropic quota is a FRACTION (0.22), Codex is an INTEGER percent (7).** Normalize or #171's meters
  land 100× apart. Don't filter headers by keyword regex — that missed
  `x-codex-primary-used-percent` on the first pass.
- **Any new `BridgeStreamEvent` member must be handled in the Anthropic encoder's `push()`** — its
  fallthrough invents a bogus `tool_use` block. #165 deliberately reuses the *existing* usage member to
  dodge this; don't add a new one.
- **A transcript's `model` may not be the model that served the turn** — the door echoes the *requested*
  name. Still an open question, deliberately untouched.
- **Fold transcript rows by `message.id` before concluding anything** —
  [[cc-transcript-rows-are-blocks-not-messages]].
- **`.context/` commits go to main, never a ticket branch.**
- Relay gotchas (unchanged): leg boot reads `overview.md` + `active-work.md`, NOT this file — hence the
  trailing "at leg boot also read .context/pick-up.md"; `/preset wrap-up` step 1 is a human eyeball gate an
  unattended leg treats as auto-go; relay spawns with `binary: claude` (native, NOT `claude-wisp`); the
  body uses 'queue empty' in single quotes (double quotes shred the cmd spawn quoting).

## Carried-over user actions

- **Install `packages/vscode/wisp-1.9.0.vsix`** — still not done.
- **Restart the Bridge if not done since 2.0.37.**
- **`9785a29` is unpushed.**

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
