---
type: active-work
project: wisp
updated: 2026-08-14
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-08-14 by Opus 5 (direct user question → trace → feature + release cut)_
_At commit: `bd21076` on main, tag `v2.0.45`. Released: **`wisp-router@2.0.45`** (npm `latest`), **vsix 1.13.0 version-bumped but NOT built**, `wisp-slot` 1.7.4 unchanged._

## Current focus

**2.0.45 is SHIPPED and verified. Nothing is in flight.**

Started as a question about bridge-log cache-miss lines (answer: the `STALE` lines are the Bridge
correctly overriding a server verdict its own bill contradicts — not misses, no action). That turned into
"do codex/xai/antigravity use Claude Code's effort levels?" → a `/trace` (persisted to [[flows]]) → the
answer that three of four arms did and Antigravity did not → the feature.

**Claude Code's `/effort` now reaches Antigravity's `-tiered` rows**
([[2026-08-14-antigravity-effort-reaches-only-the-tiered-rows]]). Shipped `d96b73a` (feat) + `bd21076`
(release), straight on main, user-authorized cut.

- **`shared.ts`** — `standardEffortToAntigravity`: `low|medium|high` pass, `xhigh`/`max` fold to `high`.
  The fold makes an unattested level unreachable rather than merely tolerated.
- **`antigravity.ts`** — `antigravityAcceptsThinkingLevel` (a **suffix shape test** on `-tiered`) +
  `applyAntigravityThinkingLevel`, which runs **last** in `buildAntigravityRequestBody` so the forks and
  both schema cleaners see exactly what they saw in 2.0.44.
- **`antigravityClient.ts` / `bridgeServer.ts:698`** — `thinkingLevel` threaded; the stale "no effort"
  comment at `:691` is gone.

**Why only `-tiered`:** the 21 live ids collapse into the vendor picker's 7 rows —
`gemini-3.6-flash-low|-medium|-high` is one line plus a three-stop slider. The user checked the vendor CLI
and confirmed **that slider greys out on `gpt-oss-120b-medium` and both Claude rows**. Wisp lists all 21
flat, so on a pinned row choosing the row already chose the tier.

## Queue: empty

`gh issue list --label ready-for-agent --state open` → `[]` at session start. **Verify by query, not by
this note.** No ticket existed for this work — direct user ask, shipped straight on main.

Open but not agent-ready: **#207** (active quota probe — still the same three scoping calls), **#69**,
**#163**.

## Release: cut and verified

**npm `wisp-router` 2.0.45 is `latest`.** Run `31787916143`, 5/5 green. GitHub release `v2.0.45` carries
all four platform binaries. Platform npm packages resolved from npm this time — the 404-and-fall-back-to-
GitHub path never engaged.

**Verified past the registry read, with a control.** Scratch-installed 2.0.45 and 2.0.44, executed both
bins (banners self-report `v2.0.45` / `v2.0.44`), then grepped the shipped `.exe`:

| marker | 2.0.45 | 2.0.44 |
|---|---|---|
| `thinkingLevel` | 4 | 0 |
| `includeThoughts` | 1 | 0 |
| `-tiered` | 1 | 0 |
| `fetchAvailableModels` | 1 | 1 |

That last row is the **shared control** and is what makes the zeroes mean "absent" rather than "grep
failed" ([[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]).

**Honest gap:** no live turn was driven through the *installed binary* at low vs high — that needs an
Antigravity route in the real `~/.wisp/config.json`, and the session itself was running through that
Bridge. The wire behavior was proven separately from the same commit at source level. Two measurements
joined at the commit, not one end-to-end run.

**vsix 1.13.0 is version-bumped in `package.json` + CHANGELOG but NOT built and NOT installed.** When
built, the discriminating marker is `thinkingLevel` (absent from 1.12.0); pair it with a control string
present in both.

## State

- **In flight:** nothing.
- **Done this session:** diagnosed the bridge `STALE` cache lines as non-issues; `/trace` of the effort
  path across all four arms (persisted to [[flows]]); recon of the reference's Antigravity thinking applier
  + live `wisp models antigravity`; the `-tiered` split; feature + 10 vitest cases; throwaway live probes
  (deleted); full gate; 2.0.45 cut, publish, scratch-install verify with 2.0.44 control.
- **Blocked:** nothing.

## Verification

- Pre-work `git rev-list --left-right --count origin/main...main` → `0 0`
- `bun run test` (core vitest) — **1036/1036 across 22 files** (10 new)
- `bun run --cwd packages/core typecheck` — clean
- `bun run --cwd packages/tui compile` — clean
- `bun run --cwd packages/vscode compile` — clean
- `bun test packages/tui/tests/` — **28/28**
- Live wire, before shipping: `gemini-3.7-flash-tiered` on one prompt — 407 output tokens with no level,
  **264 at `low`**, **758 + 376 chars reasoning at `high`**. No 400 on any row (tiered at all three stops,
  plus `gemini-3.6-flash-low`, `claude-sonnet-4-6`, `gpt-oss-120b-medium` at 200 unchanged)
- `release.yml` run `31787916143` — 5/5 green
- Post-publish: scratch installs of BOTH versions, bins executed, discriminating marker + shared control

## Skills for next session

- `/preset pick-up` — baton at [[pick-up]] is current: queue empty, nothing owed but the vsix build.
- Next move is a decision, not a task: build/install vsix 1.13.0, scope #207's three calls, or #69 / #163.

## Open questions

- **#207's three open calls** — unchanged: poll cadence, poll-vs-header precedence, opt-in.
- **Build + install `packages/vscode/wisp-1.13.0.vsix`** — supersedes the never-installed 1.12.0 (and the
  stale 1.11.0 item). The extension bundles its own `@wisp/core`, so npm cannot deliver 2.0.45's tier to
  the editor face.
- Carried over, unchanged: dismiss the two secret-scanning alerts as won't-fix; rotate `bridgeSecret`;
  #170 needs a Kimi Code subscription; note #189's last criterion when observed; ~20 stale local
  `ticket/*` branches; `.context/Untitled.canvas` untracked, user's file, left alone.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[flows]]
- [[2026-08-14-antigravity-effort-reaches-only-the-tiered-rows]]
- [[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]
- [[a-bundled-dependency-is-not-a-face-but-every-face-carries-it]]
- [[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
