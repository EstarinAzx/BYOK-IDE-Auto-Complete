---
type: gotcha
project: wisp
updated: 2026-07-25
tags: [context, gotchas]
---

# A Claude Code transcript row is one content BLOCK, not one message

In `~/.claude/projects/<slug>/*.jsonl`, a single assistant API message is persisted as **several
rows — one per content block**. Every row repeats the same `message.id`, `stop_reason`, and the
*identical* `usage` object. Fold rows by `message.id` before concluding anything, or the file lies
to you in three consistent ways:

- **Every message looks like it has exactly one content block.** It doesn't; the siblings are
  adjacent rows.
- **`usage` appears N times.** Summing per row multiplies real cost by the block count.
- **A text-only row seems to violate its own `stop_reason`.** `stop_reason: "tool_use"` on a row
  whose only block is text is correct — the `tool_use` block is in a sibling row.

All three were filed as wisp defects on 2026-07-25 ("content replaced by a placeholder, 7554 billed
tokens discarded, stop_reason violates its own contract"). None was real. The message reassembles to
`[thinking, text, tool_use(Write), text(marker)]` — nothing lost, tool block present, tokens spent on
content that was delivered. The one genuine defect underneath is [[2026-07-25-truncation-reason-rides-out-of-band-marker-gated-on-answer-text]].

Sibling trap, same directory: [[claude-code-can-refuse-a-turn-before-the-bridge-ever-sees-it]].

## Related

- [[gotchas]] — index
