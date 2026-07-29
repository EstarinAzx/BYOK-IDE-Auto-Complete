---
type: decision
project: wisp
updated: 2026-07-29
tags: [context, decision]
---

# The chat-completions usage mapper is a SIBLING of `responsesUsage`, not a shared one — SHIPPED `7b8d73d` (#169)

**Decision.** API-key Providers opt into usage with `stream_options: { include_usage: true }` at both
keyed call sites, and their final chunk is mapped by a **new** `chatCompletionsUsage` in `bridge.ts`
that duplicates every convention of #165's `responsesUsage` rather than sharing code with it.

## 1. Duplicated conventions beat a field-name shim

The two functions have the **same target shape** (`BridgeUsage`) and the **same five conventions**:

- cached tokens move to cache-read, the uncached input gives them up, floored at 0;
- `cache_creation_input_tokens` is always 0 — neither protocol has the concept;
- the output total passes through whole;
- no usage block ⇒ `undefined` ⇒ the caller emits **no event**;
- a non-numeric total is treated as absent, never coerced.

Only the **source field names** differ — `prompt_tokens` / `completion_tokens` /
`prompt_tokens_details.cached_tokens` here, `input_tokens` / `output_tokens` /
`input_tokens_details.cached_tokens` on the Responses wire.

Unifying them means a field-name mapping table threaded through the middle of the conversion, and the
conversion **is** the substance — the subtraction is the part that goes wrong. Two ~12-line functions
that each read straight down beat one function with a shim in its centre. A third wire copies the
conventions again; it does not get to generalise them.

This is the same call [[2026-07-29-two-doors-share-the-error-answer-not-the-request]] made for the
doors: share the *answer*, not the *request shaping*.

## 2. It lives in `bridge.ts`, the OpenAI-chat protocol module

`codex.ts` is the Responses wire and is the wrong home for a chat-completions reader. `catalog.ts`
re-exports `responsesUsage` but is Provider-catalog data. `bridge.ts` already owns the OpenAI-chat
protocol translation and already imports `BridgeUsage` — the function sits next to the
`BridgeStreamEvent` union whose `usage` member it feeds. No third module for one function.

## 3. The opt-in is unconditional

Both call sites already pass `stream: true` regardless of what the client asked, because the door
always streams upstream and re-assembles for a non-streaming client. So the flag is unconditional
too — there is no request shape where it would be wrong to ask.

## 4. The change is additive because the usage chunk has empty `choices`

`mapKeyedStream`'s existing delta reads (`chunk.choices?.[0]`) already skipped the final usage chunk
silently. Nothing about the text or tool-call paths moved. Likewise **no new `BridgeStreamEvent`
member** — `usage` already existed and the Anthropic encoder already folds it into `message_start` /
`message_delta`. Inventing one would have tripped the encoder's `push()` fallthrough and produced a
bogus `tool_use` block, the trap
[[2026-07-25-truncation-reason-rides-out-of-band-marker-gated-on-answer-text]] names.

## Why

`zero usage for every non-Anthropic Provider` is the root finding of the whole harvest
([[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]) — Claude Code sizes
auto-compaction off these counts, and a zero means it never compacts until the backend rejects the
history. #165 fixed the two Responses backends; this closes the other ten rows, which include the
**default** Provider.

The residual risk is the inverse of the ticket's criterion: the criterion covers a backend that
**ignores** the opt-in (handled — no usage ⇒ no event ⇒ clean finish), while the live risk is a
strict backend that **400s on an unknown parameter**. Post-#168 that is loud rather than silent — a
400 is neither classified nor transient, so it fails fast with the backend's own words and is not
retried. Unverified live; carried on [[pick-up]].

## Reversibility

Cheap. The mapper is pure and unexported from anything but `bridge.ts`; the opt-in is one object key
at two call sites. Dropping `stream_options` returns the keyed path to silence with no other effect.
If a specific backend rejects the parameter, the honest fix is a per-Provider opt-out flag on the
catalog row — **not** removing the opt-in for everyone.

## Related

- [[decisions]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]]
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]
