---
type: gotcha
project: wisp
updated: 2026-07-25
tags: [context, gotchas]
---

# Claude Code can refuse a turn before the Bridge ever sees it — read its transcript, not the serve log

`Context limit reached · /compact or /clear to continue · /model opus[1m]` in a bridged
session **looks** like a wisp failure and is not one. Claude Code 2.1.220 refused the
turn against its **own** local budget; nothing was sent, so the serve log shows no route
line and there is nothing wisp could have done.

**How to tell in one glance — Claude Code's own transcript**, at
`~/.claude/projects/<slugified-cwd>/<session-uuid>.jsonl`, one JSON event per line:

```
02:59:58.210Z  user      [tool_result]  (bash output lands)
02:59:58.214Z  assistant <synthetic>    "Prompt is too long"   isApiErrorMessage:true
```

**4 ms.** No network round trip → local block. A real upstream rejection carries a
round-trip gap (hundreds of ms up) and a matching `[bridge]` line in the serve log. The
`error: "invalid_request"` field on that record is Claude Code's own label — it does
**not** prove the API answered.

The transcript is the ground truth for any "is this wisp or the harness?" question: it
records the model, per-turn `usage` (input / cache_read / cache_creation), and every
synthetic error, and it survives the session. `/context` output lands in it too.

**The 2.1.220 accounting bug behind that particular block:** the headline read
`68.2k / 200k (34%)` while the category table summed to exactly 200k with
`Messages 107.2k` and zero free space — a fabricated figure for a 3-turn session that
had just been `/clear`ed. The gate reads the inflated number, the meter shows the honest
one. A healthy session shows a `Free space` row instead; a blocked one has it consumed.

**Workaround is harness-side only:** pick a `[1m]` id (`/model claude-opus-5[1m]`, or
`"model"` in `.claude/settings.json` — full ids only, family words take no tier). That
raises the local ceiling to 1M so the bad math stays under it. It is also simply the
*correct* label for a bridged session: wisp puts `context-1m` on every non-Haiku Claude
request, so the wire was always 1M and the 200k budget was always wrong — see
[[2026-07-25-1m-tier-is-a-harness-label-not-a-wire-model]].

## Related

- [[gotchas]] — index
- [[2026-07-25-1m-tier-is-a-harness-label-not-a-wire-model]] — why the label and the wire disagree
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]] — the mirror image: a window error that IS the provider's, relayed verbatim
