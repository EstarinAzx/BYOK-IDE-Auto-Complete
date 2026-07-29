---
type: decision
project: wisp
date: 2026-07-30
tags: [context, decision, bridge, errors, antigravity]
---

# A classified verdict rides on the Error, not on its message

**Context.** #190 makes Antigravity the first `ProviderExecutor` record to answer a rate limit as 429 instead
of leaving it a 502. The record's `classify` hook receives the thrown Error and must decide: is this a
failure the client should be told about (429, stop retrying), or one the bounded retry should absorb?

The obvious implementation matches on the message. Every other classifier in this codebase does exactly that
— `classifyCodexErrorMessage` regexes `String(err)`, and `parseUsageLimitReset` matches the Codex wire's own
words. So message-matching is the house style, and #190 deliberately broke it.

**Decision.** `antigravityApiError` attaches the verdict to the Error as a property; `antigravityFailureOf`
reads it back. `classify` returns that, and never inspects the message.

## Why the house style does not work here

Because for **this** Provider the message genuinely cannot round-trip the verdict.

`antigravityApiError` renders a 429 one of two ways:

- the pure layer **classified** it → `Antigravity API error 429: QUOTA_EXHAUSTED`
- the pure layer **declined** it → `Antigravity API error 429: {"error":{"status":"RESOURCE_EXHAUSTED",
  "details":[{"reason":"RATE_LIMIT_EXCEEDED",...}]}}` — the raw upstream body

Both say `429`. Both say `RATE_LIMIT_EXCEEDED`. The declined one says it because Google's body says it, and
that body is prose this repo does not control. There is no needle that separates them, because the two cases
differ by a **number that was parsed and then thrown away** — the retry delay, compared against the
three-second instant-retry threshold.

This is not true of Codex. Its two cases use different vocabulary (`usage_limit_reached` vs anything else),
so a string matcher there is reading a real distinction. The difference is in the wire, not in the taste.

## What guessing costs

Not symmetric. Guessing "declined" on a classified failure wastes two retries and then answers correctly.
Guessing **"classified" on a declined failure kills the bounded retry** — the Bridge stops trying a request
that would very likely have succeeded on attempt two, and the user loses the turn to a rate limit that had
already expired. Declining is the recoverable direction, so a mechanism that cannot be wrong beats one that
is usually right.

## The control that proves it

Replacing the carrier with the natural message classifier —

```ts
classify: (err) => /Antigravity API error 429/.test(String(err)) ? { status: 429, ... } : undefined
```

— leaves **990 of 991 tests green**. The single failure is
`leaves a below-threshold 429 to the bounded retry, and it stays a 502`. Every "does it answer 429" test
passes, because the wrong implementation answers 429 for everything.

So the test that pins this decision is the one asserting a **non**-classification. A suite written only
around the feature's happy claims would have shipped the guess. [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]] is the
same shape: the dangerous change is the *simplifying* one, and only a deliberately negative test catches it.

## Scope

Deliberately not generalised. `AntigravityFailure` and its getter are named for the one record that produces
them; `noteProviderError` reads them by that name. The day a second Provider needs to carry a verdict, lift
the pair into shared vocabulary — building the generic seam for one producer would be inventing a framework
for a single caller.

`String(err)` is untouched by the attachment, so the retryability contract
([[2026-07-29-antigravity-narrow-port-never-mint-opaque-tool-ids]]'s neighbour — `isTransientProviderError`
regexing `API error (429|500|502|503|504)`) still matches exactly as before. The carrier is additive.

## Related

- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]] — the channel property #190 preserves
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]] — the #166 classifier this extends
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]] — why the 429 is door-neutral for free
- [[active-work]]
