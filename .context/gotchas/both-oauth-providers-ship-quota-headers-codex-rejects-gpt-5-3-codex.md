---
type: gotcha
project: wisp
updated: 2026-07-29
tags: [context, gotchas]
---

# Both OAuth Providers ship quota headers — and the Codex OAuth path rejects `gpt-5.3-codex`

Live header recon for #171, captured 2026-07-29 by posting one minimal turn straight at each upstream
(Wisp's own header builders, not hand-rolled, so a rejected request couldn't fake a null result). Two
findings, one wanted and one not.

## 1. The quota meters are buildable — both Providers expose utilization

**Anthropic** (`/v1/messages?beta=true`, HTTP 200) returns a `anthropic-ratelimit-unified-*` family:

```
anthropic-ratelimit-unified-5h-utilization: 0.04     # FRACTION 0..1
anthropic-ratelimit-unified-5h-reset: 1785305400     # epoch SECONDS
anthropic-ratelimit-unified-5h-status: allowed
anthropic-ratelimit-unified-7d-utilization: 0.22
anthropic-ratelimit-unified-7d-reset: 1785686400
anthropic-ratelimit-unified-7d-status: allowed
anthropic-ratelimit-unified-representative-claim: five_hour
anthropic-ratelimit-unified-overage-utilization: 0.0
anthropic-ratelimit-unified-fallback-percentage: 0.5
```

**Codex** (`/backend-api/codex/responses`, HTTP 200) returns an `x-codex-*` family:

```
x-codex-primary-used-percent: 7                      # INTEGER 0..100
x-codex-primary-window-minutes: 10080                # 7 days
x-codex-primary-reset-at: 1785816697                 # epoch SECONDS
x-codex-primary-reset-after-seconds: 527331
x-codex-secondary-used-percent: 0
x-codex-secondary-window-minutes: 0                  # 0 = window unused on this plan
x-codex-plan-type: plus
x-codex-active-limit: premium
x-codex-credits-balance: 0
x-codex-credits-has-credits: False                   # Python-style caps, NOT json true/false
x-codex-credits-unlimited: False
x-codex-safety-buffering-enabled: true               # lowercase here — inconsistent with the above
x-codex-safety-buffering-faster-model: gpt-5.6-luna
```

**Traps when consuming these:**

- **Units differ.** Anthropic is a fraction (`0.22`), Codex an integer percent (`7`). Normalize on the way
  in or the two Providers' meters will be 100× apart.
- **The window meaning differs.** Anthropic names its windows (`5h`, `7d`); Codex says `primary`/`secondary`
  and only tells you the size via `*-window-minutes`. Read the window minutes — do not assume primary means
  weekly. Here primary is 10080 minutes (7 days) and secondary is 0, meaning unused.
- **`x-codex-credits-*` booleans are `True`/`False`**, Python-style, while `x-codex-safety-buffering-enabled`
  is lowercase `true`. Parse case-insensitively; do not `JSON.parse`.
- **Don't filter headers by a keyword regex.** The first pass of this recon used
  `/rate|limit|quota|usage|reset|remaining|credit|window|tier/i` and **silently missed
  `x-codex-primary-used-percent`** — the single most important header — because "used-percent" contains none
  of those words. Dump everything, then read.

## 2. `gpt-5.3-codex` is REJECTED on the ChatGPT-account path

```
HTTP 400 {"detail":"The 'gpt-5.3-codex' model is not supported when using Codex with a ChatGPT account."}
```

Bare `gpt-5.6` is rejected the same way. `gpt-5.6-sol` and `gpt-5.4` both return 200.

This mattered because the catalog's Codex Provider carried `defaultModel: 'gpt-5.3-codex'`, and defaultModel
is what's used "when the Provider has none remembered" — so a fresh Codex sign-in that never picks a model
sent a request the backend refuses. The failure is a 400 with a clear message, so it is not silent, but it
was a dead default.

**Fixed in #172** (`49761d8`): the row's default is now `gpt-5.6-sol`, and a test asserts the default against
a whitelist of live-probed accepted ids. The underlying trap below is the durable part — the fix removed one
bad value, not the reason a bad value could be chosen.

Note this is an *account-path* restriction, not a model-existence one: the id is still valid for API-key
callers. Any fix has to be scoped to the OAuth path rather than deleting the id.

## Related

- [[gotchas]] — index
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]]
- [[anthropic-oauth-a-valid-token-still-429s-without-the-claude-code]] — the other reason to read response headers
