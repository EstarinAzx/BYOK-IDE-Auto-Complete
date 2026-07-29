---
type: gotcha
project: wisp
updated: 2026-07-29
tags: [context, gotcha, antigravity, schema, tools, history]
---

# The schema cleaner is safe because of its WALKER, not only its scope

**The trap.** A JSON-schema cleaner rewrites keys **by name** — `title`, `format`, `default`, `const`,
`deprecated`, `additionalProperties`, `examples`. Every one of those is also an ordinary **data** key inside
`functionCall.args` replayed from conversation history. Point such a cleaner at a whole request document and
it silently mutates that history: tools lose required argument fields, and the model then imitates the
corrupted examples on later turns. Nothing throws. The reference (CLIProxyAPI) shipped exactly this bug to
production, and its fix was to scope the cleaner to schema paths only.

**What is different here (#187).** `packages/core/src/antigravity.ts` has **two independent protections**
where the reference had one:

1. **Path scoping** — `sanitizeAntigravityRequestSchemas` visits only declaration schema keys and the
   `generationConfig` schema keys, never `request.contents`.
2. **A schema-aware walker** — `mapSchema` descends only *schema positions*: `properties.*`, `items`,
   `anyOf` / `oneOf` / `allOf`. It cannot reach `request.contents` **even if handed a whole document**.

Protection 2 is the stronger one, and it is what makes the property named `title` survive while the `title`
*keyword* beside it is removed: the keys of a `properties` object are property NAMES, so they are recursed
into as schemas and never treated as keywords.

**Why this matters for the test.** Measured by control on 2026-07-29:

| Mutation | History test |
|---|---|
| Whole-document scope, schema-aware walker | **passes** — walker never reaches `contents` |
| Path scoping, generic deep walker | passes — scope never reaches `contents` |
| Whole-document scope **+** generic deep walker | **FAILS both arms** — the reference's production bug |

So the history test does **not** bite on a scope regression alone. It bites on the combination. The change
that re-arms the production bug is therefore **"simplify `mapSchema` to a generic deep walk"** — which looks
like harmless cleanup and is the one edit no test will catch on its own. A ⚠ comment sits at `mapSchema`
saying so; keep it there.

**The rule.** Do not replace the schema-position walker with a generic one, and do not widen the sanitizer's
scope. Either alone is survivable; together they corrupt tool history several turns later, invisibly.

## Related

- [[gotchas]]
- [[2026-07-29-antigravity-narrow-port-never-mint-opaque-tool-ids]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[active-work]]
