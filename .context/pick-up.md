---
type: pick-up
project: wisp
updated: 2026-09-07
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Wisp 2.1.2 + VS Code 1.13.6 are shipped, verified, and installed.** Release source `f4bd855`, tag `v2.1.2`; workflow `34035909343` passed all five jobs. Codex preserves valid conversation IDs and late-note order; independent or unidentified callers remain isolated. See [[2026-09-07-codex-cache-identity-and-ordered-notes]].

## Next task

None queued at the cut. Re-query `gh issue list --label ready-for-agent --state open`. If empty, get the user's next task; [[release-follow-ups]] preserves held candidates and all carried landmines. The TUI-hosted Bridge log gap remains a candidate, not an active ticket.

## Before using the new release

- Reload VS Code / reopen old Wisp hosts. No Bridge was listening on 41184 at the final check.
- The saved Wisp Codex bearer returned 401 during probes; the same-account native token worked. Auth files were unchanged. Investigate normal sign-in if this persists.
- Keep unrelated `.context/flows.md` and `.context/Untitled.canvas` edits out of automatic commits.
- Before cutting another ticket branch, verify `git rev-list --left-right --count origin/main...main` is `0 0`.

## Related

- [[active-work]]
- [[overview]]
- [[release-follow-ups]]
