---
type: gotcha
project: wisp
date: 2026-07-30
tags: [context, gotcha, relay, loop, tooling]
---

# Relay legs on this repo must spawn native claude, and the loop body needs single quotes

Two settings in `.claude/relay/ticket-loop.md` look like defaults and are not. Both were learned by a chain that broke.

**`binary: claude` is deliberate — do not "fix" it to `claude-wisp`.** Two independent reasons, either sufficient:

- A `claude-wisp` leg **dies at boot** when no Bridge is listening on `127.0.0.1:41184`. An unattended chain cannot assume one is up.
- This repo's tickets **edit Bridge code**. A leg routed *through* the thing it is changing can break its own transport mid-leg, and the failure looks like the ticket's bug.

The relay skill's auto-detection actively works against this: it picks `claude-wisp` when the current process or environment smells of wisp — which, in this repo, it always does. The explicit `binary:` field in the state file wins over detection, so it must stay set.

**The body's `'queue empty'` is in single quotes on purpose.** Double quotes shred the cmd spawn quoting when the leg is launched, and the failure is a mangled prompt rather than a clean error.

**A third, related trap: `stop: true` means the next invocation RE-INITIALIZES, it does not resume.** The relay skill reads `## Handoff` + `## Breadcrumbs` only on resume (`stop: false`); a stopped chain takes the init path and *"write[s] a fresh state file"*. A `Gotchas` heading marked "preserved across re-seeds" is a note the previous leg wrote to itself, **not a mechanism** — anything that must survive belongs here in `.context/gotchas/`, not in the relay file.

And init is triggered more easily than it looks: the skill matches an existing chain on the **`body:` field exactly**. A stored body carrying extra instructions will not match a shorter `/relay N=2 /preset ticket-loop`, so the short command silently starts a fresh file over the old one. Keep `body:` to what you will actually type — for this repo that is plain `/preset ticket-loop`, because every augmentation people are tempted to add (read the baton at boot, gateless wrap-up, commit `.context/` on the default branch) is **already in the preset's own steps 1 and 8**.

## Related

- [[gotchas]]
- [[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]
- [[harvest-tickets-carry-body-text-blockers-not-native-links]]
