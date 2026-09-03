---
type: gotcha
project: wisp
date: 2026-09-04
tags: [context, gotcha, antigravity, schema, bridge]
---

# A tool schema the wire rejects fails every turn, not one tool

The tool list rides on **every** request, so one malformed declaration 400s the whole conversation —
at every model on that Provider, forever, not just when the model reaches for that tool. It presents
as *"Antigravity is down"* or *"all the gemini models are broken"*, and the reporter has no reason to
suspect a tool they never called.

The 2026-09-04 case: an MCP tool declared `query.where` as an array of arrays with nothing inside the
inner one. Every Antigravity turn in that session failed. Nothing was wrong with Antigravity, the
account, the models, or the quota.

**Read the error — it is a precise address, not prose:**

```
GenerateContentRequest.tools[0].function_declarations[1].parameters
  .properties[query].properties[where].items.items: missing field
```

`function_declarations[1]` is the **second tool in the list Claude Code sent**, and everything after
`parameters` is the JSON-Schema path to the offending node. Both halves matter, and the first one is
the one people skip.

Three traps around it:

- **The failing tool is usually not in this repo.** The list is the client's — its own tools plus every
  MCP server the user has configured — so the culprit may live in a server the codebase has never seen.
  Capture the actual request body rather than reasoning about which tools "should" be there; a probe
  that records one `POST /v1/messages` and answers 400 costs a minute and turns the guess into a file.
- **It surfaces as a 502, so the client retries a request that can never succeed.** The Antigravity arm
  classifies only 429s ([[the-anthropic-door-does-not-use-the-executor-records]]), so a deterministic
  400 falls through to `provider request failed` — a gateway error, which Claude Code correctly reads
  as "retry". The user sees a retry storm (`attempt 5/10`) instead of one hard failure naming the tool,
  and the retries hide the stable error underneath. This is the same instruction problem #166 fixed for
  Codex, still open on this arm.
- **A truncated terminal is not the error.** The 502 wrapper plus the JSON body pushes the load-bearing
  clause off-screen, and the path *is* the whole diagnosis. Read the Bridge log or capture the body —
  and note the log only exists when the Bridge runs under `wisp serve`; a TUI-hosted Bridge writes
  nothing to `bridge.log`.

## Related

- [[gotchas]]
- [[2026-09-04-the-server-not-the-proto-says-which-schema-fields-are-required]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
