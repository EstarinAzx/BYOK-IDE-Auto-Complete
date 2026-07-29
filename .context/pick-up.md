---
type: pick-up
project: wisp
updated: 2026-07-30
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-30, relay leg 6): #192 CUT, NOT PUBLISHED.** PR **#198** (`c49532c`) bumps the TUI
package to **2.0.41** and writes its changelog. Gate: **1009/1009 vitest**, `bun run compile` clean in **both**
packages.

**Leg 6 held at the tag push; the maintainer then waved the hold off. #192 is `ready-for-agent` again and
relay leg 7 is spawned to publish.**

## Queue: #192 — the release. **Publishing is AUTHORIZED.**

**⚠ DO NOT RESTART #192. PR #198 already exists and is yours — RESUME it.** The ticket-loop idempotency guard
(step 4) fires on branch `ticket/192-antigravity-release`; the correct response is **resume**, *not* "comment
on the collision and relabel `ready-for-human`". Relabelling here stalls the release for nothing.

The hold that stopped leg 6 was a judgement call carried from leg 5, not something #192 asks for. It has been
lifted explicitly. **Merging PR #198 and pushing the `v2.0.41` tag — which publishes publicly and permanently
to npm — is expected of this leg.** #192's newest comment (`issuecomment-5117931020`) carries the same
instructions.

### Order of operations

1. **Merge** — `gh pr merge 198 --squash --repo EstarinAzx/Wisp-Router`. Then re-run the gate on merged
   `main`: `bun run test` **and** `bun run compile` in **both** packages (root + `packages/tui`).
2. **Tag** — `git checkout main && git pull && git tag v2.0.41 && git push origin v2.0.41`. The tag must equal
   `packages/tui/package.json` **exactly**; `release.yml` verifies it and fails loud otherwise.
3. **Watch `release.yml`** across **all four** runners (win32-x64, darwin-arm64, darwin-x64, linux-x64).
   Platform packages publish **best-effort** — npm's spam filter has 403'd them before, and the shim falls
   back to the GitHub release download. Only the **thin shell** must land.
4. **Verify past the registry read** — install into a scratch dir and **execute the bins**. A read alone
   passes on a broken build.
5. **Install 2.0.40 as a control and confirm it FAILS** the check 2.0.41 passes
   ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]). Suggested credential-free control:
   aim a family route at an Antigravity target — that provider id does not exist on 2.0.40. Any control works
   so long as the **old version fails**.
6. **npm 404 on a version its own job just published = propagation lag.** Check the job log + dist-tags, then
   retry. Do **not** re-tag.
7. **Close #192 and spec #185.** Clear #192's `ready-for-agent` label by hand — a `Closes #N` merge closes but
   does not relabel, and the next frontier query would re-pick it.
8. **Label #197 `ready-for-agent`** — the last act. It is unlabelled on purpose, blocked on this publish.

Then the queue is dry → stop, no leg 8.

## What #192 found: the ticket's own premise was wrong

#192's body states *"the extension face gets nothing from this release."* **It does.**

`git log v2.0.40..main -- packages/vscode/` returns **`ba8dab3` (#188)** and **`c6f644a` (#189)**:

- `extension.ts` constructs **`AntigravityAuth`** so the Bridge can refresh the bundle and bootstrap the Cloud
  Code project.
- It passes `antigravitySignedIn` / `antigravityCreds` into **its own** `createBridgeServer` — **that face
  hosts the Bridge too**, so a user who never installs npm still reaches Antigravity through both doors.
- The panel renders the `antigravity-oauth` row with a truthful signed-in status off the shared `auth.json`.

It bundles its own `@wisp/core`, so **no npm version delivers any of it.** Owed bump filed as **#197** (vsix
1.11.0), deliberately **unlabelled** — labels are the only real gate, and labelling it now would hand the next
leg the extension release before the npm cut it depends on had merged.

`plugins/` was genuinely untouched → `wisp-slot` stays at **1.6.0**, evidence-backed rather than assumed.

Full reasoning: [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]].

## What is in PR #198

Two files, the same shape as every prior release cut on this repo:

- `packages/tui/package.json` — **2.0.40 → 2.0.41**. The workflow verifies the tag equals this exactly and
  fails loud otherwise; it is the single version source.
- `packages/tui/CHANGELOG.md` — the 2.0.41 entry with its **`### Surfaces`** section.

**No code changed.** Everything being released is already on `main`: `e04f53b`, `63453e0`, `ba8dab3`,
`c6f644a`, `6a7e0fe`, `915d415`.

## Released state

| Face | Version | Missing |
|---|---|---|
| npm `wisp-router` | **2.0.40** | #187–#191 — **2.0.41 is cut and waiting on the tag** |
| `wisp` vsix | **1.10.1** | **Antigravity (#187–#191) — bump owed, tracked as #197**; also still **packaged, not installed** |
| `wisp-slot` plugin | **1.6.0** | nothing — untouched by #185 |

## Waiting on the user

- **Publish 2.0.41** (above) — the only thing blocking spec #185.
- **Dismiss the two secret-scanning alerts** as "won't fix" —
  [#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
  [#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2). Settled as
  acceptable ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]); noise now.
- **A local Bridge access secret was printed to a session log** during #191's live run. Loopback-only, never
  entered the repo. To rotate: delete `bridgeSecret` from `~/.wisp/auth.json` and start any host. Low urgency.
- **Install `packages/vscode/wisp-1.10.1.vsix`** — not on the marketplace, so that face lacks #182 until
  installed by hand. #197 will supersede this with 1.11.0.
- **#170** — needs a **Kimi Code subscription**.
- **#189's last criterion** — a Claude-model turn *completing* on Antigravity, after the quota resets
  `2026-07-30T20:55:48Z`. Not blocking anything.

## Landmines

Release:

- **An npm version can never be republished.** The tag is the trigger; there is no undo.
- **The tag must equal `packages/tui/package.json` exactly** — `release.yml` verifies it and fails loud.
- **A fix release is not verified until the OLD version FAILS the same check.**
  [[verifying-a-fix-release-needs-the-previous-version-as-a-control]].
- **npm is one of THREE faces.** Every release entry carries `### Surfaces`, and that section is **derived from
  `git log <last-tag>..main -- <face-path>`, never copied from the ticket** —
  [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]].
- **A vsix is evidence only when checked in the BUNDLE** — unzip it and grep `extension/dist/extension.js`.
- **Platform packages publish best-effort; the thin shell hard-fails.** The shim's release-download fallback
  covers installs either way.
- **`## Blocked by` is body text, not native tracker links** — a frontier query cannot see it. **Labels are
  the only real gate.**
- **A closed-by-PR issue keeps its `ready-for-agent` label.** `Closes #N` closes but does not relabel.

Antigravity:

- **A new Provider kind means TWO places.** The executor record is the OpenAI door; the
  `startProviderStream` chain is the Anthropic door, and it is **not** a delegation to the record.
  [[the-anthropic-door-does-not-use-the-executor-records]].
- **The FULL system rides on this wire, never `systemSplit.stable`.** That split places a cache breakpoint this
  wire does not have, so `stable` alone is the system prompt with its tail deleted — and nothing errors.
- **`thoughtSignature` is not an Anthropic thinking signature.** It is this wire's replay token, and there is
  no replay path (`AntigravityTurn` has no `rawContent`).
- **The 429 verdict is carried on the Error, never sniffed from the message.** A declined 429 and a classified
  one use the *same words*; a message-matching `classify` passes 990/991 and silently kills the bounded retry.
  [[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]].
- **The two cooldown channels are separate maps on purpose.** `noteQuotaWindow`/`noteUsageLimit` write
  `usageUntil`; `noteTransient` writes `transientUntil`; `coolingUntil` reports the later.
- **A cooling Antigravity has no fallback for a Gemini model name** — `withCooldownFallback` re-aims *family*
  matches only, and a family match is a `claude-*` id by construction. Recorded and pinned, not a bug to fix.
- **SSE framing here is CRLF.** `sseBlocks` is CRLF-tolerant — do not "simplify" it back to `'\n\n'`.
- **⚠ A GREEN SUITE DID NOT CATCH A DEAD PROVIDER.** #189's first live turn returned an EMPTY answer at HTTP
  200 with 971/971 passing. **Drive at least one real turn before calling a Provider ticket done.**
- **⚠ AND THE CONVERSE: a live NEGATIVE is usually your fixture or the model, not the code.** A hand-written
  base64 PNG is not an image; `gemini-3.1-pro-low` declines tool calls at random. Capture the sent body before
  believing a failure; use a real image from `docs/`; drive tool round trips on `gemini-3-flash`.
  [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]].
- **`controller.error()` discards queued chunks** — error from `pull` on the next turn instead.
  [[readablestream-error-discards-the-queued-chunks]].
- **A live 401 does NOT validate the request body.** Google authenticates before it validates.
- **Never mint opaque provider-side tool ids.** Absent upstream ⇒ an **empty** id. Real ids look like
  `noxjacvf`, `i7j25lmi`.
- **The throw shape is a CONTRACT.** `isTransientProviderError` regexes `String(err)` for
  `API error (429|500|502|503|504)`. A "tidier" message silently gets **zero** retries.
- **The schema cleaner is safe because of its WALKER, not only its scope.** The change that re-arms the
  reference's production bug is *"simplify `mapSchema` to a generic deep walk"*, and **no single test catches
  it**. [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]].
- **The session id is content-derived, not a nonce.**
- **Tool results ride their own content, AHEAD of the turn text.**
- **The two hosts are not interchangeable.** Project bootstrap → **production**; turns → **daily**.
- **The transport fork is deliberately NOT ported** — both Bridge runtimes already negotiate `http/1.1`.
- **The model catalog is advisory.** Known-good: `gemini-3.1-pro-low`, `gemini-2.5-flash`, `gemini-3-flash`,
  `gemini-3.6-flash-low`, `gemini-3.6-flash-high`, `gemini-pro-agent`.
- **⚠ Claude quota on Antigravity exhausted until `2026-07-30T20:55:48Z`.** A 429 on a Claude model there is
  the ACCOUNT, not the code. Gemini is unaffected.
- **Credits' cooldown ledger is harmful with one credential** — do not helpfully port it.

Credential hygiene ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]):

- **Never write account-identifying values into this repo.** Tests use `example-project-1`. The spike fixtures
  at `D:\scratch\antigravity-spike\out\` carry the real project id; `tokens.json` /
  `.tokens-SECRET.json` there are **live credentials** — never read, never copy.
- **Never commit a token.** Anything credential-shaped bound for this PUBLIC repo is a question for the
  maintainer, not a default.
- **A live check runs in a sandboxed `WISP_HOME`** — `mktemp -d`, **copy** (never read) `~/.wisp/auth.json` in,
  write a sandbox `config.json`, spare port.
  [[live-verify-the-bridge-from-source-isolated-wisp-home-on-a-spare-port]].
  ⚠ `pkill -f "index.tsx serve"` did **not** kill the sandbox host — find it by port, stop that pid, then
  confirm 41184 is still alive.

General:

- **A store file that does not parse is no longer overwritten — `merge` refuses (#182, ADR-0004).**
- **`writeConfig` / `writeAuth` can throw, and always could.** ~35 call sites tolerate it.
- **RUN `bun run compile` IN BOTH PACKAGES** — root (`packages/vscode`) and `packages/tui`. `packages/core` has
  no `compile` script (it is `typecheck`). The test gate is **`bun run test`** (vitest) — bare `bun test` runs
  Bun's own runner and reports ~53 bogus failures.
- **The `wisp-slot` version lives in TWO files** — `plugins/slot/.claude-plugin/plugin.json` **and**
  `.claude-plugin/marketplace.json`.
- **Never verify usage from `status.json`** — it is global.
  [[status-json-is-global-so-it-cannot-observe-another-session]].
- **`.context/` commits go to main, never a ticket branch.**
- **This repo has no PR CI** — only `release.yml` on tag `v*`. The local gate *is* the gate.

Reference clone for #185 lives at `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`, re-clonable, outside the repo).

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-30-the-antigravity-arm-is-not-a-copy-of-the-anthropic-arm]]
- [[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
- [[2026-07-29-a-retyped-sse-fixture-cannot-catch-a-crlf-framing-bug]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]]
- [[2026-07-29-antigravity-narrow-port-never-mint-opaque-tool-ids]]
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[readablestream-error-discards-the-queued-chunks]]
- [[live-verify-the-bridge-from-source-isolated-wisp-home-on-a-spare-port]]
