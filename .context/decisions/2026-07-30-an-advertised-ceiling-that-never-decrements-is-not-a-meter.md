---
type: decision
project: wisp
date: 2026-07-30
tags: [context, decision, quota, providers, xai, antigravity, opencode, status]
---

# An advertised ceiling that never decrements is not a meter

## Decision

**No quota meters for xai, antigravity, or the keyed OpenAI-compatible wires. `onQuota` stays threaded into
exactly two arms (codex, anthropic), and #200 closed recon-complete with no child implementation ticket.**

The four non-reporting wires were driven with real turns and their response heads captured (`.context/quota-recon.md`).
None earned the `parseable meter` verdict that #200's acceptance criteria required before a follow-up ticket
could be filed:

- **xai** — `x-ratelimit-limit-requests` / `-tokens` and `x-ratelimit-remaining-requests` / `-tokens` are on
  the head of both endpoints (public `api.x.ai` and the subscription proxy `cli-chat-proxy.grok.com`), and
  they are **static**. `remaining` was byte-identical to `limit` across 3 fully-drained turns on `grok-build`
  (`864/864`) and 2 on `grok-4.5` (`8300/8300`). No `x-ratelimit-reset*` header exists on either.
- **antigravity** — nothing quota-shaped on the head at all, twice, drained. Credits exist on a separate
  endpoint (`POST cloudcode-pa.googleapis.com/v1internal:loadCodeAssist`) that the reference **polls in a
  background goroutine**, and on this account `paidTier` carries no `availableCredits` array.
- **keyed opencode-go** — nothing on the head, twice, drained. `opencode-zen` shares the credential and
  answered `401 CreditsError` (no balance), so it was recorded *not captured* rather than guessed.

## Why

**A number that never moves is worse than no number.** Threading `onQuota` into the xai arm would put a bar
on screen that reads `0% used` forever, on every account, in a panel whose entire purpose is to tell the user
how much they have spent. #171 exists because a confidently wrong reading is more damaging than an absent
one; this would have been the same failure with a new header name.

**The existing parsers already encode the rule that rejects these.** `parseCodexQuota` refuses a slot without
**both** a reading and a window size (`status.ts:88-91`), because `secondary-window-minutes: 0` means the plan
has no such window. `quotaWindowLabel(minutes)` derives `5h`/`7d` from a size and cannot invent one. xai
supplies neither a window size nor a reset time, so it fails a test written before anyone looked at it —
the decision is the existing rule applied, not a new judgement call.

**The method was the load-bearing part, and the first version of it was wrong.** The initial pass read each
head and then *cancelled* the response body. That cannot distinguish a static ceiling from a live counter
that had not been billed yet, and it would have reported "headers exist, looks parseable" — the opposite
conclusion. Only fully draining 5 consecutive turns proved the numbers are the plan's advertised ceilings.
See [[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]].

**Antigravity's credits are a different shape, not a missing implementation.** #171 settled that quota is a
side channel **off the response head** ([[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]]).
`loadCodeAssist` is a poll, it reports an **absolute credit balance** rather than a percentage of a window
(no window, no reset), and it is empty on a free tier. Adopting it means adopting a second quota shape with
its own freshness story and its own poll cadence — a decision on its own merits, not a wire being finished.

**A negative result retires the question cheaply.** The keyed path's `.withResponse()` refactor
(`bridgeServer.ts:703`, a shared call site) was the expensive-looking part of this area. The head is empty,
so that work buys nothing and nobody needs to price it again.

## Reversibility

**Cheap to revisit, and worth revisiting only on new evidence.** Nothing was built, so there is nothing to
unwind — the wires still degrade correctly today (route row, no bars), which `plugins/slot/statusline/check.js`
case 3 already pins.

Re-open if any of these change:

- xai starts shipping `x-ratelimit-reset*`, **or** `remaining` is observed decrementing. Re-test the same way:
  2+ **fully drained** turns, compare `remaining` across them. A single turn proves nothing.
- The user takes a **paid** Google One AI tier, which is when `paidTier.availableCredits[]` would populate and
  the poll-shaped quota question becomes worth answering.
- A keyed Provider with real rate-limit headers gets a key on this machine (groq, mistral and openrouter all
  publish `x-ratelimit-*` families upstream — none has a key here, so none was captured).

## Related

- [[decisions]]
- [[quota-recon]]
- [[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]
- [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]]
- [[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]
- [[an-empty-quota-ledger-is-usually-correct-not-broken]]
