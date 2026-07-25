---
type: pick-up
project: wisp
updated: 2026-07-25
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-25): Opus 5 landed on Anthropic's side; wisp caught up on
branch `claude/opus-5-wisp-models-6iwgcc`. Two commits, NOT yet merged.**

- `c808102` (feat, core) — **Opus 5 support.** The model list needed nothing
  (`anthropicModelsFrom` reads models.dev live and keeps no family whitelist, so
  `claude-opus-5` appeared on its own). The **effort gate** did:
  `modelSupportsAnthropicEffort` listed the Claude 5 family BY NAME (`fable-5` /
  `sonnet-5`), so `claude-opus-5` matched nothing and every turn ran with adaptive
  thinking + `output_config.effort` **silently off** — the panel still offered the
  full low→max ladder, so a `max` pick reached the wire as nothing. `isClaude5` is
  now a regex over the family-local version digits (suffix-tolerant, so
  `claude-opus-5[1m]` matches too; `opus-4-5`/`sonnet-4-5` still read as pre-5,
  guarded by test). Also: opus-5 is the anthropic row's `defaultModel` + leads the
  offline fallback list, the TUI family bind points `opus` at it, and
  `CLAUDE_CODE_VERSION` 2.1.216 → **2.1.219**. 655 core + 15 TUI tests green,
  extension compiles.
- `73e57bd` (feat, plugin) — **Slot step 5a**, wisp-slot 1.3.0 → **1.4.0**. Spawn
  with `claude-<slot family>-N[1m]` instead of the bare family word when the bound
  Target is `anthropic/<non-Haiku>`. No core change — the suffix never leaves the
  harness.

**Next task: release 2.0.36.** Merge the branch, bump
`packages/tui/package.json` to 2.0.36, write the CHANGELOG entry, tag `v2.0.36`.
2.0.36 is exactly these two commits — nothing else landed since 2.0.35 except a
`.context` baton refresh. (Repo convention: feat commits don't touch the
changelog; the release is its own `chore(release)` commit — see 0455091.)

**Then re-pin the `opus` family route.** If it still points at `claude-opus-4-8`,
Claude Code asking for opus-5 silently gets 4.8 — the pin always beats the
requested model (#50 by design, not a bug).

## Two open checks (both cheap, neither blocking)

**1. The wire question — does Anthropic accept a `[1m]`-suffixed model id?** Or
does Claude Code strip it locally and just flip the `context-1m` beta? Both produce
the same "Opus 5 (1M context)" label, so `/model` output does not distinguish them.
Run `claude-wisp`, `/model claude-opus-5[1m]`, send one message, read the serve log:

```
[bridge] route family 'claude-opus-5' -> anthropic model=...
```

The **quoted** name is what Claude Code actually put in the request body.

- Shows `claude-opus-5[1m]` → the harness sends the suffix and Anthropic takes it;
  a `[1m]` Target is safe, and the pickers could offer the variants (today the TUI
  route-model picker is list-only — free text appears only when no list resolves,
  so a `[1m]` pin is reachable via `wisp routing set` alone).
- Shows `claude-opus-5` → the harness strips it, the suffix was never a wire model
  id, and wisp should strip it too before posting: a pure `stripModelTier`
  (`/\[1m\]$/`) in `anthropic.ts`, applied at ONE seam — the `model` field in
  `anthropicClient.ts`'s body build — so routing, logs, caps and effort keep seeing
  the typed id. ~5 lines + 3 tests. Deliberately NOT wired into beta selection: the
  exclusion table says what each model really supports and a suffix must not
  override it.

Low stakes since `73e57bd` — the suffix stays inside the harness either way.

**2. Does the Agent tool accept a `[1m]`-suffixed model id at all?** `/model` takes
`claude-fable-5[1m]`; the bare `fable[1m]` does **not** (suffix binds to full ids,
not family words). The Agent surface is untested. Spawn a slot agent with
`model: "claude-fable-5[1m]"` and confirm the bridge route line still reports
`family` as the match kind. Step 5a already falls back to the bare family word on
rejection, so a failure costs only earlier compaction, never correctness.

## Background either check may need

Wisp already sends `context-1m-2025-08-07` on **every** non-Haiku Claude request —
it is an exclusion gate, not an allowlist
([[2026-07-21-beta-selection-model-gated-exclusion]]) — so the wire is already 1M
with or without a suffix. `[1m]` only ever controlled **the harness's own** context
meter and compaction point. That matters because a family route swaps the model
behind Claude Code's back and it never learns what actually answered: the door's
`/v1/models` carries `id` / `display_name` / `created_at` only, no window field, so
there is nothing wisp could tell it. Same mismatch the codex-502 gotcha documents
from the other direction.

**Undocumented as of this note:** no decision page was written for the opus-5
effort-gate fix or the Slot 1M spawn — `/context-update` did not run this session,
only this baton. Write them if either check changes the design.

## Landmines

- **Opus 5's effort support is UNPROBED.** Every Opus 4.5+ and both shipped Claude
  5 models take adaptive+effort, so the flagship of the same family is the safe
  read — but nobody has live-probed opus-5 the way fable-5/sonnet-5 were on
  2026-07-18. If the wire 400s, `/test` at max effort is the check and the fix is
  one line.
- The beta token list is still the **2.1.216** capture; only the advertised UA
  version moved to 2.1.219. A real 2.1.219 may send a different set — re-capture
  before assuming parity.
- Slot step 5a's id must name the **slot family**, not the Target's family. A
  `fable` slot bound to `anthropic/claude-opus-5` spawns `claude-fable-5[1m]`;
  spawning the Target's own id lands on the **opus** route instead.
- `.context/` commits go to main, never a ticket branch — otherwise a session
  booting on main reads a stale baton. (This note is the exception: it rode the
  feature branch because the branch was merging anyway.)

## Re-seeding the relay chain

`ready-for-agent` is empty; open backlog is **#69** — copilot-wisp launcher for the
Copilot CLI (`enhancement`, needs grooming before it's agent-grabbable). When new
work exists: label tickets `ready-for-agent`, then re-seed with the exact command
below (state file `.claude/relay/ticket-loop.md` has `stop: true`; re-running the
command re-inits it):

```
/relay N=1 /preset ticket-loop -> after the ticket's gate (tests green + landed, or ready-for-human relabel), run /preset wrap-up gateless: eyeball gate auto-go (unattended), /context-update, rewrite .context/pick-up.md to the next unblocked ready-for-agent ticket or 'queue empty', commit .context on main — never the ticket branch. At leg boot also read .context/pick-up.md.
```

Relay landmines (unchanged): leg boot reads `overview.md` + `active-work.md`, NOT
this file — hence the trailing "at leg boot also read .context/pick-up.md";
`/preset wrap-up`'s step 1 is a human eyeball gate an unattended leg must treat as
auto-go; relay spawns with `binary: claude` (native, NOT `claude-wisp`) — wisp legs
die at boot when no Bridge runs at 127.0.0.1:41184, so keep the state file's
`binary:` as-is; the body uses 'queue empty' in single quotes (double quotes shred
the cmd spawn quoting).

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-21-beta-selection-model-gated-exclusion]]
- [[2026-07-21-anthropic-oauth-fingerprint-unvalidated]]
