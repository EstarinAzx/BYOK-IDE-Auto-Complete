---
type: pick-up
project: wisp
updated: 2026-08-14
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Latest (2026-08-14, relay leg 2): #203 statusline expired-meter LANDED.** PR #206, squashed as `ca29ebc`
on main, issue closed, `ready-for-agent` cleared, wisp-slot **1.7.4** in both manifests. Gate green:
`check.js` **30/30** (24 + 6 new expiry cases), control run failed all 4 behavior assertions pre-fix, live
ANSI eyeball verified. Plugin-only — **npm `wisp-router` 2.0.43 cut still OWED, unchanged by #203**
(changelog entry sits `unreleased`; `package.json` deliberately not bumped).

## Queue: #204

`gh issue list --label ready-for-agent --state open` → one ticket. **Verify by query, not by this note**
([[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]).

- **#204 — usage-endpoint recon spike.** Throwaway probes under gitignored `out/`, redact on **values**,
  ≤3 reads — the Anthropic usage endpoint carries a multi-minute 429 penalty. Verdict lands as a comment
  on #201; a build ticket is filed only on a build verdict. The quota-recon landmines below are the
  working rules for this ticket.

After #204 the queue is dry: #69 and #163 are open but neither is agent-ready. Queue empty → the loop's
stop signal, and the 2.0.43 cut becomes the user's move.

## ⚠ Read before cutting a ticket branch

**`git rev-list --left-right --count origin/main...main` — the right-hand number must be 0.**

Local `main` drifts ahead of origin on this repo *by convention*, and a branch cut from an unpushed main
sweeps those commits into its own squash-merge — it happened to `3465c7c` (#202). Leg 2 ran the guard,
got 0/0, and `ca29ebc` squashed to exactly its own 4 files. One command before the work; after the merge
the cheap fix is gone. Full trap: [[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]].

## Waiting on the user

- **Cut npm `wisp-router` 2.0.43** when 2.0.43's work is done — bump `packages/tui/package.json`, tag
  `v2.0.43` (**tag must equal package.json exactly**; `release.yml` verifies and fails loud).
- **Install `packages/vscode/wisp-1.11.0.vsix`** — still not installed.
- **Dismiss the two secret-scanning alerts** as "won't fix" —
  [#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
  [#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2).
- **Bridge access secret rotation** — delete `bridgeSecret` from `~/.wisp/auth.json`, start any host.
- **#170** — needs a **Kimi Code subscription**.
- **#189's last criterion** — note a completing Antigravity Claude-model turn on closed #189 when observed.
- **~20 stale local `ticket/*` branches** (`git branch --list 'ticket/*'`). Cleanup, not a blocker.
- **`.context/Untitled.canvas`** — untracked user file, left uncommitted; keep or remove is the user's call.
- Optional: `/plugin update wisp-slot` to refresh the cached skill/hook copies to 1.7.4 — the statusline
  badge itself already runs 1.7.4 from the checkout
  ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]).

## Landmines (durable — keep carrying)

Statusline / status.json:

- **The model id Claude Code hands you is NOT the Alias name.** A picked route arrives as
  `claude-wisp-<name>`, optionally with Claude Code's own `[1m]` tier suffix. Any consumer reading the name
  from Claude Code rather than from the door must normalize first
  ([[a-picked-alias-reaches-the-statusline-prefixed-claude-wisp]]).
- **When a route row is wrong, `grep model ~/.claude/settings.json` FIRST.** Cheaper than the check suite;
  two route-row bugs were each one grep from solved.
- **The statusline DUPLICATES `resolveRoute`** — out-of-process, cannot import `@wisp/core`. It has drifted
  twice. Change `routing.ts:60-91` → check the copy, and run `node plugins/slot/statusline/check.js`
  (30 assertions since #203; exit code is the verdict).
- **Its fixtures must use the shape the CALLER sends, not the name the source stores** — both drifts
  survived a green check because the fixtures agreed with the code instead of with reality. #203's expiry
  cases follow it (epoch-second `resetAt`, picker-prefixed ids); hold any new case to the same.
- **A statusline fix needs the pre-fix file as the control.** `git show HEAD:<path>` into a scratch dir;
  assertions that pass both ways are pins, label them so. (#203 did exactly this: 4 failed pre-fix, 2 pins
  labelled in-file.)
- **Expired meters (`resetAt <= now`, epoch seconds) render `↻ refilled`, dimmed, no bar/percent** — one
  `expired()` predicate, applied at BOTH render sites (active rows and remembered rows). Widening either
  site alone breaks the "identical treatment" contract of #203. Reading age (24h prune) stays orthogonal
  to window validity.
- **"Showing anthropic when I'm on codex" has TWO causes — the route row tells them apart.** Bare `wisp` →
  resolution failed. A complete route row beside a foreign quota row → global-slot displacement.
- **A bare `wisp` row in a hand-built sandbox is usually the BOM**, not the resolver — PowerShell 5.1
  `Out-File`/`Set-Content -Encoding utf8` writes a BOM, `JSON.parse` throws, config reads `{}`. Seed
  sandboxes from bash/node ([[a-bom-in-wisp-config-silently-empties-the-whole-config]]). Re-bit leg 2's
  eyeball harness.
- **`status.json` is ONE global slot** — a concurrent session on another Provider owns the top level and
  pushes yours into `providers`. Consumers check both places, keyed on `providerId`
  ([[status-json-is-global-so-it-cannot-observe-another-session]]). Safe only because `mergeStatus` evicts
  the incoming Provider from the ledger — don't weaken that.
- **Codex on a Plus plan has exactly ONE window** (`x-codex-secondary-window-minutes: 0`, refused by
  `parseCodexQuota`, `status.ts:88-91`). A `5h`/`7d` pair is Anthropic's — the fast displacement tell.
- **`stream: false` never records a snapshot** — the non-streaming branch is Claude Code's `/model` probe,
  deliberately excluded (`bridgeServer.ts:843` is on the streaming path).
- **The block the user sees runs from the repo checkout, not the plugin cache**
  ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]); the wrapper lives outside the repo
  (`~/.claude/hooks/statusline-wrapper.ps1`) and its edits are in no commit.
- **An empty `providers` map is usually correct** — the ledger never holds the *active* Provider.

Bridge log (#202):

- **The serve banner is NOT mirrored into `bridge.log`** — it prints the Bridge access secret. Only the
  Bridge's own log callback is captured. Anything that widens what serve writes to the file must keep that
  line.
- **`bridge.log` is regenerable telemetry**, same class as `status.json`: never overwrite-protected
  (#182 guards stores whose contents a user cannot regenerate), and already invisible to the home-store
  watcher through its existing non-`.json` name filter (`homeStore.ts:125`).

Quota / recon (the #204 working rules):

- **Only two wires report quota via headers, and that is SETTLED, not a gap**
  ([[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]). #204 asks a NEW question — an
  *active* usage-endpoint lane — and does not reopen the header decision.
- **Recon that reads a response head must DRAIN the body**
  ([[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]).
- **Prove a wire by driving it, not by reading it** — throwaway `bun` probes under gitignored `out/`;
  delete after; never commit.
- **Usage payloads can carry account identifiers under unpredictable keys — redact on the VALUE**
  ([[loadcodeassist-answers-with-the-account-email-inside-it]]). Applies directly to #204.
- **The Anthropic usage endpoint carries a multi-minute 429 penalty** — budget ≤3 reads total; a spent
  budget with no verdict is a "no-build yet" comment on #201, not a license for read #4.

Release:

- **An npm version can never be republished.** The tag is the trigger; no undo.
- **The tag must equal `packages/tui/package.json` exactly** — `release.yml` verifies, fails loud.
- **A fix release is not verified until the OLD version FAILS the same check**
  ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]).
- **A vsix is evidence only when checked in the BUNDLE**; **verify npm past the registry read** (scratch
  install, execute the bins).
- **Every release entry carries `### Surfaces`, derived from `git log <last-tag>..main -- <face-path>`**
  ([[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]) — and note that
  a swept squash can make that command read a feat commit where a fix belonged.
- **Labels are the only real gate**; **a closed-by-PR issue keeps its `ready-for-agent` label** — clear it
  by hand.

Antigravity (full detail in memory notes):

- Two doors, two places ([[the-anthropic-door-does-not-use-the-executor-records]]). FULL system on this
  wire, never `systemSplit.stable`. 429 verdict rides ON the Error. Throw shape is a CONTRACT. SSE framing
  is CRLF. Turns → daily host, `loadCodeAssist` → production. Never mint opaque provider-side tool ids.
- **A green suite did not catch a dead Provider** — drive a real turn
  ([[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]).

Credential hygiene ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]):

- Never write account-identifying values into this repo; tests use `example-project-1`. The spike fixtures
  at `D:\scratch\antigravity-spike\out\` carry live credentials — never read, never copy.
- Anything credential-shaped bound for this PUBLIC repo is a question for the maintainer. Upstream error
  bodies leak too — redact before quoting into a ticket.

General:

- **`packages/core` has NO `compile` script** — gate is `bun run typecheck`; only `packages/tui` has
  `compile`. Test gate is **`bun run test`** (vitest) — bare `bun test` runs Bun's runner, ~53 bogus
  failures. Note the split: `packages/core/tests/` is vitest and runs in the workspace gate;
  `packages/tui/tests/` is the **bun runner** and must be run explicitly (`bun test packages/tui/tests/…`).
- Prefer the scoped **`packages/tui:verify`** skill for tui/core work.
- A store that does not parse is never overwritten (#182, ADR-0004); `status.json` and `bridge.log` are the
  documented exceptions (regenerable telemetry, never protected).
- The `wisp-slot` version lives in TWO files (`plugins/slot/.claude-plugin/plugin.json` +
  `.claude-plugin/marketplace.json`) — now 1.7.4 in both.
- `.context/` commits go to main, never a ticket branch — **and see the unpushed-main trap above.**
- No PR CI — only `release.yml` on tag `v*`; the local gate *is* the gate.

Reference clones (both outside the repo, both re-clonable): `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`;
Antigravity credits poll at `internal/runtime/executor/antigravity_executor_credits.go:453`) and
`D:\scratch\traycer` (shallow, 2026-08-14; harness-orchestrator reference — protocol schemas + clients only,
host closed; rate-limit protocol at `protocol/src/host/rate-limit/`).

## Related

- [[active-work]]
- [[overview]]
- [[quota-recon]]
- [[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]]
- [[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[2026-08-14-a-cursor-provider-has-no-wire-to-route-through]]
- [[2026-08-05-a-duplicated-resolver-is-fixtured-with-what-its-caller-sends-not-what-its-source-names]]
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
