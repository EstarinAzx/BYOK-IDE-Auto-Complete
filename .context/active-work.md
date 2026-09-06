---
type: active-work
project: wisp
updated: 2026-09-07
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-09-07 by GPT-6 Astra / Codex (auto)_
_At release commit: `f4bd855`, tag `v2.1.2`_

## Current focus

**Wisp 2.1.2 and VS Code extension 1.13.6 are released, verified, and installed.** Codex caching now preserves conversation identity and the position of late system notes. No implementation work remains in flight.

## State

- **Done:** release merged and pushed to main, annotated v2.1.2 tag published, all five [release jobs](https://github.com/EstarinAzx/Wisp-Router/actions/runs/34035909343) passed. [Release](https://github.com/EstarinAzx/Wisp-Router/releases/tag/v2.1.2) contains all four platform binaries and the 1.13.6 VSIX; npm serves 2.1.2.
- **Verified:** 1,066 core tests and 30 terminal tests, typechecks/builds, independent review, and a small live comparison through the actual Bridge. Both downloaded Windows artifacts matched GitHub SHA-256 digests. New binary/VSIX contain the fixes; the previous Windows release is the negative control.
- **Installed:** global npm package is 2.1.2; its release-download fallback at `~/.wisp/bin/v2.1.2/wisp.exe` boots successfully with `wisp routing --json`. VS Code reports `esarinazx.wisp@1.13.6`. Existing Wisp hosts need reopening; reload VS Code to activate its new extension host.
- **Runtime:** no listener on port 41184 at the final check. No Bridge was started or user window reloaded. Saved routes, auth, model/provider, permissions, and notification settings were preserved.
- **Remaining:** no ready-for-agent issue was open at the cut. Unrelated `.context/flows.md` edits and `.context/Untitled.canvas` remain outside these commits. The Traycer-managed fix worktree is retained with gitignored build/probe outputs.

## Pick up here

No active work ? pick a new task. Re-query `gh issue list --label ready-for-agent --state open`; if empty, ask the user which held item to scope. The TUI-hosted Bridge log gap remains the strongest held candidate, but is not authorized merely by this note. See [[release-follow-ups]].

## Open questions

The saved Wisp Codex bearer returned 401 during investigation; the native Codex bearer for the same account worked. Neither was changed. If the next bridged turn still fails, investigate/sign in normally rather than blindly rotating or copying refresh tokens.

## Recent context

- Keep the per-request fallback when conversation identity is missing/invalid. A global ID would group unrelated clients. xAI still uses its existing system-message folding.
- Cache hits vary: the first fixed late-note probe missed once; the follow-up preserved 3,200 tokens through repeats and late notes. Do not promise a fixed percentage of weekly savings.
- The native vs bridged usage comparison had unequal workloads and effort. The current native conversation was high; some bridged work was xhigh. Published fixes address demonstrated mechanisms, not a proven historical cost multiplier.
- The health preset found zero skill-install findings and passed the Codex adapter check. Template drift (9 findings) and stale-only vault notices (4 ecosystem, 38 BCDE311, 21 BCDE321) were recorded; no structural vault errors. Traycer vault lint passed. No template mirroring or unrelated cleanup was performed.

## Related

- [[overview]]
- [[decisions]]
- [[pick-up]]
- [[release-follow-ups]]
- [[2026-09-07-codex-cache-identity-and-ordered-notes]]
- [[2026-09-06-codex-discovery-is-account-metadata-ultra-is-orchestration]]
