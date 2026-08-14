---
type: decision
project: wisp
updated: 2026-08-05
tags: [context, decisions, statusline, routing, testing]
---

# A duplicated resolver is fixtured with what its CALLER sends, not what its source names

**Decision:** `plugins/slot/statusline/check.js` must drive every route case with the model id **Claude Code actually sends** — the picker's `claude-wisp-<name>` form, tier suffix included — not the bare Alias name the Routing map stores. Bare-id cases stay, but only as the secondary shape (a hand-set `ANTHROPIC_MODEL`); the prefixed form is the primary. The reader normalizes (`^claude-wisp-` then a trailing `[…]`) before any exact match.

**Why:** the statusline re-implements `resolveRoute` out-of-process and has now drifted **twice**, and the same accomplice appeared both times — the fixtures agreed with the copy instead of with reality. The first drift (`f565e94`) taught it aliases; the check written to lock that in fed `{ id: 'sol' }`, a string the picker never produces, so it certified the very rung that was still broken. Ten assertions passed while every picked alias on the machine rendered a bare `wisp` row, for five days.

The general shape: when a fixture is authored from the same mental model as the code, agreement between them is not evidence. A duplicated resolver's fixture has to be sourced from the **caller's** wire format — here, one `grep` of `~/.claude/settings.json` would have shown `"model": "claude-wisp-keemee"` and ended the whole investigation before it started. That grep is cheaper than the check suite and should come first whenever a route row is wrong.

Corollary already in force and reaffirmed: a new assertion is worth nothing until the **pre-fix** file fails it ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]). Three of the four added here fail on `HEAD~1`; the fourth is labelled in-file as a regression pin, not a control case, so nobody later mistakes it for proof.

**What was deliberately NOT done:** the `provider-id` rung stays unimplemented in the copy. Stripping the prefix means a picked **Provider** row now arrives as a bare provider id (`anthropic`), but `~/.wisp/config.json` carries only the *active* provider — no catalog — so the reader has nothing to match it against and correctly renders a bare `wisp`. Shipping a guess there would trade a visibly missing row for a confidently wrong one. Revisit only if the config gains a Provider list.

**Reversibility:** easy — the normalization is one `clean()` helper and four assertions.

## Related

- [[decisions]]
- [[a-picked-alias-reaches-the-statusline-prefixed-claude-wisp]]
- [[the-statusline-duplicates-resolveroute-and-drifts]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]
