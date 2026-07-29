---
type: decision
project: wisp
updated: 2026-07-29
tags: [context, decision]
---

# The two doors share the error answer, not the request — SHIPPED `c697733` (#167)

**Decision.** The OpenAI door's three per-Provider chat handlers (`handleCodexChat`,
`handleAnthropicChat`, `handleXaiChat`) plus its inline keyed path collapse into **one
`handleChat` driven by a `ProviderExecutor` table** — one record per kind carrying `id`,
`open()` (credentials + upstream, returned as `BridgeStreamEvent`s), and `classify()`. The
**five** copy-pasted gateway-error sites collapse into **one** `failProviderRequest`, called by
**both** doors. `mapOAuthStream`/`mapKeyedStream` moved out of the Anthropic-door section: they
were always door-neutral and the OpenAI door now renders from them too.

**The Anthropic door's `startProviderStream` keeps its own four arms.** This is the
load-bearing half of the decision, and it looks like the duplication the ticket set out to
kill. It isn't:

| its arm carries | the OpenAI door has | folding them would |
|---|---|---|
| #139 stable/volatile system split | no `systemSplit` | move the cache breakpoint onto the other wire |
| #156 diagnosis chain (`previous_message_id`) | no chaining | start chaining OpenAI-door turns |
| vision (`images`, `documents`, `rawContent`) | drops images on its anthropic arm | forward pixels that never went before |
| non-strict tools (`toCodexResponsesTools(…, false)`) | strict | change what Codex accepts |
| Claude Code's `/effort` (`parsed.effort`) | panel effort only | *(nothing — `parsed.effort` is already undefined there, so this one unifies for free)* |

Four of those five are real **wire** changes, and #167 forbids behaviour changes. Unifying them
would need a per-door flag apiece — precisely the translator matrix
[[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]] already rejected. So the
seam is drawn at the **error answer**, which is genuinely identical, rather than the **request**,
which genuinely isn't.

**Why that still buys what the harvest wanted.** #168's retry wraps `failProviderRequest` and
gets written **once**, not three times — the stated reason for sequencing this ticket before
retry. What remains is that a fifth backend (Kimi, Antigravity) needs a record *here* and an arm
*there*. Collapsing that second seam is a separate ticket and needs explicit permission to move
wire behaviour.

**One deliberate behaviour change: priming is uniform now.** Only the Codex path pulled the first
event before committing its 200 SSE head; anthropic, xai and keyed still wrote the head first and
locked every pre-stream failure into a 200 with an empty body
([[a-door-commits-its-200-head-before-the-upstream-request-has-run]]). All four prime. The
alternative was a per-record `prime: false` flag whose only job was preserving a known bug on
three paths.

**Two equivalences that make the rest provably behaviour-identical**, recorded because neither is
obvious on sight:

1. The keyed streaming path's finish reason moved from `toolDeltas.length` to `calls.length`.
   `assembleToolCalls` creates a map entry for **every** delta index — no delta is ever dropped —
   so the two predicates are the same. (The keyed *non*-streaming path already used the assembled
   length.)
2. `classifyProviderError`'s `isCodexProvider` gate became the codex record's `classify`, with
   `() => undefined` on the other three. Same gating, now a property of the record instead of an
   `if` — which is what #166 meant by "generalise it on #167's record".

**Reversibility.** Easy and cheap. The table is ~90 lines in one file, no exported surface
changed, no test touched (690/690 green through the whole refactor). Reverting is a `git revert`;
re-splitting one record back into its own handler is mechanical. The Anthropic-door decision is
the durable half — folding the doors later is additive, not a reversal.

## Related

- [[decisions]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]]
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]]
