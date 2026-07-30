---
type: pick-up
project: wisp
updated: 2026-07-30
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Latest (2026-07-30, third pass): #200 closed recon-complete — the answer was "build nothing".** The last
queue ticket asked which of the four wires that never call `onQuota` (xai, antigravity, keyed ×2) report quota
on their response head. All four were driven with real turns and captured; **none earned `parseable meter`**,
so **no child implementation ticket was filed** — that was the acceptance criterion, not a shortcut. xai *has*
`x-ratelimit-*` on both endpoints and they are a trap: `864/864` across 3 fully-drained `grok-build` turns,
`8300/8300` across 2 on `grok-4.5`, and **no `x-ratelimit-reset*` at all** — advertised plan ceilings, not
readings. Antigravity and opencode-go put nothing quota-shaped on the head. Capture in [[quota-recon]],
reasoning in [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]. **No source changed**;
the ticket branch was deleted unused and the notes landed on main.

**Prior pass: `f565e94` — `wisp-slot` 1.7.1.** The statusline block was showing the *wrong* Provider's quota on
an aliased route, because the out-of-process copy of `resolveRoute` knew only the family-fuzzy rung. Fixed by
mirroring the real order (**alias exact before family fuzzy**); `plugins/slot/statusline/check.js` pins it with
10 assertions, control-verified (5 of 10 fail against the pre-fix file).

## Queue: EMPTY

`gh issue list --label ready-for-agent --state open` returns nothing. **Verify by query, not by this note.**

Two open issues, neither agent-ready:

- **#69** — copilot-wisp launcher, ungroomed backlog. `grill-me` / `/preset init` is the right shape.
- **#163** — waiting, not working (watch the 217k–245k band for Anthropic `stop_reason=refusal`).

A `ticket-loop` firing that lands here should **stop the loop** rather than invent work. Grooming #69, or
picking something off "Waiting on the user", are the honest next moves.

## Waiting on the user

- **`/plugin update wisp-slot`** — hygiene only, safe to ignore. Cache is **1.7.0** (verified
  `~/.claude/plugins/cache/wisp-router/wisp-slot/`, not 1.6.0 as an earlier note said), checkout is 1.7.1.
  `git diff 5592f44..HEAD -- plugins/slot/` is version bump + README + `check.js` + the statusline script —
  **no hooks, no skills moved**, so nothing functional is stale. The cached 1.7.0 statusline *is* the buggy
  pre-alias copy (0 hits for `aliases`) but nothing reads it: `~/.claude/hooks/statusline-wrapper.ps1:44`
  hardcodes the repo checkout path.
- **Install `packages/vscode/wisp-1.11.0.vsix`** — still not installed. Nothing touched the extension this
  pass, so no new vsix was cut.
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

Quota / recon:

- **Only two wires report quota, and that is SETTLED, not a gap.** codex + anthropic call `onQuota`; xai,
  antigravity and the keyed path never will, because their heads carry nothing usable. Do not file it as
  missing work ([[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]).
- **Recon that reads a response head must DRAIN the body.** Cancelling means the turn may never be billed, so
  a `remaining` counter has nothing to move and a dead ceiling looks identical to an untouched meter. Fire
  2–3 consecutive completed turns, or the finding is worthless
  ([[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]).
- **`loadCodeAssist` returns the account email** inside `upgradeSubscriptionUri`, percent-encoded (`%40`),
  under a key no `email`/`id` pattern matches. Redact on the **value**, not the key name
  ([[loadcodeassist-answers-with-the-account-email-inside-it]]).
- **An empty `providers` map is usually correct** — the ledger never holds the *active* Provider.

Statusline / status.json:

- **The statusline DUPLICATES `resolveRoute`** — it runs out-of-process under Claude Code and cannot import
  `@wisp/core`, so `wisp-statusline.js:115-121` re-implements the lookup in plain JS. It has drifted once
  (aliases missing). Change `routing.ts:60-91` → check the copy, and run
  `node plugins/slot/statusline/check.js` (exit code is the verdict).
- **A wrong-Provider reading looks identical to a stale one.** Both render as the dimmed dated row, because a
  route that fails to resolve makes `live` unreachable. Suspect resolution before suspecting the ledger.
- **The block the user sees runs from the repo checkout, not the plugin cache** — the wrapper points there
  deliberately, so `/plugin update` does not change what the statusline runs
  ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]).
- **The wrapper lives outside the repo** (`~/.claude/hooks/statusline-wrapper.ps1`) — a change to the block's
  shape may need it edited too, and that edit is not in any commit.
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
- **Turns go to the daily host, `loadCodeAssist` to production** — the asymmetry is deliberate and still current.
- **A green suite did not catch a dead Provider** — drive a real turn; a live negative is usually the fixture
  or the model ([[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]).
- Never mint opaque provider-side tool ids. Credits' cooldown ledger is harmful with one credential.

Credential hygiene ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]):

- Never write account-identifying values into this repo; tests use `example-project-1`. The spike fixtures at
  `D:\scratch\antigravity-spike\out\` carry live credentials — never read, never copy.
- Anything credential-shaped bound for this PUBLIC repo is a question for the maintainer.
- Upstream **error bodies** leak too — opencode's `401 CreditsError` names a billing URL carrying the
  workspace id. Redact before quoting into a ticket or note.

General:

- **`packages/core` has NO `compile` script** — its gate is `bun run typecheck` (`tsc --noEmit`); only
  `packages/tui` has `compile` (`tsc -p ./`). The old "compile in BOTH packages" wording errors with
  `Script not found "compile"`. Test gate is **`bun run test`** (vitest) — bare `bun test` runs Bun's runner,
  ~53 bogus failures.
- Prefer the scoped **`packages/tui:verify`** skill for tui/core work: sandboxed `WISP_HOME`, real entry points.
- A store that does not parse is never overwritten — `merge` refuses (#182, ADR-0004). **`status.json` is the
  documented exception**: it is regenerable telemetry.
- The `wisp-slot` version lives in TWO files (`plugins/slot/.claude-plugin/plugin.json` +
  `.claude-plugin/marketplace.json`).
- `.context/` commits go to main, never a ticket branch.
- No PR CI — only `release.yml` on tag `v*`; the local gate *is* the gate.

Reference clone at `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`, re-clonable, outside the repo). Holds **no**
statusline script, but **does** hold the Antigravity credits poll
(`internal/runtime/executor/antigravity_executor_credits.go:453`).

## Related

- [[active-work]]
- [[overview]]
- [[quota-recon]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]
- [[loadcodeassist-answers-with-the-account-email-inside-it]]
- [[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
