---
type: pick-up
project: wisp
updated: 2026-07-30
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-30): #197 LANDED — `wisp` vsix 1.11.0 cut.** Squash merge `6b6299a` on main
(PR #199). Spec **#185 is now delivered on all three faces**: npm `wisp-router@2.0.41` live,
vsix 1.11.0 packaged, `wisp-slot` untouched at 1.6.0 with nothing owed. #174 (the tracking
placeholder) closed with it.

## Queue: EMPTY

`gh issue list --label ready-for-agent --state open` returns nothing. Genuinely dry this time — by
tracker query, not by prediction. No relay re-arm until new tickets are groomed and labelled.

Open issues, none agent-ready:

- **#163** — waiting, not working (watch the 217k–245k band for refusals).
- **#69** — copilot-wisp launcher, ungroomed. `grill-me` / `/preset init` is the right shape.

## What #197 shipped (evidence, reusable)

- `packages/vscode/package.json` 1.10.1 → **1.11.0** + changelog with `### Surfaces` **derived** per
  face from `git log b672333..main -- <path>` (vscode: `ba8dab3` #188 + `c6f644a` #189 only; core:
  #187–#191 ride the bundle; `plugins/` untouched).
- Gate: **1009/1009 vitest**, `bun run compile` clean in **both** packages.
- **Bundle-verified with the 1.10.1 control**: unzip the vsix, grep
  `extension/dist/extension.js` — 1.11.0 carries `AntigravityAuth`/`antigravitySignedIn`/
  `antigravityCreds`/`antigravity-oauth`/`Antigravity API error` (14 hits) + webview `main.js` (5);
  **1.10.1 scores 0 on the identical grep**. The control failing is what makes the pass mean anything
  ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]).

## Waiting on the user

- **Install `packages/vscode/wisp-1.11.0.vsix`** — not on the marketplace; supersedes the
  never-installed 1.10.1. Until then the editor face carries neither #182 nor Antigravity.
- **Dismiss the two secret-scanning alerts** as "won't fix" —
  [#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
  [#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2). Settled
  ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]); noise now.
- **Bridge access secret rotation** (printed to a session log during #191, loopback-only): delete
  `bridgeSecret` from `~/.wisp/auth.json`, start any host. Low urgency.
- **#170** — needs a **Kimi Code subscription**.
- **#189's last criterion** — a Claude-model turn *completing* on Antigravity after the quota resets
  `2026-07-30T20:55:48Z` (≈ 08:55 NZ time 07-31). Leave the result as a note on closed #189.
- **~19 stale local `ticket/*` branches** from landed work (`git branch --list 'ticket/*'`). Cleanup,
  not a blocker.

## Landmines (durable — keep carrying)

Release:

- **An npm version can never be republished.** The tag is the trigger; no undo.
- **The tag must equal `packages/tui/package.json` exactly** — `release.yml` verifies, fails loud.
- **A fix release is not verified until the OLD version FAILS the same check.** Credential-free
  control for Provider releases: `wisp routing set haiku antigravity/gemini-3-flash` — a missing
  sign-in *warns* (exit 0) where a missing Provider *errors* (exit 1).
- **A vsix is evidence only when checked in the BUNDLE** — unzip, grep `extension/dist/extension.js`
  (and `dist/webview/main.js` for panel rows). The extension bundles its own `@wisp/core`, so no npm
  version reaches it.
- **Verify npm past the registry read** — scratch install, execute the bins.
- **Every release entry carries `### Surfaces`, derived from `git log <last-tag>..main -- <face-path>`,
  never copied from the ticket** —
  [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]].
- **Labels are the only real gate** — `## Blocked by` is body text a frontier query cannot see.
- **A closed-by-PR issue keeps its `ready-for-agent` label** — clear it by hand (done for #197).

Antigravity (all recorded in `active-work.md` + memory notes, headline list):

- Two doors, two places: executor record (OpenAI) vs `startProviderStream` chain (Anthropic) —
  [[the-anthropic-door-does-not-use-the-executor-records]].
- FULL system on this wire, never `systemSplit.stable` (no cache breakpoint here).
- 429 verdict rides ON the Error, never sniffed from its message —
  [[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]].
- Throw shape is a CONTRACT: `Antigravity API error <status>` or zero retries.
- SSE framing is CRLF; `sseBlocks` is CRLF-tolerant — do not "simplify" to `'\n\n'`.
- **A green suite did not catch a dead Provider** — drive a real turn before calling Provider work
  done; and a live negative is usually the fixture or the model —
  [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]].
- Never mint opaque provider-side tool ids; absent upstream ⇒ empty id.
- Schema cleaner is safe because of its WALKER, not only its scope —
  [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]].
- Credits' cooldown ledger is harmful with one credential — do not port it.

Credential hygiene ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]):

- Never write account-identifying values into this repo; tests use `example-project-1`. The spike
  fixtures at `D:\scratch\antigravity-spike\out\` carry live credentials — never read, never copy.
- Anything credential-shaped bound for this PUBLIC repo is a question for the maintainer.
- Live checks run in a sandboxed `WISP_HOME` —
  [[live-verify-the-bridge-from-source-isolated-wisp-home-on-a-spare-port]].

General:

- **`bun run compile` in BOTH packages** (root `packages/vscode` + `packages/tui`); the test gate is
  **`bun run test`** (vitest) — bare `bun test` runs Bun's runner, ~53 bogus failures.
- A store that does not parse is never overwritten — `merge` refuses (#182, ADR-0004).
- The `wisp-slot` version lives in TWO files (`plugins/slot/.claude-plugin/plugin.json` +
  `.claude-plugin/marketplace.json`).
- Never verify usage from `status.json` — it is global
  ([[status-json-is-global-so-it-cannot-observe-another-session]]).
- `.context/` commits go to main, never a ticket branch.
- No PR CI — only `release.yml` on tag `v*`; the local gate *is* the gate.

Reference clone at `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`, re-clonable, outside the repo).

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[live-verify-the-bridge-from-source-isolated-wisp-home-on-a-spare-port]]
