---
type: gotcha
project: wisp
date: 2026-07-30
tags: [context, gotcha, bridge, doors, antigravity]
---

# The Anthropic door does not use the executor records

**#167 unified the OpenAI door onto one `ProviderExecutor` record per Provider kind. It did not unify the
Anthropic door.** That door's `startProviderStream` still carries its own hand-written per-kind chain —
`isCodexProvider` → `isAnthropicProvider` → `isXaiProvider` → the keyed tail — and nothing there consults
`providerExecutors`.

So **adding a record does not add a Provider to `/v1/messages`.** #189 added the Antigravity record and wired
the OpenAI door; on the Anthropic door the same Provider falls straight through to the keyed tail and answers

```
400 {"error":{"message":"provider 'antigravity' has no API key configured"}}
```

which reads like a configuration mistake and is actually a missing arm. Found by #190 writing an end-to-end
429 test for both doors and watching the Anthropic one return 400.

**#191 (`915d415`) closed that particular gap — the chain is now codex → anthropic → xai → antigravity →
keyed.** The *rule below is unchanged and is the durable part of this page*: the arm had to be hand-written,
it is per-wire rather than a copy of its neighbour
([[2026-07-30-the-antigravity-arm-is-not-a-copy-of-the-anthropic-arm]]), and the **next** Provider kind will
land in exactly the same hole unless both places are counted.

## What IS shared, and why it matters

The **failure answer** is. Both doors call the one `failProviderRequest`, which reads
`executorFor(provider).classify` — see
[[2026-07-29-two-doors-share-the-error-answer-not-the-request]]. So a record's classification reaches both
doors the moment either can open a stream for it.

Concretely: #190's 429 already works on the Anthropic door in every respect except that no request ever gets
far enough to fail there. #191 adds the arm and inherits the 429 with no extra wiring — and should **not**
re-implement classification thinking it is missing.

## The rule

When adding a Provider kind, count **two** places, not one:

1. the `providerExecutors` record — the OpenAI door, `/v1/chat/completions`
2. the `startProviderStream` chain — the Anthropic door, `/v1/messages`, **which is Claude Code's route**

Missing (2) is silent on the OpenAI door and unit-invisible: `bridgeServer.test.ts` had no Antigravity case
at all before #190, and the OpenAI-door tests all pass with the arm absent. The only thing that catches it is
driving the *other* door. #191's control confirms it from the other side — remove the arm and the whole
`/v1/messages` block fails while every other test in the suite stays green.

And (2) is **not** a delegation to (1). The door owns wire behaviour the records cannot express (the #139
system split, the #156 diagnosis chain, vision/documents, non-strict tools), which is why #167 left it alone
in the first place. A new arm mirrors its neighbours only where the wire agrees.

## Related

- [[gotchas]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]]
- [[2026-07-30-the-antigravity-arm-is-not-a-copy-of-the-anthropic-arm]]
- [[active-work]]
