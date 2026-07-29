---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last firing (2026-07-29, relay leg 2): #166 landed.** `07969d2` on main, **pushed**, ticket closed.
Codex failures now classify into real HTTP statuses. Gate was 690/690 + `bun run compile` clean.

## The one next task: ticket #167

`ready-for-agent` = **#167–#173** (7 left). Unblocked right now: **#167** and **#172**.
**#167 is next by age** — "Collapse the three Bridge chat handlers into one ProviderExecutor record". It is
also the hinge: four of the remaining tickets (#168, #169, #170, #171) hang off it.

The relay chain is live (`.claude/relay/ticket-loop.md`, `stop: false`), so a leg should already be working
this. If no leg is running, re-issue:

```
/relay N=1 /preset ticket-loop -> after the ticket's gate (tests green + landed, or ready-for-human relabel), run /preset wrap-up gateless: eyeball gate auto-go (unattended), /context-update, rewrite .context/pick-up.md to the next unblocked ready-for-agent ticket or 'queue empty', commit .context on main — never the ticket branch. At leg boot also read .context/pick-up.md.
```

Don't re-plan or re-scope — ordering is settled in
[[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]], and each ticket carries its own
acceptance criteria.

## Landmines

- **#167's bar is "the existing suite passes with NO test file modified."** An agent that breaks behaviour has
  an obvious escape hatch in editing the test. **Test files appearing in that diff = the refactor changed
  behaviour**, and the ticket says to treat that as a bug in the refactor. (Legs 1 and 2 both *added* test
  blocks while modifying zero existing assertions — that is the distinction to hold #167 to.)
- **#167 also carries a criterion an unattended leg cannot satisfy:** "Manually verified: Codex, Anthropic and
  Grok all still stream correctly through the Bridge." Land the code on suite+compile green, then say plainly
  in the ticket comment that the manual three-way stream check is outstanding and needs a human. Don't tick it.
- **RUN `bun run compile`, NOT JUST `bun run test`.** Vitest does not typecheck. This bit leg 1 (a widened
  union broke `else`-narrowing at six sites with all 676 tests green):
  [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]].
- **The doors used to commit `writeHead(200)` before the upstream request had run** — provider streams are
  async generators, so no IO happens until the first pull. Leg 2 fixed this on the two Codex paths with
  `primeStream`; **`handleAnthropicChat`, `handleXaiChat` and the keyed OpenAI path still have the hole**, and
  #167 is exactly where it should be made uniform. Tell in a test: `expected 200 to be 502`.
  [[a-door-commits-its-200-head-before-the-upstream-request-has-run]].
- **#168's retry must never retry a classified failure.** All four #166 conditions are client errors — a
  non-`undefined` return from `classifyCodexError` *is* the do-not-retry signal.
- **The classifier is Codex-gated on purpose.** Grok rides the same Responses wire and would match on prose;
  only the `Codex API error <status>:` prefix parse is Codex-specific. Generalise it on #167's record rather
  than copying it.
- **#165 is still unverified live — this is the #163 verdict and it needs a human.** Restart the Bridge on this
  build, bridge a Codex session, read `/context`. Non-zero ⇒ diagnosis right. Still zero ⇒ the
  tighter-OAuth-cap hypothesis is back — and thanks to #166 the next failure should now arrive as a **400
  naming the cause** instead of an opaque 502. **Leave #163 open until this runs.**
- **Codex OAuth path rejects `gpt-5.3-codex` and bare `gpt-5.6`** — `gpt-5.6-sol` and `gpt-5.4` return 200.
  That's #172; don't delete the id, it's still valid for API-key callers and in caps tiering. Related: #166
  deliberately does **not** map 403 → auth, because that path 403s model rejections too.
- **Anthropic quota is a FRACTION (0.22), Codex is an INTEGER percent (7).** Normalize or #171's meters land
  100× apart. Don't filter headers by keyword regex — that missed `x-codex-primary-used-percent`.
- **Any new `BridgeStreamEvent` member must be handled in the Anthropic encoder's `push()`** — its fallthrough
  invents a bogus `tool_use` block. Reuse existing members.
- **#169 (API-key usage) should reuse #165's shape, not copy it.** `responsesUsage` is the Responses-wire
  mapping; the OpenAI-chat wire reports usage differently, so expect a sibling function.
- **A transcript's `model` may not be the model that served the turn** — the door echoes the *requested* name.
  Open question, deliberately untouched.
- **Fold transcript rows by `message.id` before concluding anything** —
  [[cc-transcript-rows-are-blocks-not-messages]].
- **`.context/` commits go to main, never a ticket branch.**
- Relay gotchas (unchanged): leg boot reads `overview.md` + `active-work.md`, NOT this file — hence the
  trailing "at leg boot also read .context/pick-up.md"; `/preset wrap-up` step 1 is a human eyeball gate an
  unattended leg treats as auto-go; relay spawns with `binary: claude` (native, NOT `claude-wisp` — legs must
  not route through the Bridge they are editing); the body uses 'queue empty' in single quotes (double quotes
  shred the cmd spawn quoting).

## Carried-over user actions

- **Verify #165 live** (above) — the decisive check, now carrying two shipped tickets.
- **Install `packages/vscode/wisp-1.9.0.vsix`** — still not done.
- **Restart the Bridge** — needed for the #165 check regardless.

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]]
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]]
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
