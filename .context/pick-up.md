---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last firing (2026-07-29, relay leg 3): #167 landed.** `c697733` on main, **pushed**, ticket closed.
The OpenAI door's three per-Provider handlers + its inline keyed path are one `handleChat` over a
`ProviderExecutor` table, and the five gateway-error sites are one `failProviderRequest` shared by both
doors. Gate was 690/690 + `bun run compile` clean, **with no test file modified**.

## The one next task: ticket #168

`ready-for-agent` = **#168–#173** (6 left). Unblocked right now: **#168**, **#169** and **#172**.
**#168 is next by age** — "Transient failures retried and cooled down". It is the ticket #167 was sequenced
ahead of, so the retry lands **once**, in the collapsed handler.

The relay chain is live (`.claude/relay/ticket-loop.md`, `stop: false`), so a leg should already be working
this. If no leg is running, re-issue:

```
/relay N=1 /preset ticket-loop -> after the ticket's gate (tests green + landed, or ready-for-human relabel), run /preset wrap-up gateless: eyeball gate auto-go (unattended), /context-update, rewrite .context/pick-up.md to the next unblocked ready-for-agent ticket or 'queue empty', commit .context on main — never the ticket branch. At leg boot also read .context/pick-up.md.
```

Don't re-plan or re-scope — ordering is settled in
[[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]], and each ticket carries its own
acceptance criteria.

## Where #168's code goes (read this before opening the file)

`packages/core/src/bridgeServer.ts` now has the seam #168 was waiting for:

- **`providerExecutors`** — four records (`codex`, `anthropic`, `xai`, `keyed`), each with `id`, `open()`
  returning `BridgeStreamEvent`s, and `classify()`. `executorFor(provider)` picks one; the `keyed` record
  matches everything and is deliberately **last**.
- **`failProviderRequest(res, provider, err, controller, executor, midStreamFrame?)`** — the ONE
  gateway-error answer, called by both doors' catch blocks. **This is where the retry wraps.** Write it once.
- **`primeStream`** — pulls the first upstream event before the 200 SSE head. Now uniform across all four
  records, so "the stream failed before delivering anything" is observable *before* headers are sent, which
  is exactly the condition #168 retries on.
- **`createProviderCooldowns()` (`routing.ts`)** — the existing per-Provider store #168 must **extend**, not
  duplicate. `noteProviderError` already feeds it.

## Landmines

- **`classify()` returning non-`undefined` IS the do-not-retry signal.** All four #166 conditions are client
  errors that cannot succeed on a retry. Read the record, don't re-sniff the error string.
- **Never let the two cooldown channels contaminate each other** — a blip must not sideline a Provider for
  days, and a real multi-day quota exhaustion must not be shortened to seconds. The ticket makes both
  directions explicit acceptance criteria; a capacity rejection ("model is at capacity") is **transient**,
  not exhausted quota.
- **Jitter must take an injected random source.** Sampling in a test is flaky by construction — and
  `Math.random()` is also unavailable inside workflow scripts, so injection is the house style anyway.
- **A partial stream is never retried.** Surface what arrived with the end-of-stream marker. Discarding
  delivered content would resurrect the #89 empty envelope.
- **RUN `bun run compile`, NOT JUST `bun run test`.** Vitest does not typecheck. This bit leg 1 (a widened
  union broke `else`-narrowing at six sites with all 676 tests green):
  [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]].
- **The Anthropic door's `startProviderStream` is NOT a fifth copy to fold in.** #167 looked and decided
  against it: its request shaping carries the #139 system split, the #156 chain, vision and non-strict tools,
  so merging moves wire behaviour. Retry attaches at the shared error answer instead. Full reasoning:
  [[2026-07-29-two-doors-share-the-error-answer-not-the-request]].
- **Any new `BridgeStreamEvent` member must be handled in the Anthropic encoder's `push()`** — its
  fallthrough invents a bogus `tool_use` block. Reuse existing members.
- **#165 is still unverified live — this is the #163 verdict and it needs a human.** Restart the Bridge on
  this build, bridge a Codex session, read `/context`. Non-zero ⇒ diagnosis right. Still zero ⇒ the
  tighter-OAuth-cap hypothesis is back — and thanks to #166 the next failure should now arrive as a **400
  naming the cause** instead of an opaque 502. **Leave #163 open until this runs.**
- **Codex OAuth path rejects `gpt-5.3-codex` and bare `gpt-5.6`** — `gpt-5.6-sol` and `gpt-5.4` return 200.
  That's #172; don't delete the id, it's still valid for API-key callers and in caps tiering. Related: #166
  deliberately does **not** map 403 → auth, because that path 403s model rejections too.
- **Anthropic quota is a FRACTION (0.22), Codex is an INTEGER percent (7).** Normalize or #171's meters land
  100× apart. Don't filter headers by keyword regex — that missed `x-codex-primary-used-percent`.
- **#169 (API-key usage) should reuse #165's shape, not copy it.** `responsesUsage` is the Responses-wire
  mapping; the OpenAI-chat wire reports usage differently, so expect a sibling function.
- **A transcript's `model` may not be the model that served the turn** — the door echoes the *requested*
  name. Open question, deliberately untouched.
- **Fold transcript rows by `message.id` before concluding anything** —
  [[cc-transcript-rows-are-blocks-not-messages]].
- **`.context/` commits go to main, never a ticket branch.**
- Relay gotchas (unchanged): leg boot reads `overview.md` + `active-work.md`, NOT this file — hence the
  trailing "at leg boot also read .context/pick-up.md"; `/preset wrap-up` step 1 is a human eyeball gate an
  unattended leg treats as auto-go; relay spawns with `binary: claude` (native, NOT `claude-wisp` — legs must
  not route through the Bridge they are editing); the body uses 'queue empty' in single quotes (double quotes
  shred the cmd spawn quoting).

## Carried-over user actions

- **Verify #165 live** (above) — the decisive check, now carrying three shipped tickets.
- **#167's manual criterion**: one turn each through Codex, Anthropic and Grok, confirming all three still
  stream through the Bridge. The refactor is suite- and compile-green but an unattended leg cannot eyeball a
  live stream. The ticket was closed with that box **unticked** so #168–#171 unblock — if the three-way check
  fails, reopen #167 rather than patching around it.
- **Install `packages/vscode/wisp-1.9.0.vsix`** — still not done.
- **Restart the Bridge** — needed for both checks above.

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]]
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]]
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
- [[cc-transcript-rows-are-blocks-not-messages]]
