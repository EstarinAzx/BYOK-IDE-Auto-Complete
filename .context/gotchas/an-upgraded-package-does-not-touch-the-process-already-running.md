---
type: gotcha
project: wisp
updated: 2026-09-02
tags: [context, gotchas, release]
---

# An upgraded package does not touch the process already running

`npm i -g wisp-router@<new>` succeeds, `npm ls -g` reports the new version, the shipped binary greps
clean against the old one as a control — and the Bridge the user is actually talking to is **still the
old build**. A running `wisp` process holds its executable image in memory; on Windows the file can be
deleted out from under it and the process carries on serving indefinitely. Verified 2026-09-02: after
upgrading to 2.0.46 the old platform binary at
`node_modules/@tsd47216/wisp-router-win32-x64/bin/wisp.exe` was **gone** (npm pruned it during the
upgrade) while two `wisp` PIDs were still live and still serving 2.0.45 behavior.

So "released + installed + verified" is **not** "the fix is live", and every artifact-level check
passes while the user still sees the bug. The install verification and the runtime state are two
different claims — say which one you established
([[a-marker-grep-proves-nothing-without-a-marker-present-in-both]] makes the same distinction about
containing a code path versus driving the wire).

The restart is also **not** an agent's call to make unprompted: a Claude Code session bridged through
Wisp is talking to that very process, so killing it cuts the connection the session is running on.
Report the PIDs and let the user choose the moment. The editor face is separate — the extension hosts
its own Bridge, so a VS Code window reload picks up a new vsix without touching the terminal one.

Second-order tell, useful when diagnosing: after an upgrade the shim may resolve differently than
before. 2.0.46's platform npm package 404'd (npm's spam filter — normal, `release.yml` treats platform
packages as best-effort) and the shim fell back to the GitHub release binary under
`~/.wisp/bin/v<version>/`, while 2.0.45's platform package had resolved from npm. Both are working
paths; do not read one release resolving cleanly as the 404s being fixed.

## Related

- [[gotchas]] — index
- [[2026-09-02-the-advertised-claude-cli-version-is-a-per-model-floor]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]
