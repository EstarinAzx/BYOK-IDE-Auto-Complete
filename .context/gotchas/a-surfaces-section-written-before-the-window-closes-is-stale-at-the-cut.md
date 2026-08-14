---
type: gotcha
project: wisp
date: 2026-08-14
tags: [context, gotcha, release, changelog]
---

# A Surfaces section written before the window closes is stale at the cut

[[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]] says derive
Surfaces from `git log <last-tag>..main -- <face-path>` rather than copying the ticket's claim. True, and
not sufficient — **it also matters *when* you derive it.**

2.0.43's entry was written when #202 was the only ticket in the release window, and its Surfaces were
correct that day. By the cut, #203 and #204 had also landed, and the section still said:

- *"`packages/tui` had no commits since `v2.0.42`; this is the first"* — fine, still true
- *"the three statusline commits … went out as **1.7.1–1.7.3**"* — **wrong**, #203 shipped **1.7.4**
- it named `2705bac` as a commit on main, which it no longer is — the #202 squash swept it
  ([[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]])

Nothing was broken by this; the npm face genuinely had exactly one commit. But the entry that ships with
the release would have described a different repo than the one being released.

**The rule: re-derive Surfaces at the cut, per face, as part of the bump commit.** The four commands are
cheap and they are the whole check:

```
git log --oneline <last-tag>..main -- packages/tui       # npm wisp-router
git log --oneline <last-tag>..main -- packages/core      # vsix (it bundles core)
git log --oneline <last-tag>..main -- packages/vscode    # vsix
git log --oneline <last-tag>..main -- plugins/slot       # wisp-slot, marketplace door
```

A face with **zero** commits is a real answer worth writing down — it is what justifies *not* bumping the
vsix. And expect the swept squash to show up in a face it does not belong to: `3465c7c` appears under
`plugins/slot` only because it absorbed earlier statusline commits, so name what a commit *carries*, not
just where it touched.

## Related

- [[gotchas]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
- [[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
