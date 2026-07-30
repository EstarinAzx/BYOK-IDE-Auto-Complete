---
type: gotcha
project: wisp
date: 2026-07-30
tags: [context, gotcha, statusline, quota]
---

# An empty quota ledger is usually correct, not broken

`~/.wisp/status.json`'s `providers` map holds every Provider that reported utilization recently — **except
the one serving the current turn**, which is deliberately evicted because it *is* the top-level snapshot
([[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]).

So on a machine where a single Provider serves every turn, `providers` is **`null`/absent forever**, and the
statusline shows no remembered rows. That is the ledger working. It looks identical to a ledger that is not
being written at all.

Bit this immediately after cutting 2.0.42: the release was installed, the Bridge restarted, `status.json` was
zero minutes old with live meters — and `providers` was `null`, because every turn had been
`opus → anthropic`. Nothing was wrong.

**Before debugging an empty ledger, check whether a second Provider has actually served a turn.** Read
`routing.families` in `~/.wisp/config.json`: if the session's family and every family it has used point at
the same `providerId`, an empty map is the only correct answer. One turn on a differently-routed family
(here `sonnet → codex/gpt-5.6-sol`) creates the entry.

Two related traps in the same area:

- **Quota only arrives on a response head.** There is no way to re-read it on demand — no poll, no CLI
  command. If a Provider has not served a turn since the ledger's 24h window opened, its limits are simply
  unknown, and that is not recoverable without spending a turn.
- **Only two wires report at all, and that is now settled rather than pending.** `codexClient.ts`
  (`x-codex-*`) and `anthropicClient.ts` (`anthropic-ratelimit-unified-*`) wire `onQuota`; `xaiClient.ts`,
  `antigravityClient.ts` and the keyed path do not. Grok, Antigravity and the keyed Providers will never
  appear in the ledger no matter how many turns they serve — **because their heads carry nothing usable**, not
  because the wiring is missing. #200 captured all four: Grok's `x-ratelimit-*` never decrement and have no
  reset field, Antigravity and opencode put nothing quota-shaped on the head at all
  ([[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]). Do not file this as a gap.
- **Codex on a Plus plan has exactly ONE window, so waiting for a 5h codex bar is waiting forever.** Captured
  live 2026-07-30 off `chatgpt.com/backend-api/codex`: `x-codex-primary-window-minutes: 10080` (→ `7d`) with
  `x-codex-secondary-window-minutes: 0`, and `parseCodexQuota` correctly refuses a slot without both a
  reading and a window size (`status.ts:88-91`) — so a codex session renders a single `7d` row, never a pair.
  A `5h`/`7d` pair in the block is **Anthropic's**, which is the tell for the displacement bug
  ([[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]). The head also carries
  `x-codex-plan-type`, `x-codex-active-limit` and `x-codex-credits-*`, none of which are windows.

## Related

- [[gotchas]]
- [[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
