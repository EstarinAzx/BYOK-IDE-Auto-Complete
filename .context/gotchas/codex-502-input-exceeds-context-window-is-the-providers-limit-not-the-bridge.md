---
type: gotcha
project: wisp
updated: 2026-07-28
tags: [context, gotchas]
---

# Codex 502 "input exceeds the context window" is the provider's limit, not a bridge bug

`502 provider request failed: Error: Your input exceeds the context window…` on a codex-routed turn is a
**passthrough** — `bridgeServer.ts` catches whatever the provider throws and relays it verbatim
(`sendError(res, 502, ...)`). The bridge forwards the whole conversation **untrimmed**; there is no
fit-to-window step. So the codex backend rejects on *its own* window while opus turns in the same session
sail through. Sticker windows (models.dev; `codexModelCaps` fallback tiers match since 1.9.0,
[[2026-07-28-codex-caps-fallback-tiers-picker-fix-ships-in-the-vsix]]): gpt-5.4+ flagships incl. 5.6
sol/terra/luna = 1.05M context, -codex/-mini = 400K, spark = 128K, o-series = 200K. Claude Code only
auto-compacts near *its* budget, so a conversation can be comfy for opus yet overflow a smaller codex
window. That's the "sometimes": it tracks conversation size + which turns went to codex. **A sub-1M 502
on a 5.4+/5.6 flagship is itself evidence** — either the OAuth path caps tighter than the sticker (see
below) or codex tokenization counts the same conversation bigger; capture the exact error text, it
usually names the enforced limit.

**Two accelerants:** pasted images cost a lot of codex tokens; and the ChatGPT-subscription (OAuth) Codex
path can enforce a *tighter* per-request cap than the 400K API sticker, so you can 502 well before 400K.

**Fix is operational, not code:** `/compact` (or `/clear`) before switching to a codex model; keep images
off codex turns when the convo is already big; or run codex work in a fresh `/slot` subagent (clean
context). Bridge-side pre-trim is a floating plan (see `active-work.md` Open questions) — lossy, needs a
drop policy, build only if the 502s get frequent.

## Related

- [[gotchas]] — index
- [[active-work]] — floating pre-trim plan
