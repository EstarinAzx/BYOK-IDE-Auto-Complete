---
type: gotcha
project: wisp
date: 2026-07-30
tags: [context, gotcha, quota, recon, providers]
---

# A cancelled response body cannot test whether a counter decrements

Reading a response head and then calling `res.body.cancel()` is the cheap, obvious way to capture headers
without paying for output tokens. It is also **useless for deciding whether a `remaining`-style counter is
live**, because an aborted stream may never be billed — so the counter has nothing to move, and a static
ceiling and a working meter produce identical readings.

This nearly inverted #200's answer. The first capture pass cancelled every body and reported
`x-ratelimit-remaining-requests: 864` against `x-ratelimit-limit-requests: 864` on Grok — which reads as
"headers present, parseable, just untouched so far". The honest test is to **fully drain** the stream (`await
res.text()`, byte count logged as proof the turn completed) and fire the request **2–3 times in a row**:

```
grok-build, 3 drained turns @ 9112 bytes each  → 864/864, 864/864, 864/864
grok-4.5,   2 drained turns @ 9153 bytes each  → 8300/8300, 8300/8300
```

Only then is it clear those are the plan's **advertised ceilings**, not a reading
([[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]).

**The rule: one request can tell you a header exists; only consecutive completed requests can tell you what it
means.** Any recon that ends in "the number looked plausible" has not been run yet. Two cheap corroborating
checks, both free: is there a matching `*-reset*` header (no window, no meter), and does the value look like a
round plan figure rather than a measurement.

Same trap in reverse for cost: draining is not expensive if the prompt is one line and the reply is a single
word (`"Reply with the single word: ok"` → ~9 KB of SSE). There is no reason to cancel.

## Related

- [[gotchas]]
- [[quota-recon]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
