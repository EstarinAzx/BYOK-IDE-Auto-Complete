---
type: decision
project: wisp
updated: 2026-09-04
tags: [context, decisions, anthropic, cache, fable, cost]
---

# The Fable cache re-bill is the backend's — classify it, don't chase it in Wisp

**Decision:** the `#162` "prior write not read back" stall on a Fable/Mythos-family model is named in the
log as the **known Fable backend re-bill** and is otherwise left alone. No request-shaping change is made
for it, and none will be proposed again without new evidence. Shipped as `isFableFamilyModel` gating the
`#162` wording (`f7b3c50`), released `wisp-router@2.1.0` + vsix 1.13.4. On every other model the line keeps
its `real history re-bill` instruction — a stall there still means a cache break worth chasing.

**Why:** the stall is real (4-16k tokens of `cache_creation` per affected turn, roughly a third of turns on
`claude-fable-5-1` at `effort=xhigh`) and it is not Wisp's. The settling evidence is a **same-session model
control**: one heavy tool-use bridged session (`9157be5a`) ran both models through the same Bridge, and
the growth arithmetic `read(n+1) = read(n) + creation(n)` held **exactly** on 40 consecutive Opus 5 turns
while the Fable turns beside them fell short every few turns. Same Wisp, same request shaping, same tool
churn — the model is the only variable. Three independent checks close the other doors:

| check | result |
|---|---|
| Claude Code's native request, driven straight at a recording backend (Wisp bypassed) | byte-for-byte the same skeleton on Fable and Opus |
| Wisp `parse → build` round-trip of a Fable assistant turn with thinking blocks | signatures preserved byte-for-byte, no `cache_control` leaked, conversation key stable |
| shortfall vs the prior turn's content | tracks Fable's much larger thinking-signature volume, but **exceeds** one turn's whole output (16.4k short against 4.6k output on turn 22) |

The third row is why the classifier is a **model-family gate and not a per-turn size bound** — the
backend re-writes a larger slice than the newest thinking block, so any bound would be a guess dressed as
a rule. It is also why the line stays advisory rather than silenced: the numbers still print, so a
genuine Wisp regression on Fable would still be visible in the arithmetic, just not mislabelled.

What the user can do about the spend is client-side only — lower effort (fewer thinking blocks) or Claude
Code's own thinking-clear — and the docs say Fable 5.1 cache reads are a quarter of Fable 5's precisely
because the machinery that causes this is expected.

**Closes:** re-placing the volatile tail for Fable (the `#363` trailing-system path is not even
exercised — Claude Code 2.1.26x sends no unmarked system tail, `uncached_input=2` proves it); stripping or
rewriting thinking blocks in the door; a shortfall-size heuristic; and any "Wisp is re-billing Fable" bug
report that does not come with an Opus control from the same session.

**Reversibility:** one predicate and one string in `bridgeServer.ts`. If Anthropic changes the backend so
Fable reads its writes back, the line simply stops firing; if a real Wisp cache break ever lands on Fable
it shows up as the same stall with the "known" wording and the arithmetic still exposes it. Re-open only
with a same-session Opus control that stalls too.

## Related

- [[decisions]]
- [[2026-09-04-the-fable-cache-rebill-is-the-backend-not-wisp]]
- [[2026-09-03-the-volatile-tail-must-sit-behind-every-message-breakpoint]]
- [[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]]
