---
type: gotcha
project: wisp
date: 2026-08-05
tags: [context, gotcha, statusline, routing, bridge]
---

# A picked alias reaches the statusline prefixed `claude-wisp-`, never bare

**The trap:** an Alias in the Routing map is named `keemee`, and `wisp routing` prints `keemee`, so every consumer is written to match `keemee`. But nothing a user *picks* ever says `keemee`. Claude Code's `/model` list **is** the Bridge's Anthropic door, and that door prefixes every row `claude-wisp-<id>` so the picker will list it at all (`bridgeAnthropic.ts:676`, slice #44). The selection is then stored verbatim — `~/.claude/settings.json` reads `"model": "claude-wisp-keemee"` — and that is the string every downstream reader receives.

**Why:** the door strips its own prefix on the way in (`bridgeAnthropic.ts:250`, `body.model.replace(/^claude-wisp-/, '')`) **before** `resolveRoute` ever sees it, so routing itself is correct and every request lands on the right Provider. The normalization is one line inside the request parser, invisible to anyone reading `routing.ts`. Any *other* consumer — anything reading the model name from Claude Code rather than from the door — starts one step upstream of that strip and gets the raw prefixed id.

That is exactly how the statusline broke on 2026-08-05: it matched aliases with an equality test against `stdin.model.id`, `claude-wisp-keemee !== keemee`, and the exact-alias rung could only ever fire for a hand-set `ANTHROPIC_MODEL`. Every alias chosen the normal way rendered a bare `wisp` row. Fixed `2705bac` (`wisp-slot` 1.7.3).

**Two more shapes ride on the same id.** Claude Code appends its own **`[1m]` tier suffix** to model ids it offers a 1M-context variant for (`additionalModelOptionsCache` in `~/.claude.json` literally holds `claude-fable-5[1m]`) — so a normalizer must strip a trailing bracket group too. And `display_name` is **not** a fallback source for the name: the picker's alias rows read `keemee — kimi-k3` when `aliasPickerShowsModel` is on, so an equality test never matches there either.

**The family fuzzy hid this for a month.** It is a *substring* test (`includes('opus')`), so it shrugs off both the prefix and the suffix and kept working the whole time. Only the exact-match rungs — alias, and provider-id — are sensitive. A bug that only bites aliases looks like "aliases are broken" rather than "the id is not what you think".

**Rule:** any consumer that reads a model name from **Claude Code** rather than from the Bridge door must normalize before matching — strip a leading `claude-wisp-`, then a trailing bracket group (the tier suffix); see the `clean()` helper in `wisp-statusline.js` for the exact pair of replaces. Its fixtures must use the **prefixed** form, because that is the only form a picked route ever takes.

## Related

- [[gotchas]]
- [[the-statusline-duplicates-resolveroute-and-drifts]]
- [[2026-08-05-a-duplicated-resolver-is-fixtured-with-what-its-caller-sends-not-what-its-source-names]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[kimi-in-a-model-string-names-the-kimi-code-oauth-row-not-opencode-go]]
