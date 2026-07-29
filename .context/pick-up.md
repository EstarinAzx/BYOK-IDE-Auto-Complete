---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last firing (2026-07-29, relay leg 1): #165 landed.** `1971541` on main, **pushed**, ticket closed.
Codex + Grok turns now report real token usage. Gate was 676/676 + `bun run compile` clean.

## The one next task: ticket #166

`ready-for-agent` = **#166–#173** (8 left). Unblocked right now: **#166** and **#172**.
**#166 is next by age** — "Codex failures classified into real HTTP statuses". It also unblocks #167, which
is the hinge the rest of the queue hangs off.

The relay chain is live (`.claude/relay/ticket-loop.md`, `stop: false`), so a leg should already be working
this. If no leg is running, re-issue:

```
/relay N=1 /preset ticket-loop -> after the ticket's gate (tests green + landed, or ready-for-human relabel), run /preset wrap-up gateless: eyeball gate auto-go (unattended), /context-update, rewrite .context/pick-up.md to the next unblocked ready-for-agent ticket or 'queue empty', commit .context on main — never the ticket branch. At leg boot also read .context/pick-up.md.
```

Don't re-plan or re-scope — ordering is settled in
[[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]], and each ticket carries its own
acceptance criteria.

## Landmines

- **RUN `bun run compile`, NOT JUST `bun run test`.** This bit leg 1: widening `CodexStreamEvent` broke
  `else`-narrowing at six consumer sites while the whole 676-test suite stayed green. Vitest does not
  typecheck. New gotcha: [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]].
- **#165 is unverified live — this is the #163 verdict and it needs a human.** Restart the Bridge on this
  build, bridge a Codex session, read `/context`. Non-zero ⇒ diagnosis right, #168 is a backstop not a
  cure. Still zero ⇒ tighter-OAuth-cap hypothesis is back, capture the next 502's exact error text.
  **Leave #163 open until this runs.**
- **#167 is the leg to read closely.** Its bar is "existing suite passes with **no test file modified**" —
  an agent that breaks behaviour has an obvious escape hatch in editing the test. Test files in that
  diff = the refactor changed behaviour. (Leg 1 added test blocks but modified no assertion; that is the
  distinction to hold #167 to.)
- **Codex OAuth path rejects `gpt-5.3-codex` and bare `gpt-5.6`** — `gpt-5.6-sol` and `gpt-5.4` return 200.
  That's #172; don't delete the id, it's still valid for API-key callers and in caps tiering.
- **Anthropic quota is a FRACTION (0.22), Codex is an INTEGER percent (7).** Normalize or #171's meters
  land 100× apart. Don't filter headers by keyword regex — that missed
  `x-codex-primary-used-percent` on the first pass.
- **Any new `BridgeStreamEvent` member must be handled in the Anthropic encoder's `push()`** — its
  fallthrough invents a bogus `tool_use` block. #165 reused the *existing* usage member to dodge this;
  keep doing that.
- **#169 (API-key usage) should reuse #165's shape, not copy it.** `responsesUsage` in `codex.ts` is the
  Responses-wire mapping; the OpenAI-chat wire reports usage differently, so expect a sibling function
  rather than a shared one. The OpenAI door's consumers now skip usage events explicitly.
- **A transcript's `model` may not be the model that served the turn** — the door echoes the *requested*
  name. Still an open question, deliberately untouched.
- **Fold transcript rows by `message.id` before concluding anything** —
  [[cc-transcript-rows-are-blocks-not-messages]].
- **`.context/` commits go to main, never a ticket branch.**
- Relay gotchas (unchanged): leg boot reads `overview.md` + `active-work.md`, NOT this file — hence the
  trailing "at leg boot also read .context/pick-up.md"; `/preset wrap-up` step 1 is a human eyeball gate an
  unattended leg treats as auto-go; relay spawns with `binary: claude` (native, NOT `claude-wisp` — legs
  must not route through the Bridge they are editing); the body uses 'queue empty' in single quotes
  (double quotes shred the cmd spawn quoting).

## Carried-over user actions

- **Verify #165 live** (above) — the decisive check.
- **Install `packages/vscode/wisp-1.9.0.vsix`** — still not done.
- **Restart the Bridge** — needed for the #165 check regardless.

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
