---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last firing (2026-07-29, relay leg 4): #168 landed.** `89f94c5` on main (PR #175, squash-merged), ticket
closed with **all eleven acceptance criteria machine-checked** — no manual box outstanding on it. The Bridge
now retries a turn that failed having delivered nothing, and cools a repeatedly-failing Provider on a short
channel kept physically apart from the #161 plan-window channel. Gate was 719/719 + `bun run compile` clean.

## The one next task: ticket #169

`ready-for-agent` = **#169–#173** (5 left). Unblocked right now: **#169** and **#172**.
**#169 is next by age** — "API-key Providers report real token usage" — and it is also the throughput pick:
it unblocks **#170** and **#171**, i.e. two of the three remaining tickets.

The relay chain is live (`.claude/relay/ticket-loop.md`, `stop: false`), so a leg should already be working
this. If no leg is running, re-issue:

```
/relay N=1 /preset ticket-loop -> after the ticket's gate (tests green + landed, or ready-for-human relabel), run /preset wrap-up gateless: eyeball gate auto-go (unattended), /context-update, rewrite .context/pick-up.md to the next unblocked ready-for-agent ticket or 'queue empty', commit .context on main — never the ticket branch. At leg boot also read .context/pick-up.md.
```

Don't re-plan or re-scope — ordering is settled in
[[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]], and each ticket carries its own
acceptance criteria.

## Where #169's code goes (read this before opening the file)

The whole ticket is **one mapper + one request flag**, and both land in exactly one place each:

- **`mapKeyedStream` (`bridgeServer.ts`, ~line 285) is the hole.** It reads `chunk.choices[0].delta` and
  nothing else — no `usage` branch exists, and its local `KeyedChunk` type has no `usage` field to read. It is
  already shared by **both** doors (the OpenAI door's `keyedExecutor.open`, and `startProviderStream`'s keyed
  tail), so fixing it once fixes both. This is the #167 seam paying off again.
- **The opt-in is a request flag, at two `client.chat.completions.create` call sites** — `keyedExecutor.open`
  and the keyed tail of `startProviderStream`. Chat-completions streams omit usage entirely unless the request
  asks (`stream_options: { include_usage: true }`). Both sites already pass `stream: true` unconditionally
  (the door always streams upstream, even when the client asked `stream:false`), so the flag is unconditional
  too.
- **The mapper is a sibling of `responsesUsage` (`codex.ts` ~line 255), not a reuse of it.** Same target shape
  (`BridgeUsage`), different source field names: this wire reports `prompt_tokens` / `completion_tokens` /
  `prompt_tokens_details.cached_tokens`, where the Responses wire reports `input_tokens` / `output_tokens` /
  `input_tokens_details.cached_tokens`. Copy its **conventions** exactly — cached comes out of the uncached
  input, floored at 0; `cache_creation_input_tokens` is always 0; output passes through whole; no usage block
  ⇒ return `undefined` so the caller emits **no event**. Read that function's comment block first, it explains
  why each of those is load-bearing.
- **Where to put the sibling:** `codex.ts` is the Responses wire and is the wrong home. `catalog.ts` (which
  already re-exports `responsesUsage`) or `bridge.ts` (which owns the OpenAI-chat protocol translation) are
  the two honest candidates — pick one, don't add a third module for one function.

## Landmines

- **The usage chunk carries `choices: []`.** The final chunk of an opted-in OpenAI stream has an empty choices
  array and a populated `usage`. `mapKeyedStream` currently ignores it silently (`chunk.choices?.[0]` is
  undefined), which is why the change is purely additive — but it also means a naive `for` loop that assumes
  every chunk has a choice will read the wrong thing.
- **`stream_options` is the real risk in this ticket, and it is a *rejection* risk, not a *silence* risk.**
  The acceptance criterion covers a Provider that **ignores** the opt-in. The failure mode actually worth
  checking is a strict OpenAI-compatible backend that **400s on an unknown parameter** — the keyed row covers
  OpenCode Go (the default Provider), Zen, OpenAI, Groq, Mistral, OpenRouter, Ollama, KiloCode, Cline and
  Custom. Verify against the default Provider at minimum. Good news: post-#168 that failure is loud, not
  silent — a 400 is neither classified nor transient, so it fails fast with the backend's own words and is
  **not** retried.
- **No new `BridgeStreamEvent` member is needed** — `usage` already exists in the union and the Anthropic
  encoder already handles it (`if (ev.type === 'usage')`, ~line 684). Reuse it. Inventing a member would trip
  the encoder's `push()` fallthrough, which invents a bogus `tool_use` block.
- **Only the Anthropic door forwards usage to the client.** `handleChat` (the OpenAI door) deliberately drops
  every non-text / non-tool_call event. That is correct and in scope for #169 — but it means the manual
  `/context` check must be run through **Claude Code / the Anthropic door**, not curl against
  `/v1/chat/completions`.
- **#169 has a manual acceptance criterion** ("a bridged session on the default Provider reports non-zero
  tokens in `/context`") that an unattended leg cannot tick. Precedent from #167: land it, close with that
  box **unticked** so #170/#171 unblock, and carry the check here. Don't stall the queue on it.
- **RUN `bun run compile`, NOT JUST `bun run test`.** Vitest does not typecheck. This bit leg 1 (a widened
  union broke `else`-narrowing at six sites with all 676 tests green):
  [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]. Widening `KeyedChunk` is exactly that
  shape of change.
- **#165 is still unverified live — this is the #163 verdict and it needs a human.** Restart the Bridge on
  this build, bridge a Codex session, read `/context`. Non-zero ⇒ diagnosis right. Still zero ⇒ the
  tighter-OAuth-cap hypothesis is back — and thanks to #166 the next failure should now arrive as a **400
  naming the cause** instead of an opaque 502, after #168 has retried it three times. **Leave #163 open until
  this runs.** Note this check and #169's manual one can be done in the **same** session.
- **The #168 constants were picked cold, never tuned** — 3 attempts / 200ms base / 30s cooldown after 3 failed
  requests in a 120s window, all in `routing.ts`. Grep the Bridge log for `#168` after the first real transient
  event and revisit. Not #169's job.
- **Codex OAuth path rejects `gpt-5.3-codex` and bare `gpt-5.6`** — `gpt-5.6-sol` and `gpt-5.4` return 200.
  That's #172; don't delete the id, it's still valid for API-key callers and in caps tiering. Related: #166
  deliberately does **not** map 403 → auth, because that path 403s model rejections too.
- **Anthropic quota is a FRACTION (0.22), Codex is an INTEGER percent (7).** Normalize or #171's meters land
  100× apart. Don't filter headers by keyword regex — that missed `x-codex-primary-used-percent`.
- **A transcript's `model` may not be the model that served the turn** — the door echoes the *requested*
  name. Open question, deliberately untouched.
- **Fold transcript rows by `message.id` before concluding anything** —
  [[cc-transcript-rows-are-blocks-not-messages]].
- **Test-fixture trap if you touch stream tests:** `ReadableStream` `controller.error()` discards the queued
  chunks — [[readablestream-error-discards-the-queued-chunks]].
- **`.context/` commits go to main, never a ticket branch.**
- Relay gotchas (unchanged): leg boot reads `overview.md` + `active-work.md`, NOT this file — hence the
  trailing "at leg boot also read .context/pick-up.md"; `/preset wrap-up` step 1 is a human eyeball gate an
  unattended leg treats as auto-go; relay spawns with `binary: claude` (native, NOT `claude-wisp` — legs must
  not route through the Bridge they are editing); the body uses 'queue empty' in single quotes (double quotes
  shred the cmd spawn quoting).

## Carried-over user actions

- **Verify #165 live** (above) — the decisive check, now carrying four shipped tickets.
- **#167's manual criterion**: one turn each through Codex, Anthropic and Grok, confirming all three still
  stream through the Bridge. Still outstanding, and now doubly worth doing — #168 changed the same open+prime
  path on both doors. If the three-way check fails, reopen #167 rather than patching around it.
- **Install `packages/vscode/wisp-1.9.0.vsix`** — still not done.
- **Restart the Bridge** — needed for every check above.

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]]
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]]
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]
- [[readablestream-error-discards-the-queued-chunks]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
- [[cc-transcript-rows-are-blocks-not-messages]]
