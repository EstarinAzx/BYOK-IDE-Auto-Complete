---
type: gotcha
project: wisp
date: 2026-08-14
tags: [context, gotcha, git, relay, release]
---

# A ticket branch cut from an unpushed main sweeps those commits into its squash-merge

Local `main` and `origin/main` are not the same thing, and on this repo they drift regularly: `.context/`
commits go to main and **are frequently not pushed** (the ticket-loop's step 8 says "do not push unless the
repo convention says to"), and out-of-band fixes land locally too. So a session can open with a `main` that
is several commits ahead of the remote and looks, from `git log`, exactly like a synced one.

Cut a ticket branch from that `main` and the branch inherits those unpushed commits. GitHub then diffs the
branch against `origin/main`, which does not have them — so **the PR contains them, and a squash-merge
collapses all of them into one commit carrying the ticket's subject.**

Live on 2026-08-14, ticket #202: local `main` was **4 commits ahead and unpushed** (`4315455`, `2705bac`,
`e31c92d`, `9a4b797` — `.context/` docs, the `claude-wisp-` prefix statusline fix, and the `wisp-slot`
plugin version bumps). PR #205 merged as `3465c7c`, an 18-file commit titled
`feat(tui): bridge.log + wisp log reader/follower (#202)`. Five of those files were the ticket.

**Nothing is lost and nothing wrong lands** — the remote ends up with the union, which is why this is a
gotcha and not an incident. What is lost is **history granularity**: `2705bac`'s statusline fix no longer
stands as its own commit on origin, so `git log --oneline -- plugins/slot` no longer tells its story, and
any later `git log <tag>..main -- <path>` **Surfaces derivation reads a feat commit where a fix belonged**.
That last one matters here, because Surfaces is derived per face from exactly that command
([[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]).

**Check before cutting the branch, because after the merge the cheap fix is gone:**

```bash
git rev-list --left-right --count origin/main...main   # right-hand number must be 0
```

Non-zero → push `main` first (or rebase the ticket branch onto `origin/main`), *then* cut. One command,
and it has to happen before the work, not after.

**Do not "fix" it by rewriting published history.** Separating the commits after the fact means a force
push to a public repo's default branch. That is a maintainer's call, never an agent's — record it in the
ticket comment and move on ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]).

**The other half of the trap is the local tree afterwards.** `gh pr merge --squash --delete-branch` deletes
the local branch and tries to update local `main`, which now genuinely **diverges** from origin (local has
the four originals, origin has the squash). It aborts with `fatal: Not possible to fast-forward` and leaves
the working tree looking like the work was **reverted** — the edited files read as their old selves and a
`grep` for the new symbol returns nothing. It is not reverted. Confirm the remote holds everything, then
reconcile:

```bash
git diff --stat origin/main main    # expect: only the ticket's own files, present on origin
git reset --hard origin/main
```

## Related

- [[gotchas]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[relay-legs-on-this-repo-must-spawn-native-claude]]
