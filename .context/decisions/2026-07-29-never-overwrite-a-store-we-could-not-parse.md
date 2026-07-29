---
type: decision
project: wisp
updated: 2026-07-29
tags: [context, decision, store, data-loss]
---

# Never overwrite a store we could not parse (#182)

**Decision.** See **[ADR-0004](../../docs/adr/0004-never-overwrite-a-store-we-could-not-parse.md)** —
`WispHome.merge` refuses to write when the on-disk store holds non-whitespace content that does not parse
into an object. Reads stay permissive; absent/empty files stay writable.

**Why here too.** The load-bearing detail for future work is that this is **not a new contract**, only a new
trigger for an old one: `writeRaw` has always thrown on ENOSPC/EPERM, so every one of the ~35 `writeConfig` /
`writeAuth` call sites already had to tolerate a throwing write. That is what let the fix land without
touching a single caller — and it is the reason to resist any future "just make it return a result type"
refactor, which would touch all 35.

**Reversibility.** Easy. One predicate (`isUnusableStore`, pure, in `home.ts`) and one guard clause in
`merge`. The rejected friendlier option — back up to `config.json.corrupt` and write fresh — can be layered on
top without undoing this: the refusal is the safety property, a backup would be ergonomics.

## Related

- [[decisions]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[active-work]]
