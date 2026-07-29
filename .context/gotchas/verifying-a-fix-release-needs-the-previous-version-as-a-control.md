---
type: gotcha
project: wisp
updated: 2026-07-29
tags: [context, gotcha, release, verification, npm]
---

# Verifying a fix release needs the previous version as a control

**The trap.** "Install the new version and check the bug is gone" is not evidence. Most checks you would
naturally write **also pass on the broken version**, so a green result proves the harness ran, not that the
fix shipped. The failure mode is silent and flattering: you confirm a release that carries nothing.

Concretely on #183 (the BOM fix reaching npm). The obvious check is *read* a BOM'd `config.json` and see the
routes. But the read path never threw — pre-fix it returned `{}` and the command **exited 0** with a
plausible empty map. A read check that only asserts "no crash" is green on 2.0.38 *and* 2.0.39. The bug was
in the **write**: both stores are read-merge-write, so the empty parse was merged with the next patch and
written back over the real file.

**The rule.** Run the identical harness against the **previously published** artifact and require it to
**FAIL**. A verification that cannot fail is not a verification.

```bash
# control — must FAIL
npm i wisp-router@2.0.38 --prefix ./c38
bash bom-write-check.sh ./c38/node_modules/.bin/wisp

# subject — must PASS
npm i wisp-router@2.0.39 --prefix ./c39
bash bom-write-check.sh ./c39/node_modules/.bin/wisp
```

The published tarball is the ideal control: no build, no worktree, and it is literally what users have.
Measured on #183 — 2.0.38 lost `provider`, `effort` and the pre-existing `opus` route to one unrelated
`wisp routing set`; 2.0.39 kept all three.

**Design the check around the mutation, not the symptom.** Touch a *different* row than the one you seed
(seed `opus`, then `routing set haiku`), so anything missing afterwards was destroyed by the read-merge-write
rather than legitimately overwritten. Seed unrelated top-level fields (`provider`, `effort`) too — they prove
the blast radius is the whole store, not just the sub-object you were thinking about.

**Related trap: npm 404s a version its own publish job just succeeded on.** Immediately after a green
`publish`, `npm i wisp-router@2.0.39` failed with `notarget No matching version found`, which reads exactly
like a broken release. It is registry propagation lag. Confirm against the job log (`+ wisp-router@2.0.39`)
and `npm view wisp-router dist-tags` before touching anything; a retry seconds later succeeded.

## Related

- [[gotchas]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[active-work]]
