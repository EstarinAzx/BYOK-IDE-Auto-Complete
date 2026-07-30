---
type: pick-up
project: wisp
updated: 2026-07-30
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Latest (2026-07-30, second pass): `f565e94` on main — `wisp-slot` 1.7.1.** The block was showing the
*wrong* Provider's quota on an aliased route. It re-implements `resolveRoute` in plain JS (it runs
out-of-process and cannot import core) and the copy knew only the family-fuzzy rung, so `sol` resolved to no
Target: route row collapsed to bare `wisp`, the `status.model === target.model` live test could never pass,
and the previous Provider's reading was the only thing left on screen. Fixed by mirroring the real order
(**alias exact before family fuzzy**). `plugins/slot/statusline/check.js` now pins it — 10 assertions
through the real script under a sandboxed `WISP_HOME`, no framework; **verified against the pre-fix file as
a control (5 of 10 fail there)**. Filed #200 for the wires that report nothing.

**Prior pass (2026-07-30): the statusline redesign shipped — `5592f44` on main, `wisp-router@2.0.42`
published, `wisp-slot` 1.7.0.** The user's complaint was shape, not data: #171's readings were a one-line
badge that looked like a copy of the caveman/ponytail badges beside it. It is now a block — route row, a
colour-scaled `●○` bar per quota window with its reset time, and a dimmed row per other Provider whose
limits are known, stamped with the reading's age. `status.json` gained a **quota ledger** so a route switch
stops erasing what the other wire last said.

## Queue: #200

`gh issue list --label ready-for-agent --state open` — verify by query, not by this note.

- **#200** — *ready-for-agent.* Recon: capture the response heads on the four wires that never call
  `onQuota` (xai, antigravity, keyed ×2) and record a verdict each. Capture only — **no parser, no
  `onQuota` threading, no `status.ts` change lands in it**. Needs live sign-ins; a wire that cannot be
  reached is recorded as *not captured*, never guessed.

Open, not agent-ready:

- **#163** — waiting, not working (watch the 217k–245k band for refusals).
- **#69** — copilot-wisp launcher, ungroomed. `grill-me` / `/preset init` is the right shape.

## What this session shipped (evidence, reusable)

- Core: `status.ts` gains `WispProviderQuota` / `WispStatus.providers` / pure `mergeStatus`;
  `homeStore.ts` gains `readStatus()` and read-merge-writes the ledger.
- Reader: `plugins/slot/statusline/wisp-statusline.js` rewritten badge → block, **no leading newline**
  (the composing statusline owns layout). `~/.claude/hooks/statusline-wrapper.ps1` — **outside the repo** —
  captures it and prefixes a newline only when non-empty.
- Gate: **1016/1016 vitest**, `bun run compile` clean in **both** packages, `wisp routing` text/JSON/bad-flag
  unchanged in a sandbox home, and the ledger driven end to end through the real `@wisp/core` resolution.
- **Release verified with the 2.0.41 control**: the compiled `wisp.exe` carries `mergeStatus` /
  `readStatus` / `QUOTA_LEDGER_MAX_AGE_MS` at 2.0.42 and scores **0** on the identical grep at 2.0.41.
  `release.yml` run 30506981631 green.

## Waiting on the user

- **`/plugin update wisp-slot`** — hygiene only, and safe to ignore. Install record is 1.6.0, checkout is
  1.7.0; the block the user sees comes from the checkout via the wrapper, and hooks/skills did not move.
- **Install `packages/vscode/wisp-1.11.0.vsix`** — still not installed. No vsix was cut this pass on
  purpose; the extension gains the ledger when next packaged.
- **Dismiss the two secret-scanning alerts** as "won't fix" —
  [#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
  [#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2). Settled
  ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]); noise now.
- **Bridge access secret rotation** — delete `bridgeSecret` from `~/.wisp/auth.json`, start any host. Low urgency.
- **#170** — needs a **Kimi Code subscription**.
- **#189's last criterion** — a Claude-model turn *completing* on Antigravity after the quota reset
  `2026-07-30T20:55:48Z`. Leave the result as a note on closed #189.
- **~19 stale local `ticket/*` branches** (`git branch --list 'ticket/*'`). Cleanup, not a blocker.

## Landmines (durable — keep carrying)

Statusline / status.json:

- **The statusline DUPLICATES `resolveRoute`** — it runs out-of-process under Claude Code and cannot import
  `@wisp/core`, so `wisp-statusline.js:115-121` re-implements the lookup in plain JS. It has drifted once
  (aliases missing). Change `routing.ts:60-91` → check the copy, and run
  `node plugins/slot/statusline/check.js` (exit code is the verdict).
- **A wrong-Provider reading looks identical to a stale one.** Both render as the dimmed dated row, because
  a route that fails to resolve makes `live` unreachable. Suspect resolution before suspecting the ledger.
- **An empty `providers` map is usually correct, not a bug.** The ledger never holds the *active* Provider,
  so a machine where only one Provider ever serves has an empty map. Check whether a second Provider has
  actually served a turn before debugging.
- **The block the user sees runs from the repo checkout, not the plugin cache** — the wrapper points there
  deliberately, so `/plugin update` does not change what the statusline runs
  ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]).
- **The wrapper lives outside the repo** (`~/.claude/hooks/statusline-wrapper.ps1`) — a change to the
  block's shape may need it edited too, and that edit is not in any commit.
- Never verify usage from `status.json` — it is global
  ([[status-json-is-global-so-it-cannot-observe-another-session]]).

Release:

- **An npm version can never be republished.** The tag is the trigger; no undo.
- **The tag must equal `packages/tui/package.json` exactly** — `release.yml` verifies, fails loud.
- **A fix release is not verified until the OLD version FAILS the same check.** Credential-free controls:
  `wisp routing set haiku antigravity/gemini-3-flash` (missing sign-in *warns* at exit 0, missing Provider
  *errors* at exit 1), or grep the compiled `wisp.exe` for an identifier the change introduced.
- **A vsix is evidence only when checked in the BUNDLE** — unzip, grep `extension/dist/extension.js`.
- **Verify npm past the registry read** — scratch install, execute the bins.
- **Every release entry carries `### Surfaces`, derived from `git log <last-tag>..main -- <face-path>`,
  never copied from the ticket** —
  [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]].
- **Labels are the only real gate** — `## Blocked by` is body text a frontier query cannot see.
- **A closed-by-PR issue keeps its `ready-for-agent` label** — clear it by hand.

Antigravity (full detail in `active-work.md` history + memory notes):

- Two doors, two places: executor record (OpenAI) vs `startProviderStream` chain (Anthropic) —
  [[the-anthropic-door-does-not-use-the-executor-records]].
- FULL system on this wire, never `systemSplit.stable`. 429 verdict rides ON the Error. Throw shape is a
  CONTRACT (`Antigravity API error <status>`). SSE framing is CRLF — do not "simplify" `sseBlocks`.
- **A green suite did not catch a dead Provider** — drive a real turn; a live negative is usually the
  fixture or the model ([[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]).
- Never mint opaque provider-side tool ids. Credits' cooldown ledger is harmful with one credential.

Credential hygiene ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]):

- Never write account-identifying values into this repo; tests use `example-project-1`. The spike fixtures
  at `D:\scratch\antigravity-spike\out\` carry live credentials — never read, never copy.
- Anything credential-shaped bound for this PUBLIC repo is a question for the maintainer.

General:

- **`bun run compile` in BOTH packages**; the test gate is **`bun run test`** (vitest) — bare `bun test`
  runs Bun's runner, ~53 bogus failures.
- Prefer the scoped **`packages/tui:verify`** skill for tui/core work: sandboxed `WISP_HOME`, real entry points.
- A store that does not parse is never overwritten — `merge` refuses (#182, ADR-0004). **`status.json` is
  the documented exception**: it is regenerable telemetry.
- The `wisp-slot` version lives in TWO files (`plugins/slot/.claude-plugin/plugin.json` +
  `.claude-plugin/marketplace.json`).
- `.context/` commits go to main, never a ticket branch.
- No PR CI — only `release.yml` on tag `v*`; the local gate *is* the gate.

Reference clone at `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`, re-clonable, outside the repo). Note: it
holds **no** statusline script — the panel shape came from the user's screenshot, not that repo.

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
