---
type: gotcha
project: wisp
date: 2026-08-05
tags: [context, gotcha, statusline, routing]
---

# The statusline duplicates resolveRoute — and it has drifted twice

`plugins/slot/statusline/wisp-statusline.js` runs **out-of-process** under Claude Code's statusline hook. It cannot import `@wisp/core`, so it **re-implements** `resolveRoute` (`packages/core/src/routing.ts:60-91`) in plain JS. That duplicate is unit-invisible: vitest covers core only.

It drifted immediately. The copy knew one rung of four — the family fuzzy — so an **aliased** route resolved to no Target at all. Reported from a screenshot: session routed to `sol` (→ `codex/gpt-5.6-sol`), block rendered a bare `wisp` row plus `anthropic 5h 5% · 7d 36% 7m ago`. Fixed `f565e94` (`wisp-slot` 1.7.1).

**Then it drifted a second time, in the fix for the first.** The copy now knew the alias rung but matched it against the raw `stdin.model.id`, and a *picked* alias never arrives raw — Claude Code's picker sends `claude-wisp-keemee`, the door's own discovery prefix ([[a-picked-alias-reaches-the-statusline-prefixed-claude-wisp]]). Same screenshot, same bare `wisp` row, five days later. Fixed `2705bac` (`wisp-slot` 1.7.3) by normalizing the name (`^claude-wisp-`, then a trailing `[…]` tier suffix) before any exact match.

**Both times the fixtures were the accomplice** — authored from the same mental model as the code, so their agreement proved nothing ([[2026-08-05-a-duplicated-resolver-is-fixtured-with-what-its-caller-sends-not-what-its-source-names]]). When a route row is wrong, `grep model ~/.claude/settings.json` **first**: it shows the exact string the reader is being handed, and it is cheaper than the whole check suite.

The real lookup order, which the copy must mirror: **provider-id → alias exact → family fuzzy (`claude-*` only) → active fallback.**

**Two things make this bug hard to read from the symptom:**

- **A wrong-Provider reading looks identical to a stale one.** Failed resolution makes `live` unreachable (the gate is `status.model === target?.model` — `undefined` on the right side can never match), so the last snapshot demotes to the dimmed, age-stamped row. That is the *correct* rendering of an unknown route, and it is also exactly what a genuinely old reading looks like. **Suspect resolution before suspecting the ledger** — and check whether the picked model is an alias.
- **The route row degrades field by field, silently.** No Target means no model, no `ctx`, no `providerId` — the row collapses to the word `wisp` with no error anywhere.

**"Showing anthropic when I'm on codex" has TWO causes, and the route row tells them apart.** This page is cause one (resolution failed → row collapses to bare `wisp`). Cause two is the **global-slot displacement** found 2026-07-30: the route row is *complete and correct* (`sonnet → gpt-5.6-sol │ codex`) and another Provider's reading is still the only quota row, because a concurrent session owns the top-level snapshot and this route's reading sits unread in the `providers` ledger ([[status-json-is-global-so-it-cannot-observe-another-session]], fixed by [[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]). **Read the route row first:** bare `wisp` → resolution; named route + foreign quota → displacement.

**Two rungs are still missing** (`provider-id direct` and the `active` fallback). Since the normalization landed, a picked **Provider** row reaches the copy as a bare provider id (`anthropic`) — but `~/.wisp/config.json` carries only the *active* provider, no catalog, so there is nothing to match it against and the row correctly collapses to bare `wisp`. Left unimplemented on purpose: a guess there would trade a visibly missing row for a confidently wrong one. Rare in practice — Claude Code sends an alias or a `claude-*` name.

**Run the check after touching either side.** `node plugins/slot/statusline/check.js` — now **24 assertions**, drives the real script through a sandboxed `WISP_HOME`, no framework, exit code is the verdict. All three fixes were control-verified against their own pre-fix file (5 of 10 for `f565e94`; 4 of the 10 added for the displacement fix; 3 of the 4 added for the prefix fix, the fourth labelled in-file as a regression pin) — the control is what proves a new assertion tests something ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]). Remember the block also reads from the **repo checkout**, not the plugin cache ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]).

## Related

- [[gotchas]]
- [[a-picked-alias-reaches-the-statusline-prefixed-claude-wisp]]
- [[2026-08-05-a-duplicated-resolver-is-fixtured-with-what-its-caller-sends-not-what-its-source-names]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[an-empty-quota-ledger-is-usually-correct-not-broken]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[flows]]
