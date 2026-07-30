---
type: decision
project: wisp
date: 2026-07-30
tags: [context, decision, statusline, quota]
---

# The statusline finds its quota by Provider, in either of two places

## Decision

The block's meter rows are the **route's own Provider's** windows, looked up by **`providerId`** in *both*
places a reading can live:

1. the top-level snapshot, when `status.providerId === target.providerId`; else
2. `status.providers[target.providerId]`.

Whichever answers, the reading is rendered as the leading meter rows — and stamped with its age on the
group's first row unless it came from this session's own turn. The route's Provider is excluded from the
dimmed tail rows, so no wire renders twice.

Two guards stay exactly as they were: `ctx` still requires the stricter **model** match (`live`), and either
source is pruned on read at `LEDGER_MAX_AGE_MS`.

This is a **reader-only** change (`plugins/slot/statusline/wisp-statusline.js`). Rejected on the writer side:
keying `status.json` by Claude Code session id (the door has no session identity — Claude Code sends none);
writing the active Provider into `providers` as well as the top level (contradicts the eviction rule that
makes the two-place lookup unambiguous); and one status file per Provider (a directory to prune, for a file
that is regenerable telemetry).

## Why

**`status.json` is one global slot, so the top level is not "your session" — it is the last turn on the
machine.** A second bridged session on another Provider owns it continuously
([[status-json-is-global-so-it-cannot-observe-another-session]]). The reader trusted only that slot for a
live reading, so a `sonnet → codex` session watched an `opus → anthropic` session's `5h`/`7d` pair sitting
where its own quota belongs, and its codex reading — already safely in the ledger — went unrendered.
Reported as *"why isn't my codex quota showing up, it's showing anthropic's instead"*, the **second** report
of that same sentence: `f565e94` fixed a resolution miss with the identical symptom
([[the-statusline-duplicates-resolveroute-and-drifts]]).

**Keying on `providerId` rather than `model` is the account/conversation split applied, not a new rule**
([[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]). A sibling model
on the same Provider spends the same window, so `gpt-5.6-terra`'s meters describe `gpt-5.6-sol`'s account
truthfully; its context percentage describes a different conversation and is still refused.

**The two-place lookup is only unambiguous because of the eviction rule.** `mergeStatus` deletes the
incoming Provider from the ledger, so at any instant a Provider is in exactly one of the two places — the
lookup can never find two readings for one wire and have to pick. That rule was written for a different
reason (don't render the same wire live and stale at once); this depends on it, so weakening it breaks this.

**Showing another Provider's numbers is worse than showing none.** The tail row was already dimmed and
age-stamped, but as the block's *only* reading it read as "your quota" — and the honest render for an
unmeasured Provider is no bar at all. In the reported frame codex had never turned, so no reading existed
anywhere; the fixed block correctly shows the route row alone.

## Reversibility

**Trivial.** One reader, no schema change, no release surface — the wrapper runs the repo checkout
([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]), so it went live on commit. Reverting
the lookup restores the previous block exactly. `plugins/slot/statusline/check.js` pins it at 20 assertions;
4 of the 10 new ones fail against the pre-fix file (`git show HEAD~1:…`), which is the control that proves
they test something ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]).

## Related

- [[decisions]]
- [[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[the-statusline-duplicates-resolveroute-and-drifts]]
- [[an-empty-quota-ledger-is-usually-correct-not-broken]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
