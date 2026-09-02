---
type: pick-up
project: wisp
updated: 2026-09-02
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Latest (2026-09-02): 2.0.46 + vsix 1.13.1 are SHIPPED, verified and installed. Nothing is owed in the
repo.**

A user report — a newly released Claude model was selectable in Wisp but 502'd on every turn — traced
to Wisp's **own** pinned client version, not the user's Claude Code. `claude-fable-5-1` (released
2026-09-01) demands `claude-cli` **2.1.251**; Wisp had claimed **2.1.219** since 2026-07-25. Fixed both
pins that a Claude release makes stale, cut and verified both faces
([[2026-09-02-the-advertised-claude-cli-version-is-a-per-model-floor]]).

- `anthropicClient.ts:113` — `CLAUDE_CODE_VERSION` → **2.1.258**
- `routingScreens.tsx:54` — the one-tap bind table's `fable` → **`claude-fable-5-1`** (it was silently
  downgrading a working route)

Shipped straight on main (`ad57f34` fix + `58e9d7f` release — no ticket, user-authorized cut), tag
`v2.0.46`, run `33592983325` green on all five jobs, npm `latest`, vsix built and installed.

## ⚠ First thing to check if the user says it is still broken

**It is the stale process, not the fix.** Two `wisp` PIDs (**6328**, **27788**) were still serving the
old image at the end of the session — npm pruned the old platform binary out from under them and they
kept running from memory ([[an-upgraded-package-does-not-touch-the-process-already-running]]).
Restarting is the **user's call**: a bridged Claude Code session is talking to that very process, so
killing it cuts the connection the session runs on. The editor face is separate — a VS Code window
reload picks up 1.13.1.

## Queue: empty

`gh issue list --label ready-for-agent --state open` → `[]` at the cut. **Verify by query, not by this
note** ([[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]).

Open but deliberately **not** agent-ready: **#207** (active quota probe — blocked on three scoping
calls), **#69**, **#163**.

## 2.0.46 — cut, published, verified

`wisp-router@2.0.46` is npm `latest`; GitHub release `v2.0.46` carries all four platform binaries; vsix
1.13.1 built and installed. Verified past the registry read on **both** faces, each against its
predecessor as a failing control:

| marker | npm 2.0.46 / 2.0.45 | vsix 1.13.1 / 1.13.0 |
|---|---|---|
| `2.1.258` | 1 / 0 | 1 / 0 |
| `2.1.219` | 0 / 1 | 0 / 1 |
| `claude-fable-5-1` | 1 / 0 | — (TUI-only) |
| `claude-cli/` | 1 / 1 | 1 / 1 |
| `fetchAntigravityModels` / `thinkingLevel` | 2 / 2 | 5 / 5 |

`2.1.219` going **0/1** while `2.1.258` goes **1/0** is a proven *swap*, which is stronger evidence
than a one-way marker; the bottom rows are the shared controls.

**Unlike 2.0.45, the wire itself was driven** — three cells, one variable: `claude-fable-5-1` 400 at
2.1.219 (naming the 2.1.251 floor) and 200 at 2.1.258, with `claude-opus-5` at 2.1.219 as a must-pass
control. The `anthropic-beta` list rode both cells unchanged, so no beta token was implicated.

Worth knowing before the next cut:

- **Surfaces derived at the cut** from `git log v2.0.45..main -- <face-path>`: one commit touching
  `packages/core` **and** `packages/tui`; `packages/vscode` had **zero** commits — but core is a
  bundled dependency, so the extension carries the pin anyway
  ([[a-bundled-dependency-is-not-a-face-but-every-face-carries-it]]). The two faces shipped **different
  subsets**: npm got both fixes, the vsix got the version pin only.
- **Patch on both faces**, following the **1.10.1 / 2.0.40** precedent for a bundled-core fix cut
  across both — not the minor-bump pattern of the last three releases.
- **The platform npm packages 404 and that is normal** — 2.0.46's did, and the shim fell back to the
  GitHub release binary under `~/.wisp/bin/v2.0.46/`. 2.0.45's had resolved cleanly; do not read either
  outcome as the 404s being fixed.

## ⚠ Read before cutting a ticket branch

**`git rev-list --left-right --count origin/main...main` — the right-hand number must be 0.**

A branch cut from an unpushed main sweeps those commits into its own squash-merge (`3465c7c`, #202).
This session ran the guard and pushed everything, so origin is current. Full trap:
[[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]].

## Waiting on the user

- **Restart the Bridge** (PIDs 6328 / 27788) so 2.0.46 goes live. See the warning above.
- **#207's three scoping calls** before it can be labelled `ready-for-agent`: poll **cadence**;
  **precedence** when a poll and a turn header disagree; **opt-in or always-on**.
- **Dismiss the two secret-scanning alerts** as "won't fix" —
  [#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
  [#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2).
- **Bridge access secret rotation** — delete `bridgeSecret` from `~/.wisp/auth.json`, start any host.
- **#170** — needs a **Kimi Code subscription**.
- **#189's last criterion** — note a completing Antigravity Claude-model turn on closed #189 when
  observed.
- **~20 stale local `ticket/*` branches** (`git branch --list 'ticket/*'`). Cleanup, not a blocker.
- **`.context/Untitled.canvas`** — untracked user file, left uncommitted; keep or remove is the user's
  call.
- Optional one-liner: `ANTHROPIC_MODELS` (`anthropic.ts:122`, the **offline fallback** list) still knows
  only `claude-fable-5`. Deliberately skipped — unreachable while models.dev answers.
- Optional: `/plugin update wisp-slot` to refresh the cached skill/hook copies to 1.7.4
  ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]).

## Landmines (durable — keep carrying)

Anthropic client pin (new, 2026-09-02):

- **The version in a `claude_code_version_too_old` 400 is WISP'S, not the user's Claude Code.** The
  error's own remedy ("run `claude update`") is advice for the wrong machine
  ([[a-live-picker-in-front-of-a-pinned-client-fingerprint-drifts-apart]]).
- **A Claude release makes TWO pins stale, in different packages** — `CLAUDE_CODE_VERSION` (loud, 400s) and
  `CLAUDE_FAMILY_MODELS` (silent, downgrades a route). Check both; they now comment each other.
- **Never read "it appears in the picker" as evidence a model works** — the dropdown is live, the
  fingerprint is pinned, and they drift apart between releases by construction.
- **`withFamilyRoute` validates the providerId ONLY, never the model** — a stale bind table can never
  be refused on the way in.
- **"Released + installed + verified" is not "the fix is live"**
  ([[an-upgraded-package-does-not-touch-the-process-already-running]]).

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
- **Prove a wire by driving it** — throwaway probes under gitignored `out/`; delete after. (Did exactly
  this for 2.0.46; it turned a blocking question into a two-minute answer.)
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
- **Best evidence is a SWAP** — an old marker going 0-in-new alongside a new marker going 0-in-old beats
  a one-way present/absent check, and still needs a shared control
  ([[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]).
- **Every release entry carries `### Surfaces`, derived from `git log <last-tag>..main -- <face-path>`**
  ([[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]).
- **Labels are the only real gate**; a closed-by-PR issue keeps its `ready-for-agent` label — clear it
  by hand.

Antigravity (full detail in memory notes):

- Two doors, two places ([[the-anthropic-door-does-not-use-the-executor-records]]). FULL system on this
  wire, never `systemSplit.stable`. 429 verdict rides ON the Error. Throw shape is a CONTRACT. SSE
  framing is CRLF. Turns → daily host, `loadCodeAssist` → production. Never mint opaque provider-side
  tool ids.
- **Effort reaches ONLY the `-tiered` rows, since 2.0.45**
  ([[2026-08-14-antigravity-effort-reaches-only-the-tiered-rows]]). A **suffix shape test**, never a
  pinned list. `xhigh`/`max` fold to `high`. Do NOT map effort onto id suffixes and do NOT add the
  Claude `thinkingBudget` path. `applyAntigravityThinkingLevel` runs LAST on purpose.
- **The model list is LIVE since 2.0.44** ([[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]):
  `fetchAntigravityModels`, static `ANTIGRAVITY_MODEL_SPECS` = fallback + caps only. Internal rows
  dropped on shape (`tab_*`, `chat_<digits>`), never pinned ids. Live-listed unknown ids go UNCLAMPED.
- **A green suite did not catch a dead Provider** — drive a real turn
  ([[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]).

Credential hygiene ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]):

- Never write account-identifying values into this repo; tests use `example-project-1`. The spike
  fixtures at `D:\scratch\antigravity-spike\out\` carry live credentials — never read, never copy.
- Anything credential-shaped bound for this PUBLIC repo is a question for the maintainer. Upstream
  error bodies leak too — redact before quoting into a ticket.
- A live-wire probe MAY read `~/.wisp/auth.json` for a bearer (read-only, gitignored `out/`, deleted
  after) — say so in the evidence, and redact emails/uuids on the VALUE when printing responses.

General:

- **`packages/core` has NO `compile` script** — gate is `bun run --cwd packages/core typecheck`; only
  `packages/tui` and `packages/vscode` have `compile`. Test gate is **`bun run test`** (vitest, now
  1036) — bare `bun test` runs Bun's runner, bogus failures. `packages/tui/tests/` is the **bun runner**
  (28), run explicitly. There is no root `typecheck` script.
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
and `D:\scratch\traycer` (shallow, 2026-08-14). The vendors' own shipped clients remain the place to
look for endpoint shapes.

## Related

- [[active-work]]
- [[overview]]
- [[decisions]]
- [[gotchas]]
- [[flows]]
- [[2026-09-02-the-advertised-claude-cli-version-is-a-per-model-floor]]
- [[a-live-picker-in-front-of-a-pinned-client-fingerprint-drifts-apart]]
- [[an-upgraded-package-does-not-touch-the-process-already-running]]
- [[2026-08-14-antigravity-effort-reaches-only-the-tiered-rows]]
- [[a-bundled-dependency-is-not-a-face-but-every-face-carries-it]]
- [[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]
- [[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]
- [[2026-08-14-the-usage-endpoint-is-the-same-ledger-reached-without-a-turn]]
- [[a-new-quota-source-is-cheapest-to-validate-against-one-already-trusted]]
- [[the-usage-payload-names-most-of-its-buckets-in-unstable-codenames]]
- [[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]]
- [[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[a-picked-alias-reaches-the-statusline-prefixed-claude-wisp]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]
- [[loadcodeassist-answers-with-the-account-email-inside-it]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
