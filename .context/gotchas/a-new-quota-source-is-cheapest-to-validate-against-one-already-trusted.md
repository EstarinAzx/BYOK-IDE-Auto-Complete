---
type: gotcha
project: wisp
date: 2026-08-14
tags: [context, gotcha, quota, recon, method]
---

# A new quota source is cheapest to validate against one already trusted

When a new endpoint claims to report quota, the instinct is to prove it moves — read it, spend some turns,
read it again, watch the number fall. On the Anthropic usage endpoint that instinct is expensive and weak:

- **Expensive** — it carries a multi-minute 429 penalty, so #204 capped the whole spike at 2–3 reads per
  endpoint. Watching a counter is the one method that wants many.
- **Weak** — the readings are **integer percents**. Ten minutes of ordinary use will not move a 5h window by
  a whole point, so "identical across two reads" is indistinguishable from "static ceiling" at that
  resolution. #204's two spaced Anthropic reads did in fact return the same `42` / `71`, and that observation
  on its own proves nothing either way.

**The cheap move: compare it against a source you already trust.** `~/.wisp/status.json` holds meters the
Bridge wrote from live turn headers. The endpoint's numbers matched them exactly — Anthropic 5h `42%` / 7d
`71%` with resets agreeing to the second, Codex 7d `100%` at `reset_at 1787198654`. Since the header meters
are known to move, exact agreement makes the endpoint the same live ledger, and
[[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]] is cleared without spending a
single extra read.

A secondary tell, free with any two reads: **the response is recomputed per call if its timestamps drift in
the sub-second digits.** #204's two reads returned `resets_at` at the same wall-clock instant but different
microseconds — a cached blob would have been byte-identical.

**The rule:** before budgeting reads to watch a counter, check whether the repo already stores the same
quantity from a different door. Cross-source agreement is stronger evidence than a short time series, and it
is free.

This does **not** retire [[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]] — that trap
is about *header* recon on a turn, where draining the body is what makes the reading real. This is the
complement for *endpoint* recon, where there is no turn to drain and no budget to repeat.

## Related

- [[gotchas]]
- [[2026-08-14-the-usage-endpoint-is-the-same-ledger-reached-without-a-turn]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]
- [[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]
