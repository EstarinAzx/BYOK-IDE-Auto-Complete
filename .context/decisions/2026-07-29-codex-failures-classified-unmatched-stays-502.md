---
type: decision
project: wisp
updated: 2026-07-29
tags: [context, decision]
---

# Codex failures classify into four conditions; anything unmatched stays 502 — SHIPPED `07969d2` (#166)

**Decision.** `classifyCodexError(status, body)` in `codex.ts` (pure, beside `responsesUsage`) recognises
four backend conditions and the Bridge answers each with a real status:

| condition | → | code | type |
|---|---|---|---|
| context too large | **400** | `context_length_exceeded` | `invalid_request_error` |
| invalid thinking signature | **400** | `invalid_thinking_signature` | `invalid_request_error` |
| previous response not found | **400** | `previous_response_not_found` | `invalid_request_error` |
| auth unavailable | **401** | `auth_unavailable` | `authentication_error` |

Four deliberate limits:

1. **Unmatched returns `undefined` and the caller keeps its 502.** The load-bearing one. A confidently wrong
   client-error status would stop the client retrying a *real* outage — strictly worse than the generic 502
   this replaces. Needles are kept tight for the same reason (the bare `previous_response_id` param name is
   deliberately not a needle).
2. **401 by status alone; 403 never.** A 401 with an opaque body is still an auth failure. 403 is excluded
   because the ChatGPT-account path also 403s **model** rejections (#172) — "sign in again" would be a
   confidently wrong diagnosis for those.
3. **One flat needle list per condition, matched lowercased.** The backend says the same thing three ways —
   upstream `code`, error `type`, message prose — and all three are just substrings of the body. Three
   separate arrays would be documentation, not behaviour; the tests carry that job instead (each condition is
   exercised in each wire form).
4. **Codex only, gated on `isCodexProvider`.** Grok rides the same Responses wire and would match on prose,
   but only the `Codex API error <status>:` prefix parse is Codex-specific. Generalising belongs on #167's
   record, not in a fourth copy now.

**`classifyCodexErrorMessage(message)`** is the adapter: the Bridge holds the thrown `Error`, never the
`Response` — the same position `parseUsageLimitReset` works from. A throw carrying no status (a
`response.failed` frame, the local sign-in guards) still classifies on prose, so the commonest auth failure
isn't the one case left at 502.

## Why

A 502 tells Claude Code the server broke and the request is worth retrying, so it retried requests that could
never succeed — most damagingly an over-window conversation, which is *larger* on the retry. Three of the four
conditions are things the client can act on the moment it is told; the fourth tells the user to sign in
instead of showing a gateway failure.

Making it reach the wire needed one thing the ticket didn't anticipate: the doors committed their 200 SSE head
**before** the upstream request ran, so `res.headersSent` was already true in every `catch` and no status was
settable. `primeStream` fixes that — see
[[a-door-commits-its-200-head-before-the-upstream-request-has-run]]. That fix also restores the *unclassified*
502 on those paths, which had silently been a 200-with-empty-body.

## Reversibility

High. The classifier is pure and additive; deleting the `classifyProviderError` call at the two catch sites
restores the blanket 502 exactly. `primeStream` is the one behavioural change worth keeping regardless — it
makes the pre-existing 502 branch reachable rather than dead code. #167 should fold both into the
`ProviderExecutor` record (the record already carries "its error classifier" by spec), and #168's retry must
treat a non-`undefined` classification as **do not retry** — all four are client errors.

## Related

- [[decisions]]
- [[active-work]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]] — the parent harvest spec
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]] — the trap this uncovered
- [[2026-07-23-usage-limit-cooldown-family-fallback-only]] — the prior art this mirrors (`parseUsageLimitReset`)
