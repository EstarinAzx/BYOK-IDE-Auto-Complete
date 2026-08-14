---
type: gotcha
project: wisp
date: 2026-08-14
tags: [context, gotcha, release, changelog]
---

# A bundled dependency is not a face, but every face carries it

[[a-surfaces-section-written-before-the-window-closes-is-stale-at-the-cut]] says derive Surfaces per face
at the cut. Correct — and the 2.0.45 cut found the case where the derivation's **literal answer is
misleading**.

The window `v2.0.44..main` held one commit, and it touched `packages/core` **only**:

```
=== packages/core ===   d96b73a feat(antigravity): tiered rows honor Claude Code's /effort
=== packages/tui ===    (nothing)
=== packages/vscode === (nothing)
=== plugins/slot ===    (nothing)
```

Read as "a face with zero commits justifies not bumping it", that says **bump nothing** — and ship a
feature nobody can install.

**`packages/core` is not a published face. It is a bundled dependency of two faces that were themselves
untouched.** `packages/tui/package.json` takes `"@wisp/core": "workspace:*"`, and the extension bundles
its own copy (which is the whole reason vsix bumps exist —
[[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]). So a core-only window bumps **both**.

The trap is that this looks exactly like the *legitimate* zero-commit case the prior gotcha teaches you to
trust. The discriminator is not the commit count, it is **what kind of directory the commit landed in**:

- `packages/tui`, `packages/vscode`, `plugins/slot` — **faces**. Zero commits is a real answer.
- `packages/core` — **bundled**. Commits here propagate to every face that bundles it; zero commits here
  means nothing either way.

So the derivation is two questions, not one: *which paths changed*, then *which faces carry those paths*.
Only the second answers the bump. 2.0.44 happened to touch all three directly and never exposed this.

## Related

- [[gotchas]]
- [[a-surfaces-section-written-before-the-window-closes-is-stale-at-the-cut]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[2026-08-14-antigravity-effort-reaches-only-the-tiered-rows]]
