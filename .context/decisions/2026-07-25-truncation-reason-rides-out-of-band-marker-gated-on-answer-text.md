---
type: decision
project: wisp
updated: 2026-07-25
tags: [context, decisions]
---

# Truncation reason rides out of band; the marker is gated on answer text (#163, 2.0.37)

**Decision.** Upstream's cut-short `stop_reason` (`max_tokens` / `content_filter` / `refusal`) is
carried to the client as a real `stop_reason`, not as prose. A `truncation` BridgeStreamEvent
(`{type, reason}`) is yielded by `anthropicStream`, mapped in `bridgeServer`, and consumed by both
Anthropic-door renderers; `stop_reason` becomes `truncation ?? (sawTool ? 'tool_use' : 'end_turn')`.
Three sub-rules, each load-bearing:

1. **Truncation outranks `tool_use`.** Mirrors upstream, which sent `refusal` alongside a real
   `tool_use` block (the 7554-token turn). The reason describes how the turn *ended*.
2. **The visible `_[Response truncated: <reason>]_` marker is gated on `sawDelta`, not `delivered`.**
   Thinking is not an answer. Gating on "any content" would silently blank the commonest shape on
   record — 5 of 6 content-bearing refusals are `[thinking, marker]` with no answer text.
3. **VS Code native chat keeps the marker unconditionally.** A `LanguageModelTextPart` has no
   `stop_reason` channel, so prose is the only signal that surface has.

**Why.** The door hardcoded `sawTool ? 'tool_use' : 'end_turn'` in both the SSE encoder and the
buffered reducer, so every truncated turn reached Claude Code labelled a clean finish and the reason
survived only as markdown appended to `content` — which is persisted to the transcript and replayed
to the model next turn as its own words. Observed 15× between 2026-07-05 and 2026-07-25.

**Reversibility.** Easy but don't. Removing the marker entirely resurrects the #89 empty-envelope
bug (Claude Code rejects "empty or malformed"); the marker is what keeps a content-less envelope
non-empty. Any consumer of `BridgeStreamEvent` MUST handle `truncation` explicitly — the Anthropic
encoder's `push()` treats an unrecognized event as a client tool call, so an unhandled one invents a
bogus `tool_use` block. The buffered reducer is guarded and safe.

## Related

- [[decisions]] — index
- [[cc-transcript-rows-are-blocks-not-messages]] — the trap that made this look like data loss
