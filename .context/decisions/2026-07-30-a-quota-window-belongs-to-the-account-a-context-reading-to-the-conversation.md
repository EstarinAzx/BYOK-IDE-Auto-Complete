---
type: decision
project: wisp
date: 2026-07-30
tags: [context, decision, statusline, quota]
---

# A quota window belongs to the account, a context reading to the conversation

## Decision

`~/.wisp/status.json` stops being a single overwritten snapshot. It gains a **`providers` ledger** — a map
of every Provider that reported utilization in the last 24 hours (`{ updatedAt, model, meters }` per
Provider id) — merged in by the pure `mergeStatus(prev, next)` and applied by `WispHome.writeStatus`.

Three rules fall out of one distinction:

1. **Only quota carries across a route switch.** The outgoing Provider's `meters` move into the ledger.
   Its context fill does not, and neither does its model's window.
2. **The active Provider is never in the ledger.** It *is* the top-level snapshot. Holding both would let
   a reader render the same wire twice, once stale.
3. **A stale snapshot loses its `ctx` reading and keeps its meters.** Past the reader's 30-minute freshness
   bound, or on a model that does not match the session's resolved Target, `ctx` disappears — but the
   meters demote to a dimmed row stamped with the reading's age rather than vanishing.

Rejected: remembering the whole entry per Provider (context included); polling the Providers for quota out
of band; and the status quo of hiding every reading the moment the snapshot ages out.

## Why

**The two numbers have different owners, and #171 conflated them.** Context fill measures *this
conversation* against *this model's* window — it dies with the conversation, and a reading from a finished
session is a confident wrong number about the live one. A quota window measures *the account* against
*time* — it outlives every conversation, and 5h/7d windows move slowly enough that a reading from twenty
minutes ago is still the best available truth. #171 treated both as one snapshot with one freshness bound,
so ageing out the context reading also deleted a perfectly good account reading.

**"Never a confident wrong number" is not "never an old number" — it is never an *unlabelled* one.** The
ledger's honesty comes from the reader printing the age (`3h ago`) beside every remembered row, so an old
reading is presented as old. That is what makes keeping it legitimate; without the age stamp the same data
would be exactly the failure #171 exists to prevent.

**A route switch was silently destroying data nobody could get back.** The Bridge overwrote the file after
every bridged turn, so the first Anthropic turn after a Codex one erased what Codex had just said about the
weekly limit — and nothing re-reads it, because quota only arrives on a response head. The account's own
limits were being thrown away as a side effect of tidiness.

**Why the eviction rule is not merely cosmetic:** without it the ledger keeps an entry for the wire that is
also the top-level snapshot, and the reader has no way to know the two describe the same account window —
it renders a live row and a stale row for one Provider, which reads as two limits.

**Bounded at 24 hours** because a ledger that never forgets accumulates Providers the account no longer
uses and eventually presents last week's limits as news. A day outlives the 5h window and covers most of
the 7d one. Pruning happens on **write and on read** — nothing rewrites `status.json` while nothing runs,
so an idle machine needs the reader to prune too.

## Reversibility

**Easy, in both directions.** `providers` is an optional field on an existing telemetry file — a reader
that ignores it renders exactly the pre-2.0.42 block, and an older Bridge simply never writes it (which is
why `wisp-slot` 1.7.0 works against any Wisp, showing fewer rows on an older one). The file is regenerated
every bridged turn, so there is no migration and nothing to undo; deleting the merge restores the
overwrite in one line.

## Related

- [[decisions]]
- [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]] — the hop this extends: quota still
  arrives off the response head and still travels by file, only the file now remembers
- [[status-json-is-global-so-it-cannot-observe-another-session]] — unchanged, and the ledger does not
  soften it: the file is still one per machine
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]] — why the redesigned block was live
  before the plugin cache moved off 1.6.0
