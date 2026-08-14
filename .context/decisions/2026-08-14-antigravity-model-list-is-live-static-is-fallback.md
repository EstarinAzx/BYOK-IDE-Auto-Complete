---
type: decision
project: wisp
date: 2026-08-14
tags: [context, decision, antigravity, models, catalog]
---

# The Antigravity model list is fetched live; the static table is the fallback

## Decision

**Signed-in pickers read the upstream's own `POST /v1internal:fetchAvailableModels` answer
(`fetchAntigravityModels`); the hardcoded `ANTIGRAVITY_MODEL_SPECS` table stays only as the
signed-out/offline/error fallback and as the source of per-model output caps.** Shipped `88e8a39`,
released as `wisp-router@2.0.44` + vsix 1.12.0. Editor-internal rows in the payload are dropped on
SHAPE — `tab_*` (tab-completion models) and `chat_<digits>` (numbered experiments) — never by a pinned
id list. Nothing else is curated out.

## Why

**A snapshot list rots at exactly the moment it matters.** The user noticed a newly released Antigravity
model missing from the picker; the lineup had been frozen at #189 implementation time while the catalog
row's own comment claimed it came "from the live fetchAvailableModels route" — the comment described the
snapshot's *source*, not the runtime. The upstream roster demonstrably moves (first live drive: 21 rows
vs the table's 13, including `gemini-3.7-flash-tiered`), and every addition would otherwise cost a Wisp
release across two faces (npm + the vsix, which bundles its own `@wisp/core`).

**Shape-filtering over a pinned skip list, for the same reason the usage payload's buckets are parsed on
shape** ([[the-usage-payload-names-most-of-its-buckets-in-unstable-codenames]]): the reference
(CLIProxyAPI) pins six internal ids and its list is already stale (2.5-era rows). Internal rows here have
a recognizable shape; pinning names would rot the way the model table did.

**Deliberately NOT re-curated and NOT plumbing live caps.** The live list keeps rows known to 400
(`gemini-3.1-pro-high`, #186) and the 2.5-era rows the reference hides — the #186 stance holds: listed
means "offered in the picker", never "known servable", and the correction path is picking another model.
Output caps stay in the static table; a live-listed id outside it goes unclamped rather than refused
(the payload's `maxOutputTokens` exists but plumbing it through the sync clamp path wasn't worth the
seam change — revisit only if an unclamped new model actually 400s on oversized `maxOutputTokens`).

**Fallback swallows, never throws.** A live failure falls back to the curated table silently in both
faces — the static list is a real answer (it's what every version through 2.0.43 shipped), and a picker
that goes empty or errors trades a usable dropdown for a diagnosis nobody asked for. The vscode fetch is
raced at the models.dev 4s ceiling so panel open can't stall.

## Reversibility

One-way door on the wire (nothing new stored, no schema change) — reverting is deleting the three
branch points (tui `fetchModelList`, vscode `antigravityModelIds`, core client) and the picker is back
on the table. The shape filter is two predicates in `parseAntigravityModels`.

## Related

- [[decisions]]
- [[active-work]]
- [[the-usage-payload-names-most-of-its-buckets-in-unstable-codenames]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
