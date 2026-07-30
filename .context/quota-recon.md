---
type: research
project: wisp
updated: 2026-07-30
tags: [context, research, quota, providers, xai, antigravity, opencode, status]
---

# Quota-header recon — the four wires that never call `onQuota` (#200)

Capture for #200. #171 shipped quota meters and `wisp-router@2.0.42` gave `status.json` a 24h ledger, but only
**two of six** wires (codex, anthropic) ever call `onQuota`. This is the observation pass: what do the other
four actually put on the response head? **Capture only** — no parser, no `onQuota` threading, no `status.ts`
change rides with this note.

## Method

A throwaway `bun` script (deleted, never committed) built each request through the **same builders the real
clients use** — `xaiResponsesUrl` / `xaiRequestHeaders` / `buildCodexResponsesBody` / `rewriteXaiResponsesPayload`
for Grok, `buildAntigravityRequestBody` / `antigravityHostChain` / `antigravityTurnUrl` /
`antigravityRequestHeaders` for Antigravity, and a raw `POST {baseUrl}/chat/completions` with
`stream: true, stream_options: {include_usage: true}` for the keyed path (matching `bridgeServer.ts:703`) —
then printed the full response header list. Credentials came from `~/.wisp/auth.json` via the real
`XaiAuth.current()` / `AntigravityAuth.current()`, so both expired access tokens refreshed normally.

**Streams were FULLY DRAINED**, not cancelled. The first pass cancelled each body and could not tell a static
ceiling from a meter that simply had not been billed yet — so every decrement test below is 2–3 consecutive
turns read to completion.

## Verdicts

| Wire | Verdict | Meter possible? |
|---|---|---|
| xai (Grok), both endpoints | `x-ratelimit-*` on the head, but **static** — never decrements, no window, no reset | **No** |
| antigravity (Gemini) | **nothing on the head**; credits exist on a **separate polled endpoint** | **No** (and it's a new shape) |
| keyed: opencode-go | **nothing on the head** | **No** |
| keyed: opencode-zen | reached, **not served** — `401 CreditsError`, no balance on this account | Not captured |
| keyed: groq · mistral · openrouter · openai · kimi | **not captured** — no key/subscription stored on this machine | — |

**No wire earned `parseable meter`, so no follow-up implementation ticket was filed.** That is the finding, not
an omission.

### 1. xai (Grok) — headers exist and are a trap

Both endpoints answered `200` and both carry the `x-ratelimit-*` family. `grok-4.5` goes to the public
`https://api.x.ai/v1/responses`; `grok-build` goes to the subscription proxy
`https://cli-chat-proxy.grok.com/v1/responses`.

```
# api.x.ai (grok-4.5)                    # cli-chat-proxy.grok.com (grok-build)
x-ratelimit-limit-requests: 8300         x-ratelimit-limit-requests: 864
x-ratelimit-limit-tokens: 53000000       x-ratelimit-limit-tokens: 18000000
x-ratelimit-remaining-requests: 8300     x-ratelimit-remaining-requests: 864
x-ratelimit-remaining-tokens: 53000000   x-ratelimit-remaining-tokens: 18000000
x-data-retention: general                x-data-retention: zdr
x-zero-data-retention: false             x-zero-data-retention: true
                                         x-models-etag: "6772649606089578003"
```

Full head also carries only Cloudflare/transport noise (`cf-ray`, `traceparent`, `vary`, `set-cookie`,
`strict-transport-security`, `alt-svc`, `x-request-id`) — nothing else quota-shaped.

**`remaining` never moved.** 3 fully-drained turns on `grok-build` (9112 bytes each) and 2 on `grok-4.5`
(9153 bytes each): `864/864` and `8300/8300` before and after, every time. These are the **plan's advertised
ceilings**, not a live reading.

There is also **no `x-ratelimit-reset*` header of any kind** — so even if the numbers moved there would be no
window size for `quotaWindowLabel(minutes)` to name and no reset time to show. Per #171's settled rules
(`parseCodexQuota` refuses a slot without BOTH a reading and a window size, `status.ts:88-91`), this wire has
**no meter**. Building one would render a permanent `0%` bar off a constant — precisely the #171 failure mode
the ticket warns about.

> Confirmed in passing: the ticket's own trap holds. `x-grok-*` in `xaiClient.ts` are **request** headers we
> send; they are absent from every response head captured.

### 2. antigravity (Gemini) — nothing on the head, credits on a side channel

Two fully-drained turns on `gemini-3.6-flash-high`. **The answering host was the daily host both times** —
`https://daily-cloudcode-pa.googleapis.com`, chain position 1/2, so the production fallback was never
exercised.

The entire response head, verbatim minus transport noise:

```
content-disposition: attachment      server: ESF
content-type: text/event-stream      server-timing: gfet4t7; dur=1608
transfer-encoding: chunked           vary: Origin, X-Origin, Referer
alt-svc: h3=":443"; ma=2592000       x-content-type-options: nosniff
date: …                              x-frame-options: SAMEORIGIN
                                     x-xss-protection: 0
```

**No quota, ratelimit, credit, or reset header exists.** Verdict: `nothing on the head`.

But a usage surface *does* exist, on a **separate endpoint we already call**:
`POST https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist`, body `{"metadata":{"ideType":"ANTIGRAVITY"}}`.
`antigravityAuth.ts:58` hits it for the project id (`ANTIGRAVITY_LOAD_URL`). Note it is pinned to the
**production** host while turns go to daily — the asymmetry the code already warns about.

Captured live (`200`), top-level keys: `currentTier, allowedTiers, cloudaicompanionProject, gcpManaged,
upgradeSubscriptionUri, paidTier`. The reference (`D:\scratch\CLIProxyAPI`,
`internal/runtime/executor/antigravity_executor_credits.go:453`) reads `paidTier.availableCredits[]`, keeping
the `creditType: GOOGLE_ONE_AI` entry's `creditAmount` + `minimumCreditAmountForUsage`.

**On this account `paidTier` carries `id` and `name` only — no `availableCredits` array.** The reference's own
code would take its `!credits.IsArray()` branch and record "known, unavailable". So there is no reading to
render here even via the side channel.

Three reasons this is a **new shape needing its own decision**, not a meter drop-in:

1. It is a **poll**, not the response head. The reference fires it in a background goroutine. #171's settled
   rule is that quota is a side channel **off the response head**
   ([[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]]) — a poll is neither that nor a stream event.
2. It reports an **absolute credit balance**, not a percentage of a window. No window size, no reset time.
3. It is **empty on a free-tier account**, so the common case has nothing to show even after the work.

> The response also embeds the account's **email address** in `upgradeSubscriptionUri`, and the free-tier
> prose quotes a "1,500 model requests per day" upgrade pitch — a plan attribute, not a reading. Anything
> captured off this endpoint must be redacted before it touches this repo
> ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]).

### 3. keyed: opencode-go — nothing on the head

Two fully-drained turns, `glm-5.2` on `https://opencode.ai/zen/go/v1/chat/completions`, `200` both times.
Complete head: `cache-control`, `cf-placement`, `cf-ray`, `connection`, `content-type`, `date`, `server`,
`transfer-encoding`. **Zero** ratelimit/quota/credit headers. Verdict: `nothing on the head`.

Because the head is empty, the ticket's `.withResponse()` question is **moot for this Provider** — changing
that shared call site would buy nothing. Worth knowing before anyone pays for it.

### 4. keyed: opencode-zen — reached, not served

`opencode-zen` shares opencode-go's credential (`keyId: 'opencode-go'`, `catalog.ts:77`), so it needed no new
key. It answered **`401` with `{"type":"error","error":{"type":"CreditsError","message":"Insufficient balance…"}}`**
(the message names a workspace billing page — workspace id redacted, it is account-identifying). Its head
carries no quota header either.

Recorded as **not captured** — the key is valid but the account has no balance, so no successful turn was
driven. The 401 is itself a finding though: **opencode signals exhaustion by failing the turn with a typed
`CreditsError`, not by reporting a level on the head.** That is an error-classification signal, closer to the
Antigravity 429 verdict path than to a meter.

### 5. Not captured, with reasons

`~/.wisp/auth.json` holds exactly one keys entry (`keys.opencode-go`). So **groq, mistral, openrouter,
openai** have no API key stored, and **kimi** needs the subscription #170 is still waiting on. None was
guessed at.

## What this means for #200's follow-up

Nothing to implement. Threading `onQuota` into the xai / antigravity / keyed arms would surface:

- **xai** — a bar pinned at 0% used, forever, with no window label. Worse than no bar.
- **antigravity** — nothing, unless a *polled* credits balance is adopted as a second quota shape, and even
  then it is empty on a free tier.
- **keyed (opencode)** — nothing, and the `.withResponse()` refactor buys nothing.

The empty-meter behaviour the statusline already has is the correct rendering for all four. `#200` closes as
recon-complete with no child ticket.

## Related

- [[active-work]]
- [[pick-up]]
- [[an-empty-quota-ledger-is-usually-correct-not-broken]]
- [[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
