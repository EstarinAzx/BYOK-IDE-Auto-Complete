---
type: decision
project: wisp
updated: 2026-07-29
tags: [context, decisions]
---

# CLIProxyAPI harvest scoped — minimum record, usage first, registry rejected

## Decision

Harvest five things from `router-for-me/CLIProxyAPI` into Wisp, in a fixed order, spec [#164]:

1. **#165** usage plumbing for Codex + Grok — 2. **#166** Codex error classification →
3. **#167** minimum ProviderExecutor record — 4. **#168** transient retry/cooldown —
5. **#169** API-key usage — 6. **#170** Kimi.

Four scoping calls, each closing a path:

- **The ProviderExecutor seam is a plain record** `{ id, stream, classifyError }` replacing the three
  near-identical Bridge chat handlers. **Rejected: CLIProxyAPI's registry + `<from>/<to>` translator
  matrix.** That shape pays off across many dialects; Wisp has two doors. Also rejected: a class
  hierarchy, changes to the Provider kind union, changes to the Provider catalog.
- **The seam lands BEFORE the retry work, reversing the order first proposed.** Retry lives in the
  request handler and there are three of them — landing retry first means writing it three times and
  deleting two. #167 is the prefactor that makes #168 a single edit. Usage (#165) is exempt because it
  lives in the clients, not the handlers; classification (#166) touches only two wiring sites.
- **Local `count_tokens` deferred, not planned.** Building it means a tiktoken dependency; once usage
  flows, Claude Code sizes context from response usage and the endpoint's 404 may stop mattering.
  Revisit only if something still reads it after #165/#169.
- **Antigravity split to its own future spec.** The reference executor is ~5,600 lines — reasoning-replay
  cache, signature handling, schema sanitization, version probe, and a 795-line credits subsystem with a
  four-way 429 taxonomy. Folding it into #164 would swamp it. Kimi is the cheap one (~570 lines, plain
  RFC 8628 device flow, no PKCE, no loopback catcher) and ships first.

## Why

The trigger was the user's recurring codex 502s. Investigation found the likely cause is **not** the
window itself but that Wisp reports **zero token usage for every non-Anthropic Provider** — only
`anthropicClient` ever emits a usage event, so the Anthropic door closes Codex-served turns with
`output_tokens: 0` and no input count at all. Verified against real transcripts: an Anthropic-served
bridged turn records `input_tokens: 2, cache_creation: 65366, cache_read: 51864`; a bridged turn with
real assistant content and `stop_reason: tool_use` records all zeros. Claude Code sizes its
auto-compaction from that number, so it never compacts, the history grows unbounded, and Codex rejects
on its own window. This fits #163's 217k–245k cluster; a flaky backend would not cluster.

That makes usage the suspected root-cause fix rather than telemetry, which is why it leads the order and
why classification (turning a doomed-retry 502 into an actionable 400) follows immediately.

CLIProxyAPI is worth copying from specifically because it is sponsor-funded and further along on exactly
these four axes — its Codex terminal-error module, usage accounting package, and cooldown module are the
parts worth reading; the rest (many credentials per Provider, five dialects, plugin host, management API)
does not apply.

## Reversibility

**Easy.** Each ticket is independently shippable and independently revertable; nothing changes a stored
schema or a wire contract with a client. The one-way-ish door is #167 — once the three handlers are
collapsed, going back means re-splitting them, though its own acceptance bar (existing suite passes with
no test file modified) means a revert is a clean `git revert`.

The deferred items are recorded rather than discarded: `count_tokens` and Antigravity both have a
paragraph in #164 saying what would revive them.

## Related

- [[decisions]]
- [[active-work]]
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]] — the gotcha this supersedes in part: the Bridge does relay verbatim, but it is also why the conversation got big enough to be rejected
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]] — the header recon that unblocked #171 and surfaced #172
