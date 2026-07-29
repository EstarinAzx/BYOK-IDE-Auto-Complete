---
type: decision
project: wisp
date: 2026-07-29
tags: [context, decision, codex, catalog]
---

# A model list is not an accepted list — whitelist the probed ids

## Decision

The codex row's `defaultModel` is asserted against an explicit **whitelist of ids verified 200 by live
probe** (`gpt-5.6-sol`, `gpt-5.4`), not against a pattern that rejects the known-bad shapes. Adding a new
default means probing it first and adding it to that list.

Rejected alternative: a regex like `/-codex$/` on the theory that the `-codex` suffixed ids are the ones the
ChatGPT-account path refuses.

## Why

Two ids were actually probed as refused — `gpt-5.3-codex` and bare `gpt-5.6`. Note those two do not share a
shape: one has the `-codex` suffix, the other has no suffix at all. Any pattern covering both is a guess
fitted to two points, and it would have to *not* cover `gpt-5.6-sol`, which differs from bare `gpt-5.6` only
by a suffix. That is a rule with no known mechanism behind it.

The deeper reason is that **two different lists were being conflated**:

- `CODEX_MODELS` answers *which Codex model ids exist* — the dropdown's offer.
- The ChatGPT-account path separately answers *which of those a subscription may send*. It is narrower.

`gpt-5.3-codex` is a member of the first and not the second, and it is still perfectly valid for API-key
callers. So membership in the model list never implied acceptance, and the code had no place where that
distinction was written down.

A whitelist encodes the distinction honestly: it says "these are the ids someone actually observed working,"
which is the true state of the knowledge. A pattern would claim a rule nobody verified. When the whitelist is
wrong it fails closed — a new default trips the test until someone probes it — which is the correct direction
for a value whose failure mode is a fresh sign-in 400ing on its first turn.

Related: `codex.ts` already carried *"the codex row's defaultModel must stay a member of this list"* as a
comment nothing enforced. An invariant in a comment is an invariant that ships broken. The test now enforces
both halves against the real `PROVIDERS` row.

## Reversibility

Cheap, and the cost of being wrong is loud. Widening the whitelist is one array literal in
`packages/core/tests/codex.test.ts`; swapping it for a pattern later is a one-line change if a documented
rule about which ids the account path accepts ever appears. Nothing depends on the whitelist's shape outside
that one test.

## Related

- [[decisions]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[active-work]]
