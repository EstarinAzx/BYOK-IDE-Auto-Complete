---
type: decision
project: wisp
updated: 2026-07-25
tags: [context, decision]
---

# `[1m]` is a harness-local label, not a wire model id — SHIPPED 2.0.36

**Decision.** A trailing `[1m]` on a Claude model id is a **Claude Code-local label**
that sets *its* context budget and compaction point. It is not a model the backend
knows. Two consequences, both landed:

1. **`stripModelTier` (`anthropic.ts`) drops a trailing `[1m]` at exactly ONE seam** —
   the `model` field `buildAnthropicMessagesBody` emits. Routing, logs, caps and the
   effort gate all keep reading the id **as typed**. Deliberately NOT wired into beta
   selection: the window is `context-1m-2025-08-07`'s job (an exclusion gate, see
   [[2026-07-21-beta-selection-model-gated-exclusion]]), and a label must never
   override what the exclusion table says a model really supports.
2. **wisp-slot's 1M spawn id is impossible — 1.4.0 reverted in 1.5.0.** Step 5a told
   the Slot to spawn subagents as `claude-<slot family>-5[1m]` so they would budget
   against 1M. The Agent tool's `model` parameter is an enum of family words
   (`sonnet`/`opus`/`haiku`/`fable`); a full or suffixed id fails schema validation
   before spawn. A Slot spawn *must* pass a family word — that word is how wisp picks
   the route — so a Slot subagent's context budget is not reachable from that
   parameter at all. One rationalization row survives in the skill as the tombstone.

**How to get the 1M budget** (the thing users actually want): pick a `[1m]` id at the
**session** level — `/model claude-opus-5[1m]`, or `"model"` in `.claude/settings.json`.
That surface takes full ids. Under wisp it still routes through the family row (family
match is a substring test over any `claude-*` id) and the Target pin replaces the model,
so the suffix dies at the map even before the strip.

## Why

Live probe, 2026-07-25, wisp's own headers against the OAuth Messages backend:

```
model=claude-opus-5[1m]  -> 404 {"type":"not_found_error","message":"model: claude-opus-5[1m]"}
model=claude-opus-5      -> 200
```

A family route always hid this — the Target pin replaces the inbound model. What did
not survive was a Target pinned **with** the suffix (a Slot rebind, `wisp routing set
opus anthropic/claude-opus-5[1m]`): that id rode verbatim to the backend, 404'd, and
surfaced to the user as a 502. Post-strip the same typed id round-trips: typed
`claude-opus-5[1m]` → wire `claude-opus-5` → HTTP 200.

The same probe closed a standing landmine: **opus-5's effort support is no longer
UNPROBED** — `adaptive` + `output_config.effort=xhigh` returned 200 with a thinking
block leading the reply.

Worth stating plainly because it keeps getting re-derived: **a bridged session has been
1M on the wire the whole time**, with or without a suffix anywhere, because wisp sends
`context-1m` on every non-Haiku Claude request. The 200k Claude Code displays for a
plain `opus` pick is its own local budget — wisp neither sets it nor sees it, and the
door's `/v1/models` (`id`/`display_name`/`created_at`) has no window field to carry it.

## Aliases CAN carry the tier — the budget is a bare regex (resolved 2026-07-25)

The follow-up question ("do alias / Provider rows get 1M?") is **yes**, and it needs no
wisp change. Claude Code's effective-window function, read out of the 2.1.220 binary:

```js
function Wb(e){ if(NVe()) return !1; return /\[1m\]/i.test(e) }   // NVe = CLAUDE_CODE_DISABLE_1M_CONTEXT
function lZc(e,t){
  if(Wb(e)) return 1e6;                            // ← FIRST branch, pure string test, no registry lookup
  if(t?.includes(T_e.header) && t8(e)) return 1e6;
  if(LM(e)) return 1e6;                            // native_1m + a first-party/known-provider check
  let r=_ro(e); if(r!==null) return r; …
}
```

So **any** model id containing `[1m]` budgets 1M — including a gateway id like
`claude-wisp-<alias>[1m]`. Verified on the wisp side: `withAlias` applies no charset
validation (only non-empty and not a Provider id), an alias named `probe[1m]` persists,
and the door advertises it as `claude-wisp-probe[1m]`.

Two limits, both cosmetic or operational:

- The **display** function is stricter — `Uoe` appends " (1M context)" only when the id
  resolves to a registry record with `context.supports_1m_suffix`. A `claude-wisp-*[1m]`
  entry therefore gets the 1M budget without the pretty label.
- **Only pin such an alias at an anthropic non-Haiku Target.** Claiming 1M against
  codex's 400K window converts a compaction into the 502 that
  [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]]
  already documents.

This also explains the plain-`opus` 200k that started the investigation: `claude-opus-5`'s
registry record says `context:{window:1e6, native_1m:!0, supports_1m_beta:!0,
supports_1m_suffix:!0}`, but `LM()` additionally requires `ny(e)` to be first-party or a
known provider kind — which a custom `ANTHROPIC_BASE_URL` does not satisfy. Native 1M is
therefore unreachable through the Bridge by construction. **The suffix is the only lever,
and it is a string match** — which is precisely why `stripModelTier` had to exist.

## Reversibility

High. `stripModelTier` is one pure line at one call site; deleting it restores the
verbatim pass-through exactly. The slot revert is a doc change — 1.4.0's text is in git
(`73e57bd`) if the Agent tool ever gains free-form model ids.

## Related

- [[decisions]]
- [[active-work]]
- [[2026-07-21-beta-selection-model-gated-exclusion]] — why the 1M window rides an exclusion gate, not the model name
- [[claude-code-can-refuse-a-turn-before-the-bridge-ever-sees-it]] — the sibling trap this investigation started from
