---
type: gotcha
project: wisp
updated: 2026-07-29
tags: [context, gotcha]
---

# The harvest tickets' "Blocked by" is body text, not a native GitHub link

**The trap.** Every ticket in the CLIProxyAPI harvest (#165–#173) ends with a `## Blocked by` section
listing issue numbers. That section is **prose in the issue body**. The native GitHub
issue-dependency links are **not** set on these tickets.

So the GraphQL dependency query is useless here and, worse, *confidently* useless:

```graphql
issue(number: 173) { blockedBy(first: 10) { nodes { number state } } }
```

returns an **empty list** for #173 — which the body says is blocked by #169–#172, three of them open
at the time. An empty `blockedBy` reads exactly like "unblocked, go ahead".

**Why it bites a relay leg specifically.** The loop body's pick step is "oldest unblocked
`ready-for-agent` ticket, skip any whose blockers are still open." An unattended leg that trusts
`blockedBy` will happily start a ticket whose dependencies have not shipped, and nothing will stop
it — the label is right, the query said clear, and the work looks doable until it collides.

**What to do.** Read the ticket **body's** `## Blocked by` section and check those issue numbers'
states. `.context/active-work.md` keeps the same edges in its queue table; cross-check against it.
Treat an empty `blockedBy` as *no information*, never as *no blockers*.

Observed on relay leg 5 (2026-07-29) while picking after #169: #170, #171, #172 and #173 all
reported empty `blockedBy`, though #173's real edges were three open tickets.

## Related

- [[gotchas]]
- [[active-work]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
