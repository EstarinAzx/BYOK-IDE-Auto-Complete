---
type: decision
project: wisp
updated: 2026-07-29
tags: [context, decision]
---

# Retry wraps priming, not the error answer — and the two cooldown channels are separate maps — SHIPPED `89f94c5` (#168)

**Decision.** The Bridge retries a failed turn only where **nothing was delivered**, and cools a
repeatedly-failing Provider on a **second, short channel** kept physically apart from the #161
plan-window channel. Both land once and serve both doors.

## 1. The retry boundary is priming, not `failProviderRequest`

Both the ticket and [[2026-07-29-two-doors-share-the-error-answer-not-the-request]] said the retry
would "wrap `failProviderRequest`". That turned out to be right about the **cooldown** and wrong
about the **retry**:

- `failProviderRequest` is the **terminal answer**. It holds `res`, the error, and the executor —
  but no way to re-open a stream. A retry cannot live there.
- `noteProviderError` *does* live there, and both doors already call it, so the **cooldown** landed
  once for free. That half of the prediction held exactly.
- The retry wraps a new `openPrimed(provider, executor, controller, attempt)` instead — still
  written once, still called by both doors.

**#167's priming is what made the ticket's condition expressible at all.** `primeStream` pulls the
first upstream event *before* any head is written, so the boundary is unambiguous:

| phase | delivered? | retryable |
|---|---|---|
| `open()` — creds, client, request construction | nothing | yes (on a thrown failure) |
| the **first pull** (where the fetch actually fires) | nothing | yes |
| every pull after it | content is on the wire | **never** |

Without uniform priming, "the stream failed before delivering anything" had no observable boundary
on three of four paths — they had already committed a 200 head
([[a-door-commits-its-200-head-before-the-upstream-request-has-run]]). This is the concrete payoff
of #167's one deliberate behaviour change.

Four things stop a retry: the client hung up, attempts ran out, #166 **classified** the failure (a
client error cannot succeed on a retry — read the record, never re-sniff the string), or the failure
is not transient. A credential/key refusal (`ok:false`, not a throw) returns untouched.

**The Anthropic door's advisor *continuation* passes are deliberately not retried.** They run
mid-conversation, so content has already reached the client; re-opening one would discard the turn.
Only the eager base pass is wrapped.

## 2. Two cooldown channels = two maps, not one map with careful arithmetic

The ticket names two failure modes as the worst production outcomes: a blip sidelining a Provider
for **days**, and a genuine multi-day quota exhaustion shortened to **seconds**. Separate maps make
both **impossible to write**, rather than merely unlikely under review:

- `usageUntil` (#161, days) and `transientUntil` (#168, seconds) never see each other's writes.
- `cooling` is the OR; `coolingUntil` is the **later** horizon — so a live plan window can never be
  masked by a 30s blip.
- `noteProviderError` **returns** after a usage-limit hit, so one failure can never feed both.
- `isTransientProviderError` checks `parseUsageLimitReset` **first**, so a plan-window 429 can never
  be read as a blip — even though plain rate-limit 429s *are* on the transient list.

A capacity rejection (`model is at capacity`) rides the transient channel, as the ticket requires.

**The streak uses a decay window, not a success hook.** Cooling needs "repeated" failures, which
implies remembering. The alternative — resetting a counter on every successful turn — needed a new
call site in each door. A window (3 failures within 120s) keeps the store pure and self-contained,
and is the more honest reading: repeated means repeated *recently*, so an hourly hiccup never
accumulates into a cooldown. The streak counts failed **requests**, not attempts — retries are
internal to one request.

**Jitter takes an injected random source.** Sampling `Math.random` in a test is flaky by
construction, and it is unavailable inside workflow scripts anyway, so injection is house style.
`noteTransient` reports the **nominal** 30s, not the jittered value — the jitter is meant to be
unobservable noise.

## Constants

`MAX_PROVIDER_ATTEMPTS = 3` · `RETRY_BASE_DELAY_MS = 200` (exponential) ·
`TRANSIENT_COOLDOWN_SECONDS = 30` · `TRANSIENT_FAILURES_BEFORE_COOLDOWN = 3` ·
`TRANSIENT_WINDOW_SECONDS = 120` · `JITTER_FRACTION = 0.2`.

**Reversibility.** Easy. The cooldown half is additive inside one store — deleting `noteTransient`
and its map restores #161 exactly. The retry half is one helper plus two call sites; reverting is a
`git revert`. The durable half is the **boundary**: any future retry must key off "delivered
nothing", and any future cooldown kind must be its own map, not a shared horizon.

**Known side effect:** #166's "keeps 502 for an unrecognised upstream failure" test now makes three
upstream attempts before its 502. Still 502 — slower, not different.

## Related

- [[decisions]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[2026-07-23-usage-limit-cooldown-family-fallback-only]]
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]]
- [[readablestream-error-discards-the-queued-chunks]]
