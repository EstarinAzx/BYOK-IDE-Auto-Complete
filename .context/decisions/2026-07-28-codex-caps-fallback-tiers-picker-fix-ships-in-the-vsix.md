---
type: decision
project: wisp
date: 2026-07-28
tags: [context, decision]
---

# Codex caps fallback tiers by family; a picker-surface fix ships in the vsix, not npm

**Decision.** `codexModelCaps` (codex.ts) tiers its offline fallback to mirror
models.dev's openai entries: gpt-5.4+ flagships (incl. the 5.6 sol/terra/luna
trio) = 1.05M context / 128K output, `-codex`/`-mini`/`-nano` variants =
400K/128K, spark = 128K/32K, o-series = 200K/100K (unchanged). Branch order is
load-bearing: o-series first (`o4-mini` contains `-mini`), spark before the
`-codex` test (`gpt-5.3-codex-spark` matches both). Shipped as extension
**wisp 1.9.0** (`690fd3f`, fix `e3ddfa2`); **no wisp-router release cut**.

**Why.**
- The old fallback pinned every gpt-5.x at 400K/32K — captured when the codex
  ids weren't on models.dev. That premise died: `openai` on models.dev now
  carries gpt-5.6-sol/terra/luna, 5.5, 5.4 (1.05M/922K/128K), 5.4-mini +
  5.3-codex (400K), 5.3-codex-spark (128K). The live
  `lookupModelsDevCaps(catalog, 'openai', …)` therefore already wins when the
  catalog is loaded; the fallback only fires offline or for the three ids
  models.dev dropped (gpt-5.2-codex, gpt-5.1-codex-max/-mini → 400K tier).
- **npm skipped because the fix never executes there.** The Bridge doors
  advertise ids/labels only — `bridgeServer.computeModelInfos` omits `caps` by
  design, and neither wire shape (`OAModel`, `AntModel`) has a window field.
  Nothing in wisp-router reads `codexModelCaps`; a 2.0.38 would be an empty
  version. The only consumer is the VS Code picker fallback
  (`chatProvider.ts` caps closure), which rides the `.vsix` — so the release
  is the extension's, and 1.9.0 also carries everything accrued since 1.8.0
  (Opus 5, `[1m]` strip, #161 cooldown, cache-advisory sharpening, the
  truncation stop_reason/marker pair).

**Explicitly not a 502 fix.** The bridge forwards conversations untrimmed
([[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]]);
the 502 is the backend rejecting on the limit *it* enforces. If the flagships
really take ~1M upstream, a sub-1M 502 means the ChatGPT-OAuth Codex path caps
tighter than the API sticker — unproven either way until an exact 502 error
text is captured.

## Related

- [[decisions]] — index
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]]
- [[2026-06-18-read-real-context-vision-live-from-models-dev-the-big-one]]
