---
type: gotcha
project: wisp
date: 2026-09-04
tags: [context, gotcha, anthropic, cache, fable, cost, bridge]
---

# The Fable cache re-bill is the backend, not Wisp

The #162 "prior write not read back" PARTIAL lines seen on the 2.0.47 Bridge — ~5-16k tokens of
`cache_creation` per Fable turn that the next turn does not read back — are **`claude-fable-5-1` backend
behaviour, not a Wisp request-shaping bug.** Wisp forwards faithfully; there is nothing in the door to fix
that would make the backend read its own writes back.

**The proof is a same-session model control.** In one heavy tool-use bridged session (`9157be5a`, 89 real
turns, `effort=xhigh`), the Fable turns stall on ~30% of turns (short by 4-16k tokens each — the classic
`read(n+1) < read(n)+creation(n)` gap), while the **Opus 5 turns in the exact same session** — same tool
churn, same big tool results, same Wisp path — grow **exactly** (`read(n+1) = read(n)+creation(n)`, zero
stalls across 40 consecutive turns). Same everything but the model.

Three independent facts pin it to the backend:

- **Claude Code's native request shape is identical Fable vs Opus.** Drove `claude` straight at a recorder
  backend (bypassing Wisp) on both models: byte-for-byte the same skeleton — trailing volatile reminder as
  a `role:"system"` turn marked `cache_control`, demoted to a bare string next turn; a per-message
  `output_config.effort` system turn; `context_management: clear_thinking_20251015 keep:all` (a no-op,
  and Wisp drops it anyway). Nothing Fable-specific in what the client sends.
- **Wisp rebuilds Fable thinking blocks byte-identically.** A pure `parse → build` round-trip
  (`out/probe/roundtrip.mjs`, gitignored) confirms: signatures preserved, no `cache_control` leaked onto a
  thinking block, conversation key stable turn-over-turn. The #363 thinking-passthrough replay is clean.
- **The shortfall tracks thinking-signature volume, but is NOT bounded by one turn's output.** Fable emits
  many interleaved-thinking blocks per turn (~972-char signature each, 10-17k sig chars/turn); Opus emits
  far fewer (0.5-5k). The re-write is bigger than the last turn's output, though — turn 22 was 16.4k short
  against 4.6k output tokens, turn 47 was 9.1k short against 2.8k — so the backend is re-writing a larger
  slice than just the newest thinking block. Opus 5 reads it all back regardless. That is why the log's
  classifier (2.1.0) is a **model-family gate, not a per-turn size bound**: no bound would be honest.

**Consequence for the log.** The `#162` line's wording — `prior write not read back: real history re-bill`
— implies a Wisp cache-placement regression to chase (the #111/#139 shape). On Fable it is neither
Wisp's fault nor fixable in Wisp. The honest fix is **reclassification, not elimination**: when a stall
lands on a Fable/Mythos-family model, name it the known Fable backend re-bill (same spirit as the #156
STALE and #145 benign carve-outs) rather than firing the generic re-bill alarm. **Shipped in 2.1.0** as
`isFableFamilyModel` gating the `#162` wording in `bridgeServer.ts` — a model-family gate, not a size bound
(see above: the shortfall routinely exceeds one turn's whole output). Log-only; the numbers still print, so a
genuine regression on Fable would still be visible in the arithmetic, just not mislabelled.

**Scoping the user already had right:** they only ever saw this on Fable. Confirmed — Opus 5 on the
identical wire and session does not stall. The user cannot tune it away through Wisp; only lower effort
(fewer thinking blocks) or Claude Code's own thinking-clear would shrink it, and both are client-side calls.

The capture + miner tooling is throwaway under gitignored `out/probe/` (`record.mjs` recorder,
`cache-growth.mjs` / `localize.mjs` transcript miners, `shape.mjs` request differ, `roundtrip.mjs` the
parse/build proof) — re-create rather than look for it; deleted after use per the probe discipline.

## Related

- [[gotchas]]
- [[2026-09-03-the-volatile-tail-must-sit-behind-every-message-breakpoint]]
- [[a-tool-schema-the-wire-rejects-fails-every-turn-not-one-tool]]
- [[active-work]]
- [[pick-up]]
