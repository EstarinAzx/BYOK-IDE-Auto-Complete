---
type: decision
project: wisp
date: 2026-08-14
tags: [context, decision, antigravity, effort, bridge]
---

# Antigravity effort reaches only the `-tiered` rows

## Decision

Claude Code's `/effort` (`output_config.effort`) now threads into the Antigravity arm of the Bridge door,
folded to that wire's three stops and emitted as
`request.generationConfig.thinkingConfig = { thinkingLevel, includeThoughts: true }` — **but only on rows
whose id ends `-tiered`.** Every other Antigravity row is left byte-identical to 2.0.44.

Shipped `d96b73a` (feat) + `bd21076` (release), `wisp-router@2.0.45`, vsix 1.13.0 owed.

- `standardEffortToAntigravity` (`shared.ts`) — `low|medium|high` pass through, `xhigh` and `max` fold to
  `high`.
- `antigravityAcceptsThinkingLevel` (`antigravity.ts`) — a **suffix shape test**, not a pinned id list.
- `applyAntigravityThinkingLevel` — runs **last** in `buildAntigravityRequestBody`, after every existing
  stage, so the forks and both schema cleaners see exactly what they saw before.

## Why

**The wire has a real dial, contrary to the old code comment.** `bridgeServer.ts:691` claimed "Gemini bakes
the reasoning level into the model id" and passed no effort at all. Half true: the ids *do* carry tiers,
and there is *also* a `thinkingConfig` field, proven in the reference's own
`antigravity_executor_interactions_test.go` and then driven live here.

**Almost every row pins its tier in the name.** `wisp models antigravity` returns 21 ids that collapse to
the 7 rows Antigravity's own picker shows: `gemini-3.6-flash-low|-medium|-high` is one picker line plus a
three-stop slider. `gpt-oss-120b-medium` and both Claude rows carry theirs the same way — the user
confirmed the vendor client **greys its Effort slider out on exactly those rows**.

**Wisp's picker is not Antigravity's picker.** Wisp lists all 21 ids flat, so on a pinned row the user
already chose the tier by choosing the row. Spending `/effort` on it again would silently send `-high` to
someone who picked `-low`. The `-tiered` rows are the only ones with nowhere else to put the depth —
`gemini-3.7-flash-tiered` ships in that form alone yet still answers a tier control.

**The fold is a safety property, not a convenience.** Emitting only the three stops the first-party client
emits makes an unattested level *unreachable by construction*, rather than something we hope the upstream
tolerates. Same shape as the existing `max`→`xhigh` fold for Codex.

**Driven before shipping, not suite-only** ([[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]):
`gemini-3.7-flash-tiered` on one prompt — 407 output tokens with no level (control), **264 at `low`**,
**758 with 376 chars of reasoning at `high`**. Nothing 400s: tiered at all three stops, plus
`gemini-3.6-flash-low`, `claude-sonnet-4-6` and `gpt-oss-120b-medium` all answering 200 unchanged.

## What this closes

- **Do not map effort onto id suffixes.** Rewriting `gemini-3.6-flash-low` → `-high` because the knob says
  high overrides an explicit user choice. The flat picker *is* the tier control for those rows.
- **The Claude-row `thinkingBudget` path is dead, not deferred.** The reference sends Antigravity's Claude
  rows an integer budget with a `< maxOutputTokens` clamp and a drop-below-minimum rule. We have no
  level→budget table and would be inventing three integers; the vendor greys the control out on those rows;
  and they already think by name (`claude-opus-4-6-thinking`). Reconsider only if a `-tiered` Claude row
  ever appears.
- **No panel effort control for Antigravity.** `effortOptionsFor` (`catalog.ts:522`) is never called for
  this Provider and stays that way — it takes a `Provider`, not a model, and effort is meaningful per-model
  here. The tier rides the Bridge path alone. Adding a panel control is a separate feature that would force
  that signature to learn about the selected model.

## Reversibility

**Cheap.** One guard function and one apply stage; deleting the `thinkingLevel` argument at
`bridgeServer.ts:698` restores 2.0.44 behavior exactly, because the apply stage is a no-op without a level.
The npm version cannot be unpublished, but the behavior is a single call-site removal.

## Related

- [[decisions]]
- [[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]
- [[a-bundled-dependency-is-not-a-face-but-every-face-carries-it]]
- [[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
