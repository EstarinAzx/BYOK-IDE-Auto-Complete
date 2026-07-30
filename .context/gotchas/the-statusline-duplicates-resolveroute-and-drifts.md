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

**"Showing anthropic when I'm on codex" has TWO causes, and the route row tells them apart.** This page is cause one (resolution failed → row collapses to bare `wisp`). Cause two is the **global-slot displacement** found 2026-07-30: the route row is *complete and correct* (`sonnet → gpt-5.6-sol │ codex`) and another Provider's reading is still the only quota row, because a concurrent session owns the top-level snapshot and this route's reading sits unread in the `providers` ledger ([[status-json-is-global-so-it-cannot-observe-another-session]], fixed by [[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]). **Read the route row first:** bare `wisp` → resolution; named route + foreign quota → displacement.

**Two rungs are still missing** (`provider-id direct` and the `active` fallback), so a model that is neither an alias nor a `claude-*` name still renders a bare row. Rare in practice: Claude Code sends one or the other.

**Run the check after touching either side.** `node plugins/slot/statusline/check.js` — now **20 assertions**, drives the real script through a sandboxed `WISP_HOME`, no framework, exit code is the verdict. Both fixes were control-verified against their own pre-fix file (5 of 10 for `f565e94`; 4 of the 10 added for the displacement fix) — the control is what proves a new assertion tests something ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]). Remember the block also reads from the **repo checkout**, not the plugin cache ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]).

## Related

- [[gotchas]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[an-empty-quota-ledger-is-usually-correct-not-broken]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[flows]]
