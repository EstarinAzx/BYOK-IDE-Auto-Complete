---
type: gotcha
project: wisp
date: 2026-07-30
tags: [context, gotcha, statusline, routing]
---

# The statusline duplicates resolveRoute — and it has already drifted once

`plugins/slot/statusline/wisp-statusline.js` runs **out-of-process** under Claude Code's statusline hook. It cannot import `@wisp/core`, so it **re-implements** `resolveRoute` (`packages/core/src/routing.ts:60-91`) in plain JS. That duplicate is unit-invisible: vitest covers core only.

It drifted immediately. The copy knew one rung of four — the family fuzzy — so an **aliased** route resolved to no Target at all. Reported from a screenshot: session routed to `sol` (→ `codex/gpt-5.6-sol`), block rendered a bare `wisp` row plus `anthropic 5h 5% · 7d 36% 7m ago`. Fixed `f565e94` (`wisp-slot` 1.7.1).

The real lookup order, which the copy must mirror: **provider-id → alias exact → family fuzzy (`claude-*` only) → active fallback.**

**Two things make this bug hard to read from the symptom:**

- **A wrong-Provider reading looks identical to a stale one.** Failed resolution makes `live` unreachable (the gate is `status.model === target?.model` — `undefined` on the right side can never match), so the last snapshot demotes to the dimmed, age-stamped row. That is the *correct* rendering of an unknown route, and it is also exactly what a genuinely old reading looks like. **Suspect resolution before suspecting the ledger** — and check whether the picked model is an alias.
- **The route row degrades field by field, silently.** No Target means no model, no `ctx`, no `providerId` — the row collapses to the word `wisp` with no error anywhere.

**Two rungs are still missing** (`provider-id direct` and the `active` fallback), so a model that is neither an alias nor a `claude-*` name still renders a bare row. Rare in practice: Claude Code sends one or the other.

**Run the check after touching either side.** `node plugins/slot/statusline/check.js` — 10 assertions, drives the real script through a sandboxed `WISP_HOME`, no framework, exit code is the verdict. It was control-verified: 5 of 10 fail against the pre-fix file. Remember the block also reads from the **repo checkout**, not the plugin cache ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]).

## Related

- [[gotchas]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[an-empty-quota-ledger-is-usually-correct-not-broken]]
- [[flows]]
