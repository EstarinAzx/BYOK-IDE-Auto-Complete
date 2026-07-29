---
type: decision
project: wisp
date: 2026-07-30
updated: 2026-07-30
tags: [context, decision, antigravity, bridge]
---

# The Antigravity arm is not a copy of the Anthropic arm

## Decision

**SHIPPED `915d415` (#191).** The Anthropic door's fourth arm was written by hand, mirroring the three above
it only where the wire agrees. Four calls, each a deliberate divergence from the arm directly above it:

1. **The FULL system rides, not `systemSplit.stable`.** The Anthropic arm prefers `stable` because the #139
   split exists to place a **cache breakpoint** — the volatile tail threads separately as `systemSuffix` and
   lands after the marker. This wire has no breakpoint to place and no suffix channel, so `stable` alone is
   not "the cached part", it is **the system prompt with its tail deleted**. `parsed.system` is the whole
   thing (`systemSplit` is an additional view of the same text, not a replacement), so the arm takes that.
2. **Thought parts ride the thinking channel; the signature does not.** #189 dropped thought parts because
   no door consumed them. The Anthropic door does, so they now surface as `thinking` events — and the OpenAI
   door still sees nothing, because it reads `text`/`tool_call` and drops every other member of the union.
   `thoughtSignature` is **not** forwarded as an Anthropic `thinking.signature`: it is *this* wire's replay
   token, an Anthropic signature means a different thing on a different wire, and the only consumer would be
   a replay path that does not exist — `AntigravityTurn` has no `rawContent` channel, so a returned block is
   dropped before the payload builder sees it. An empty signature is what the Anthropic OAuth wire already
   sends through this same encoder, so the door is on proven ground.
3. **Documents are wired, not just images.** The door normalizes `document` blocks into their own channel and
   this wire has one attachment shape, so a PDF is an `inlineData` part differing from a PNG by mimeType
   alone. Two lines. Left unwired it would have repeated the door's old silent-vision hole, with PDFs.
4. **No effort, no strictness flag, no `mapOAuthStream` hop.** Gemini bakes the reasoning level into the
   model id, `buildAntigravityTools` already cleans Claude Code's rich schemas, and the stream already speaks
   `BridgeStreamEvent`. Three knobs the other arms pass that have no counterpart here.

What was **inherited rather than rebuilt**: the 429 answer and the retry boundary. Both doors answer through
the one shared `failProviderRequest`, which reads `executorFor(provider).classify`, so #190's classification
was already door-neutral; and `openPrimed` wraps the eager base pass only. The arm contains **no** 429
handling and **no** retry of its own — see [[2026-07-29-two-doors-share-the-error-answer-not-the-request]].

## Why

The pull toward "make the four arms look alike" is exactly the change that breaks this one, and it breaks it
**silently**. Copying the Anthropic arm's `systemSplit.stable` preference — the single most natural tidy-up,
since it sits three lines above — drops the mid-session `<system-reminder>` append from every request. Nothing
errors. The model just stops seeing part of its instructions.

That is why each divergence carries a control rather than a comment alone: the break that copies the
`systemSplit` preference fails exactly one test (`sends the whole system prompt, including the volatile tail
past the cache marker`) and nothing else. Same for dropping documents, re-dropping thought parts, and removing
the image refusal — one test each, no collateral. A suite where a plausible "simplification" passes is a suite
that will let it through.

The general shape: **an arm is per-wire, not per-door.** What the four arms share is the door's *contract*
(eager creds check, `BridgeStreamEvent` out, a resolved `model` back); what they must not share is request
shaping, because that is where the wires genuinely differ.

## Reversibility

Easy per point, and each is fenced by its own control. The image refusal is explicitly the five-line feature
to delete the day a door grows an image-output channel. Forwarding `thoughtSignature` becomes correct the day
`AntigravityTurn` gains a `rawContent` channel and a replay path — until then it is inventing a cross-wire
meaning. The `systemSplit` call flips only if this wire ever grows a cache breakpoint.

## Related

- [[decisions]]
- [[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
