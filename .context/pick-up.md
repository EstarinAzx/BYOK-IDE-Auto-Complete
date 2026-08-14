---
type: pick-up
project: wisp
updated: 2026-08-14
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Latest (2026-08-14): 2.0.44 is SHIPPED and nothing is owed.**

One session, one direct user ask: a newly released Antigravity model (`gemini-3.7-flash-tiered`) was
invisible because the model lineup was a hardcoded snapshot. The pickers now prefer the upstream's own
`POST /v1internal:fetchAvailableModels` answer, static table demoted to signed-out/offline fallback
([[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]). Shipped straight on main
(`88e8a39` feat + `a712745` release — no ticket, user-authorized cut), tag `v2.0.44`, run `31781936359`
green on all five jobs, npm `latest`, verified from scratch installs of BOTH versions with 2.0.43 as the
failing control (live 21 rows vs static 13). **vsix 1.12.0 built and bundle-checked — NOT installed.**

**There is no queued work and no owed release.** The next move is a decision, not a task.

## Queue: empty

`gh issue list --label ready-for-agent --state open` → `[]` at last check. **Verify by query, not by
this note** ([[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]).

Open but deliberately **not** agent-ready: **#207** (active quota probe — blocked on three scoping
calls), **#69**, **#163**.

## 2.0.44 — cut, published, verified

`wisp-router@2.0.44` is npm `latest`; GitHub release `v2.0.44` carries all four platform binaries.
Verified past the registry read with a discriminating pair: scratch 2.0.44's `wisp models antigravity`
against the real signed-in home prints the live list (21 rows, `gemini-3.7-flash-tiered` present);
scratch 2.0.43 prints the static 13 without it. Signed-out sandbox on 2.0.44 prints the curated 13 —
fallback proven.

Worth knowing before the next cut:

- **Surfaces derived at the cut** from `git log v2.0.43..main -- <face-path>`: one commit, three
  package faces, plugin untouched. Keep deriving at the cut, never from ticket prose.
- **The vsix bundle check needs a discriminating marker.** Plain `fetchAvailableModels` greps 1 in the
  OLD 1.11.0 bundle too (a stale comment string); the `v1internal:fetchAvailableModels` URL literal is
  what separates 1.12.0 from 1.11.0.
- **The platform npm packages 404 and that is normal** — npm's spam filter; `release.yml` treats them
  as best-effort, the shim falls back to the GitHub release binaries.

## ⚠ Read before cutting a ticket branch

**`git rev-list --left-right --count origin/main...main` — the right-hand number must be 0.**

A branch cut from an unpushed main sweeps those commits into its own squash-merge (`3465c7c`, #202).
This session ran the guard (0/0) and pushed everything, so origin is current. Full trap:
[[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]].

## Waiting on the user

- **#207's three scoping calls** before it can be labelled `ready-for-agent`: poll **cadence**;
  **precedence** when a poll and a turn header disagree; **opt-in or always-on**.
- **Install `packages/vscode/wisp-1.12.0.vsix`** — supersedes the never-installed 1.11.0; carries the
  live Antigravity dropdowns (the extension bundles its own `@wisp/core`, npm can't deliver this).
- **Dismiss the two secret-scanning alerts** as "won't fix" —
  [#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
  [#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2).
- **Bridge access secret rotation** — delete `bridgeSecret` from `~/.wisp/auth.json`, start any host.
- **#170** — needs a **Kimi Code subscription**.
- **#189's last criterion** — note a completing Antigravity Claude-model turn on closed #189 when observed.
- **~20 stale local `ticket/*` branches** (`git branch --list 'ticket/*'`). Cleanup, not a blocker.
- **`.context/Untitled.canvas`** — untracked user file, left uncommitted; keep or remove is the user's call.
- Optional: `/plugin update wisp-slot` to refresh the cached skill/hook copies to 1.7.4
  ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]).

## Landmines (durable — keep carrying)

Statusline / status.json:

- **The model id Claude Code hands you is NOT the Alias name.** A picked route arrives as
  `claude-wisp-<name>`, optionally with Claude Code's own `[1m]` tier suffix
  ([[a-picked-alias-reaches-the-statusline-prefixed-claude-wisp]]).
- **When a route row is wrong, `grep model ~/.claude/settings.json` FIRST.**
- **The statusline DUPLICATES `resolveRoute`** — out-of-process, cannot import `@wisp/core`; has
  drifted twice. Change `routing.ts:60-91` → check the copy, run `node plugins/slot/statusline/check.js`
  (30 assertions; exit code is the verdict).
- **Its fixtures must use the shape the CALLER sends, not the name the source stores.**
- **A statusline fix needs the pre-fix file as the control** (`git show HEAD:<path>` into scratch).
- **Expired meters (`resetAt <= now`, epoch seconds) render `↻ refilled`, dimmed** — one `expired()`
  predicate at BOTH render sites; reading age (24h prune) stays orthogonal to window validity.
- **"Showing anthropic when I'm on codex" has TWO causes** — bare `wisp` → resolution failed; a
  complete route row beside a foreign quota row → global-slot displacement.
- **A bare `wisp` row in a hand-built sandbox is usually the BOM** — seed sandboxes from bash/node
  ([[a-bom-in-wisp-config-silently-empties-the-whole-config]]).
- **`status.json` is ONE global slot** — consumers check top level AND `providers`, keyed on
  `providerId` ([[status-json-is-global-so-it-cannot-observe-another-session]]); safe only because
  `mergeStatus` evicts the incoming Provider from the ledger.
- **Codex on a Plus plan has exactly ONE window** (`x-codex-secondary-window-minutes: 0`); a `5h`/`7d`
  pair is Anthropic's — the fast displacement tell.
- **`stream: false` never records a snapshot** (the non-streaming branch is the `/model` probe).
- **The statusline block runs from the repo checkout, not the plugin cache**
  ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]); the wrapper lives at
  `~/.claude/hooks/statusline-wrapper.ps1`, outside any commit.
- **An empty `providers` map is usually correct.**

Bridge log (#202):

- **The serve banner is NOT mirrored into `bridge.log`** — it prints the Bridge access secret.
- **`bridge.log` is regenerable telemetry** — never overwrite-protected, invisible to the home-store
  watcher via the non-`.json` name filter (`homeStore.ts:125`).

Quota / recon (#204):

- **Only two wires report quota via headers — SETTLED**
  ([[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]).
- **Both usage endpoints answer Wisp's stored OAuth creds**: Anthropic
  `GET api.anthropic.com/api/oauth/usage` (`Bearer` + `anthropic-beta: oauth-2025-04-20`), Codex
  `GET chatgpt.com/backend-api/wham/usage` (`Bearer` + `chatgpt-account-id`).
  **`/backend-api/api/codex/usage` is a 404 — do not retry.** Verdict build, deferred to #207
  ([[2026-08-14-the-usage-endpoint-is-the-same-ledger-reached-without-a-turn]]).
- **Validate a new quota source against one already trusted, not by watching a counter**
  ([[a-new-quota-source-is-cheapest-to-validate-against-one-already-trusted]]).
- **Parse `limits[]` on shape — named buckets are unstable codenames**
  ([[the-usage-payload-names-most-of-its-buckets-in-unstable-codenames]]).
- **Recon that reads a response head must DRAIN the body**
  ([[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]).
- **Prove a wire by driving it** — throwaway probes under gitignored `out/`; delete after.
- **Usage payloads carry account identifiers under unpredictable keys — redact on the VALUE**
  ([[loadcodeassist-answers-with-the-account-email-inside-it]]).
- **The Anthropic usage endpoint carries a multi-minute 429 penalty** — budget ≤3 reads; never callable
  from the statusline render path.

Release:

- **An npm version can never be republished.** The tag is the trigger; no undo.
- **The tag must equal `packages/tui/package.json` exactly** — `release.yml` verifies.
- **A fix release is not verified until the OLD version FAILS the same check**
  ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]).
- **A vsix is evidence only when checked in the BUNDLE** — and with a marker absent from the OLD
  bundle; **verify npm past the registry read** (scratch install, execute the bins).
- **Every release entry carries `### Surfaces`, derived from `git log <last-tag>..main -- <face-path>`**
  ([[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]).
- **Labels are the only real gate**; a closed-by-PR issue keeps its `ready-for-agent` label — clear it
  by hand.

Antigravity (full detail in memory notes):

- Two doors, two places ([[the-anthropic-door-does-not-use-the-executor-records]]). FULL system on this
  wire, never `systemSplit.stable`. 429 verdict rides ON the Error. Throw shape is a CONTRACT. SSE
  framing is CRLF. Turns → daily host, `loadCodeAssist` → production. Never mint opaque provider-side
  tool ids.
- **The model list is LIVE since 2.0.44** ([[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]):
  `fetchAntigravityModels` (turn host chain, mirrored headers, any-failure host walk), static
  `ANTIGRAVITY_MODEL_SPECS` = fallback + caps only. Internal rows dropped on shape (`tab_*`,
  `chat_<digits>`), never pinned ids. Live list keeps known-400 rows on purpose — picker is the
  correction path. Live-listed unknown ids go UNCLAMPED (no maxOutputTokens cap).
- **A green suite did not catch a dead Provider** — drive a real turn
  ([[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]).

Credential hygiene ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]):

- Never write account-identifying values into this repo; tests use `example-project-1`. The spike
  fixtures at `D:\scratch\antigravity-spike\out\` carry live credentials — never read, never copy.
- Anything credential-shaped bound for this PUBLIC repo is a question for the maintainer. Upstream
  error bodies leak too — redact before quoting into a ticket.

General:

- **`packages/core` has NO `compile` script** — gate is `bun run typecheck`; only `packages/tui` and
  `packages/vscode` have `compile`. Test gate is **`bun run test`** (vitest, now 1026) — bare
  `bun test` runs Bun's runner, bogus failures. `packages/tui/tests/` is the **bun runner** (28), run
  explicitly.
- Prefer the scoped **`packages/tui:verify`** skill for tui/core CLI-surface work — but its sandbox
  rule bends when the check NEEDS real creds (live-wire drives): read-only commands against the real
  home are fine, say so in the evidence.
- A store that does not parse is never overwritten (#182, ADR-0004); `status.json` and `bridge.log`
  are the documented exceptions.
- The `wisp-slot` version lives in TWO files (`plugins/slot/.claude-plugin/plugin.json` +
  `.claude-plugin/marketplace.json`) — 1.7.4 in both.
- `.context/` commits go to main, never a ticket branch.
- No PR CI — only `release.yml` on tag `v*`; the local gate *is* the gate.

Reference clones (both outside the repo, re-clonable): `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`)
and `D:\scratch\traycer` (shallow, 2026-08-14). The model-discovery wire came from CLIProxyAPI's
`cmd/fetch_antigravity_models/main.go` + `sdk/cliproxy/antigravity_models.go` — the vendors' own
shipped clients remain the place to look for endpoint shapes.

## Related

- [[active-work]]
- [[overview]]
- [[decisions]]
- [[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]
- [[2026-08-14-the-usage-endpoint-is-the-same-ledger-reached-without-a-turn]]
- [[a-new-quota-source-is-cheapest-to-validate-against-one-already-trusted]]
- [[the-usage-payload-names-most-of-its-buckets-in-unstable-codenames]]
- [[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]]
- [[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[a-picked-alias-reaches-the-statusline-prefixed-claude-wisp]]
- [[the-statusline-duplicates-resolveroute-and-drifts]]
- [[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]
- [[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[an-empty-quota-ledger-is-usually-correct-not-broken]]
- [[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]
- [[loadcodeassist-answers-with-the-account-email-inside-it]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
