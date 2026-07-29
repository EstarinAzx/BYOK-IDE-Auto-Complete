---
type: decision
project: wisp
date: 2026-07-29
tags: [context, decision, bridge, statusline]
---

# Quota is a side channel, not a BridgeStreamEvent — and a snapshot file, not a stream

## Decision

The response's utilization headers reach the statusline by **two hops that are both deliberately outside the
event stream**:

1. **Client → door: an `onQuota` callback**, fired off the response head inside `codexResponsesRequest` /
   `anthropicMessagesRequest`. Not a new member of `CodexStreamEvent` / `AnthropicStreamEvent` /
   `BridgeStreamEvent`.
2. **Door → statusline: a file**, `~/.wisp/status.json`, overwritten after each bridged turn on the
   Anthropic door and read by an out-of-process node script. Not a socket, not a config field.

Rejected alternative for hop 1: a `{ type: 'quota', meters }` event riding the existing stream union, on the
precedent that `usage` (#165) did exactly that.

## Why

**Hop 1 — the union is narrowed by six consumers and one of them fails dangerously.** `bridge.ts` already
warns in-line that the Anthropic encoder's `push()` treats *any* unrecognized event as a client tool call, so
an unhandled member does not degrade — it invents a `tool_use` block on the wire. `usage` earned that cost
because it genuinely has to interleave with content (the door defers `message_start` until usage arrives, so
it lands on the opening frame). Quota does not: it carries no wire content, no door renders it, and nothing
downstream orders against it.

And the headers are available **earlier** than any event could be. They arrive on the response *head* —
before a single SSE byte is read, before priming, before the retry boundary. A callback there is strictly
more timely than a stream event *and* touches one file per client instead of six consumers.

**Hop 2 — the reader is a different process with no Wisp code in it.** The statusline is a standalone
CommonJS script in the `wisp-slot` plugin; it cannot import `@wisp/core` and has no bundling step. A file in
the store it already reads `config.json` from is the whole integration. The cost is one real consequence: a
per-turn write into `~/.wisp` would wake the directory watcher and make both faces re-read `config.json`
every turn, so the watcher explicitly skips `status.json`. **Any future volatile file in that directory owes
the same exclusion.**

**Corollary — keyed Providers get no context reading at all.** They report usage as of #169, but their
context *window* is only known from models.dev, which the door does not fetch per turn.
`DEFAULT_MAX_INPUT_TOKENS` is a picker-budgeting placeholder, and a percentage computed against it would be
a confident wrong number where no number is the honest answer. The three OAuth kinds read their offline caps
tables; everything else omits the field. Same rule as the meters themselves: **a fabricated reading is worse
than a blank one**, which is also why a Codex window reporting `window-minutes: 0` produces no meter rather
than a 0% one.

## Reversibility

Hop 1 is cheap to reverse — the callback is one optional field on two request-arg types and one parameter on
`startProviderStream`; promoting quota to a stream event later means adding the member and a `continue` arm
in every consumer, which is the work the callback avoided, not work it blocked.

Hop 2 is the stickier half: `status.json`'s shape is now read by a script that ships in the plugin, so it is
a compatibility surface between the npm/vsix release and the marketplace plugin. Adding fields is free (the
reader ignores unknown keys); renaming or removing one needs both sides to move together.

## Related

- [[decisions]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
- [[2026-07-29-chat-completions-usage-is-a-sibling-mapper-not-a-shared-one]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[active-work]]
