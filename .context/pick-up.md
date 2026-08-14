---
type: pick-up
project: wisp
updated: 2026-08-14
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Latest (2026-08-14, relay leg 3): #204 usage-endpoint recon LANDED — verdict build, filed as #207.**
No code, no branch, nothing committed: the ticket's deliverable is an answered question and its own
acceptance criteria forbid committing. Evidence + comparison table posted on #201, breadcrumb on #204,
issue closed, `ready-for-agent` cleared. **The queue is now dry and the loop stopped.**

## Queue: empty

`gh issue list --label ready-for-agent --state open` → `[]`. **Verify by query, not by this note**
([[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]).

Open but deliberately **not** agent-ready: **#207** (active quota probe — blocked on three scoping calls
and on 2.0.43 shipping), **#69**, **#163**.

## The next move is the user's: cut npm `wisp-router` 2.0.43

Nothing else blocks it. `packages/tui/CHANGELOG.md` carries `## [2.0.43] — unreleased` with Surfaces already
derived; `package.json` is deliberately unbumped. Release landmines are in the list below — the tag must
equal `package.json` **exactly**, and a fix release is not verified until the previous version fails the
same check.

## ⚠ Read before cutting a ticket branch

**`git rev-list --left-right --count origin/main...main` — the right-hand number must be 0.**

Local `main` drifts ahead of origin on this repo *by convention*, and a branch cut from an unpushed main
sweeps those commits into its own squash-merge — it happened to `3465c7c` (#202). Legs 2 and 3 both ran the
guard and got 0/0. One command before the work; after the merge the cheap fix is gone. Full trap:
[[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]].

## Waiting on the user

- **Cut npm `wisp-router` 2.0.43** — bump `packages/tui/package.json`, tag `v2.0.43` (**tag must equal
  package.json exactly**; `release.yml` verifies and fails loud). This is now the only open work item.
- **#207's three scoping calls** before it can be labelled `ready-for-agent`: poll **cadence**;
  **precedence** when a poll and a turn header disagree (they agreed exactly in the recon, so "freshest
  wins" is probably enough — but it is a decision); **opt-in or always-on**, since it is an extra outbound
  call on the user's credential.
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
  survived a green check because the fixtures agreed with the code instead of with reality.
- **A statusline fix needs the pre-fix file as the control.** `git show HEAD:<path>` into a scratch dir;
  assertions that pass both ways are pins, label them so.
- **Expired meters (`resetAt <= now`, epoch seconds) render `↻ refilled`, dimmed, no bar/percent** — one
  `expired()` predicate, applied at BOTH render sites. Reading age (24h prune) stays orthogonal to window
  validity.
- **"Showing anthropic when I'm on codex" has TWO causes — the route row tells them apart.** Bare `wisp` →
  resolution failed. A complete route row beside a foreign quota row → global-slot displacement.
- **A bare `wisp` row in a hand-built sandbox is usually the BOM**, not the resolver — PowerShell 5.1
  `Out-File`/`Set-Content -Encoding utf8` writes a BOM, `JSON.parse` throws, config reads `{}`. Seed
  sandboxes from bash/node ([[a-bom-in-wisp-config-silently-empties-the-whole-config]]).
- **`status.json` is ONE global slot** — a concurrent session on another Provider owns the top level and
  pushes yours into `providers`. Consumers check both places, keyed on `providerId`
  ([[status-json-is-global-so-it-cannot-observe-another-session]]). Safe only because `mergeStatus` evicts
  the incoming Provider from the ledger — don't weaken that.
- **Codex on a Plus plan has exactly ONE window** (`x-codex-secondary-window-minutes: 0`, refused by
  `parseCodexQuota`, `status.ts:88-91`). A `5h`/`7d` pair is Anthropic's — the fast displacement tell.
  #204's endpoint probe independently re-confirmed this (`secondary_window: null`).
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
- **`bridge.log` is regenerable telemetry**, same class as `status.json`: never overwrite-protected, and
  already invisible to the home-store watcher through its non-`.json` name filter (`homeStore.ts:125`).

Quota / recon (updated by #204):

- **Only two wires report quota via headers, and that is SETTLED, not a gap**
  ([[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]).
- **The active lane is now ANSWERED, not open.** Both usage endpoints answer Wisp's stored OAuth
  credentials: Anthropic `GET api.anthropic.com/api/oauth/usage` (`Bearer` + `anthropic-beta:
  oauth-2025-04-20`), Codex `GET chatgpt.com/backend-api/wham/usage` (`Bearer` + `chatgpt-account-id`).
  **`/backend-api/api/codex/usage` is a 404 — do not retry it.** Verdict build, deferred to #207
  ([[2026-08-14-the-usage-endpoint-is-the-same-ledger-reached-without-a-turn]]).
- **Validate a new quota source against one you already trust, not by watching a counter** — the endpoint is
  rate-limited and reports integer percents, so a short time series proves nothing; `status.json`'s
  header-derived meters matched it exactly and settled it for free
  ([[a-new-quota-source-is-cheapest-to-validate-against-one-already-trusted]]).
- **Parse `limits[]` on shape — the payload's named buckets are unstable codenames** (`tangelo`,
  `nimbus_quill`, `iguana_necktie`…), and units differ from the header path (integer percent + ISO-8601 vs
  0..1 fraction + epoch seconds) ([[the-usage-payload-names-most-of-its-buckets-in-unstable-codenames]]).
- **Recon that reads a response head must DRAIN the body**
  ([[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]).
- **Prove a wire by driving it** — throwaway probes under gitignored `out/`; delete after; never commit.
- **Usage payloads carry account identifiers under unpredictable keys — redact on the VALUE**
  ([[loadcodeassist-answers-with-the-account-email-inside-it]]). Codex's `/wham/usage` returns `email`,
  `user_id`, `account_id`; Anthropic returns an org uuid and a **workspace id in response headers**.
- **The Anthropic usage endpoint carries a multi-minute 429 penalty** — budget ≤3 reads; it can never be
  called from the statusline render path.

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
  `packages/tui/tests/` is the **bun runner** and must be run explicitly.
- Prefer the scoped **`packages/tui:verify`** skill for tui/core work.
- A store that does not parse is never overwritten (#182, ADR-0004); `status.json` and `bridge.log` are the
  documented exceptions (regenerable telemetry, never protected).
- The `wisp-slot` version lives in TWO files (`plugins/slot/.claude-plugin/plugin.json` +
  `.claude-plugin/marketplace.json`) — now 1.7.4 in both.
- `.context/` commits go to main, never a ticket branch — **and see the unpushed-main trap above.**
- No PR CI — only `release.yml` on tag `v*`; the local gate *is* the gate.

Reference clones (both outside the repo, both re-clonable): `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`)
and `D:\scratch\traycer` (shallow, 2026-08-14). **#204 checked both for usage endpoints and neither has
one** — traycer's open `protocol` package is fixtures against `example.com` with the host closed. The real
endpoints came from the vendors' own shipped clients (the Claude CLI bundle and `codex.exe`), which is the
place to look next time.

## Related

- [[active-work]]
- [[overview]]
- [[quota-recon]]
- [[2026-08-14-the-usage-endpoint-is-the-same-ledger-reached-without-a-turn]]
- [[a-new-quota-source-is-cheapest-to-validate-against-one-already-trusted]]
- [[the-usage-payload-names-most-of-its-buckets-in-unstable-codenames]]
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
