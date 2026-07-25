---
type: pick-up
project: wisp
updated: 2026-07-25
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-25): 2.0.36 released and pushed; queue empty.** Main is clean at
`0965cab`, tag `v2.0.36`, Release CI green, `wisp-router@2.0.36` on npm.

What landed: Opus 5 support (`c808102`), the wisp-slot 1.4.0 spawn feature (`73e57bd`)
**and its revert** to 1.5.0 (`0965cab`), the `[1m]` tier strip (`c667bc8`), release
commit `589ccb1`.

**Nothing is queued. No task is half-done.** Pick from Open questions in
[[active-work]] or ask the user.

## The one live thread

**Do alias / Provider rows get a 1M budget?** Claude Code budgets a model from its own
table keyed by the id string; the door's `/v1/models` carries no window field (Anthropic's
real one doesn't either), so a `claude-wisp-*` entry gets whatever CC defaults to. The
only lever is the id string. Untested: whether a **trailing `[1m]` on a `claude-wisp-*`
id** moves that budget the way it does on a native id.

Cheap test: add an alias, pick it in `/model`, read `/context`. Safe to try now — since
2.0.36 the tier is stripped before the wire, so a suffixed id can no longer 404.

If it works, aliases could carry the tier and inherit the 1M budget wisp already puts on
the wire. If it doesn't, write it down and stop — there is no other lever.

## Landmines

- **The running Bridge may still be 2.0.35.** Ask before debugging any effort/tier
  behavior: 2.0.35 drops `output_config.effort` on every opus-5 turn and does not strip
  `[1m]`. `npm i -g wisp-router@2.0.36` + restart fixes both.
- **`Context limit reached` in a bridged session is usually NOT wisp.** Claude Code
  2.1.220 blocks locally against inflated accounting; prove it from CC's transcript
  before touching bridge code — see
  [[claude-code-can-refuse-a-turn-before-the-bridge-ever-sees-it]].
- **Don't re-derive the slot 1M spawn.** The Agent tool's `model` is a family-word enum;
  a suffixed id fails validation. Killed in 1.5.0, tombstoned in the skill's
  rationalization table.
- **The beta token list is still the 2.1.216 capture** — only the advertised UA version
  moved (2.1.219). Re-capture before assuming 2.1.220 parity.
- **`.context/` commits go to main, never a ticket branch** — otherwise a session booting
  on main reads a stale baton.

## Re-seeding the relay chain

`ready-for-agent` is empty; open backlog is **#69** — copilot-wisp launcher for the
Copilot CLI (`enhancement`, needs grooming before it's agent-grabbable). When new work
exists: label tickets `ready-for-agent`, then re-seed with the exact command below (state
file `.claude/relay/ticket-loop.md` has `stop: true`; re-running the command re-inits it):

```
/relay N=1 /preset ticket-loop -> after the ticket's gate (tests green + landed, or ready-for-human relabel), run /preset wrap-up gateless: eyeball gate auto-go (unattended), /context-update, rewrite .context/pick-up.md to the next unblocked ready-for-agent ticket or 'queue empty', commit .context on main — never the ticket branch. At leg boot also read .context/pick-up.md.
```

Relay landmines (unchanged): leg boot reads `overview.md` + `active-work.md`, NOT this
file — hence the trailing "at leg boot also read .context/pick-up.md"; `/preset wrap-up`'s
step 1 is a human eyeball gate an unattended leg must treat as auto-go; relay spawns with
`binary: claude` (native, NOT `claude-wisp`) — wisp legs die at boot when no Bridge runs
at 127.0.0.1:41184, so keep the state file's `binary:` as-is; the body uses 'queue empty'
in single quotes (double quotes shred the cmd spawn quoting).

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-25-1m-tier-is-a-harness-label-not-a-wire-model]]
- [[claude-code-can-refuse-a-turn-before-the-bridge-ever-sees-it]]
