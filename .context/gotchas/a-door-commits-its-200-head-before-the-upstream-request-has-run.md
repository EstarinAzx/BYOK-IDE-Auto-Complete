---
type: gotcha
project: wisp
updated: 2026-07-29
tags: [context, gotchas]
---

# A Bridge door commits its 200 head before the upstream request has run

The provider streams (`codexStream`, `anthropicStream`, `xaiStream`) are **async generators**, so calling one
performs **no IO at all**. The `fetch` — and any 4xx it throws — happens on the **first pull**, inside the
`for await`. Every door wrote its SSE head first:

```ts
const upstream = codexStream({ … });   // nothing has happened yet
res.writeHead(200, { 'Content-Type': 'text/event-stream', … });   // <- status committed
for await (const ev of upstream) { … } // <- the request finally fires, and 400s HERE
```

By the time the `catch` runs, `res.headersSent` is `true`, so the whole error arm collapses to `res.end()`:
**the client gets a 200 with an empty body.** Not the 502 the code appears to send — the 502 branch was
unreachable for any pre-stream failure. This silently defeated #166 until `primeStream` was added
(`bridgeServer.ts`): it pulls the first event ahead of the head and re-yields it, so the throw lands while a
status is still settable.

**The tell in a test:** `expected 200 to be 502`. If a Bridge test asserts any error status on a *streaming*
request and gets 200, this is why — not a routing miss.

**Fixed everywhere as of #167** (`c697733`): the four per-kind paths collapsed into one `ProviderExecutor`
handler and priming became uniform, rather than four copies of it. #168 then took a dependency on that
uniformity — the first pull is the boundary between "delivered nothing" (retryable) and "content is on the
wire" (never discarded and restarted), so a door that had not primed would have had no such boundary at all.
See [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]].

Two things this is *not*:

- Not the same as a **mid-stream** failure. Once real frames have gone out, the head is legitimately spent —
  the Anthropic door writes an `anthropicErrorFrame` there and that behaviour is unchanged and correct.
- Not a latency regression. The Anthropic door already deferred `message_start` until the first upstream usage
  event ([[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]] era, #165), so no *frame*
  arrived earlier than this before. Only the bare HTTP head moved later.

## Related

- [[gotchas]] — index
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]] — the ticket this blocked
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]] — the failure that was being misreported
