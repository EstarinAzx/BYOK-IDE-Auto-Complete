---
type: pick-up
project: wisp
updated: 2026-07-30
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-30, relay leg 5): #191 LANDED.** Squash-merged as **`915d415`** on main via PR #196;
#191 closed, branch deleted, label cleared. Gate re-verified on merged main: **1009/1009 vitest** (991
before), compile clean **both** packages. **Verified live**, including a real Claude Code agent turn through
`claude-wisp` answered by Gemini.

## Queue: #192 is the only armed ticket — and it closes spec #185

Run **`/relay N=1 /preset ticket-loop`**. It takes **#192**, the release.

### ⚠ Read this before working #192

**#192 publishes to npm. That is the one irreversible, outward-facing act in the whole spec** — an npm version
can never be republished, and it is public. Everything else in this chain has been reversible (a merge to the
user's own repo).

**Do all the reversible work first, then hold `ready-for-human` at the tag push.** Concretely: bump the TUI
package version, write the changelog entry with its `### Surfaces` section, file any owed bump on another face
as its own ticket, open the PR — then stop and hand the tag to a human, saying exactly what is ready and what
one command will publish it. Do not push the `v*` tag unattended. If the user says go, finish the ticket's
remaining criteria (workflow green, install past the registry read, previous version as a failing control) and
close #185.

This is a judgement call leg 5 made, not something #192 says. If the user would rather the chain just ship it,
they can say so and the hold disappears.

### What #192 asks for

- Version bumped in the TUI package; the release tag matches **exactly**
- Changelog entry with a **`### Surfaces`** section naming which of the **three** faces gets this work and
  which does not. Antigravity is core + the TUI face; **the extension face gets nothing, and that must be
  stated**, with any owed bump filed as its own ticket in the same pass
- Release workflow green across all runners
- Published version verified **past the registry read** — a real install into a scratch dir, bins executed
- The **previous** published version installed as a control and **failing** a check the new one passes
  ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]])
- npm 404 on a version its own publish job just succeeded on = propagation lag; check the job log + dist-tags,
  retry
- Spec **#185 closed** once this lands

## What #191 landed (on main, `915d415`)

The Anthropic door does **not** shape requests through the executor records — `startProviderStream` carries its
own hand-rolled per-kind chain, because the door owns wire behaviour the records cannot express (the #139
system split, the #156 diagnosis chain, vision/documents, non-strict tools). It ran codex → anthropic → xai →
keyed, so Antigravity fell through to the keyed tail and answered `400 has no API key configured` — a missing
arm wearing a config mistake's error message. Now: codex → anthropic → xai → **antigravity** → keyed.

- `bridgeServer.ts` — the arm: creds check, image refusal (the same string the other door uses), turn mapping,
  `antigravityStream`.
- `antigravity.ts` — thought parts ride the **thinking** channel; **documents** ride as `inlineData` beside
  images.

**Inherited, not rebuilt:** the 429 (both doors answer through the one `failProviderRequest`) and the retry
boundary (`openPrimed` wraps the eager base pass only). The arm carries neither.

**Four deliberate divergences from the arm above it** —
[[2026-07-30-the-antigravity-arm-is-not-a-copy-of-the-anthropic-arm]]. The one most likely to be "tidied" back:
**the FULL system rides, not `systemSplit.stable`**. That split places a cache breakpoint this wire does not
have, so `stable` alone is the system prompt with its tail deleted, and nothing errors when you drop it.

**Verified live** (sandboxed `WISP_HOME`; real `~/.wisp` config + auth never written): streamed turn; tool
round trip on the upstream's own id `i7j25lmi` answered from the tool's content; vision on a real PNG; a PDF
read back; family route + Alias both answering; image row refused; `claude-wisp-antigravity` listed. **Claude
Code through `claude-wisp` completed a real agent turn** — a Read tool call and its result — answered by
Gemini, both door calls logged routing to `antigravity`.

**#185's open question is answered: this upstream accepts BOTH vision and document input.**

## Waiting on the user

- **A local Bridge access secret was printed to a session log** during #191's live run (`wisp serve` prints it
  on start). It is loopback-only and never entered the repo, but if you want it rotated: delete `bridgeSecret`
  from `~/.wisp/auth.json` and start any host — it regenerates. Low urgency, mentioned for completeness.
- **Dismiss the two secret-scanning alerts** as "won't fix" —
  [#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
  [#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2). Settled as
  acceptable ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]); noise now.
- **Install `packages/vscode/wisp-1.10.1.vsix`** — not on the marketplace, so that face lacks #182 until
  installed by hand.
- **#170** — needs a **Kimi Code subscription**.
- **#189's last criterion** — a Claude-model turn *completing* on Antigravity, after the quota resets
  `2026-07-30T20:55:48Z`. Not blocking anything.

## Released state — nothing owed yet

| Face | Version | Missing |
|---|---|---|
| npm `wisp-router` | **2.0.40** | #187–#191 are unreleased core — **#192 ships them** |
| `wisp` vsix | **1.10.1** | nothing — but **packaged, not installed**; gets nothing from #192 |
| `wisp-slot` plugin | **1.6.0** | nothing |

## Landmines

Antigravity:

- **A new Provider kind means TWO places.** The executor record is the OpenAI door; the
  `startProviderStream` chain is the Anthropic door, and it is **not** a delegation to the record.
  [[the-anthropic-door-does-not-use-the-executor-records]].
- **The FULL system rides on this wire, never `systemSplit.stable`.** See above — silent when broken.
- **`thoughtSignature` is not an Anthropic thinking signature.** Do not "connect" them: it is this wire's
  replay token, and there is no replay path (`AntigravityTurn` has no `rawContent`).
- **The 429 verdict is carried on the Error, never sniffed from the message.** A declined 429 and a classified
  one use the *same words*. A message-matching `classify` passes 990/991 and silently kills the bounded retry.
  [[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]].
- **The two cooldown channels are separate maps on purpose.** `noteQuotaWindow`/`noteUsageLimit` write
  `usageUntil`; `noteTransient` writes `transientUntil`; `coolingUntil` reports the later.
- **A cooling Antigravity has no fallback for a Gemini model name** — `withCooldownFallback` re-aims *family*
  matches only, and a family match is a `claude-*` id by construction. Recorded and pinned, not a bug to fix.
- **SSE framing here is CRLF.** `sseBlocks` is CRLF-tolerant — do not "simplify" it back to `'\n\n'`.
- **A live NEGATIVE is usually your fixture or the model, not the door.** A hand-written base64 PNG is not an
  image (the upstream 400s it, reading exactly like "vision refused"); `gemini-3.1-pro-low` declines tool
  calls at random while the declarations are on the wire. Capture the sent body before believing a failure;
  use a real image from `docs/`; drive tool round trips on `gemini-3-flash`.
  [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]].
- **`controller.error()` discards queued chunks** — a stream fixture that enqueues and errors in the same tick
  delivers nothing. Error from `pull` on the next turn instead.
  [[readablestream-error-discards-the-queued-chunks]].
- **A live 401 does NOT validate the request body.** Google authenticates before it validates.
- **Never mint opaque provider-side tool ids.** Absent upstream ⇒ an **empty** id. Real ids look like
  `noxjacvf`, `i7j25lmi`.
- **The throw shape is a CONTRACT.** `isTransientProviderError` regexes `String(err)` for
  `API error (429|500|502|503|504)`. A "tidier" message silently gets **zero** retries.
- **The schema cleaner is safe because of its WALKER, not only its scope.**
  [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]]. The change that re-arms the
  reference's production bug is *"simplify `mapSchema` to a generic deep walk"*, and **no single test catches
  it**.
- **The session id is content-derived, not a nonce.**
- **Tool results ride their own content, AHEAD of the turn text.**
- **The two hosts are not interchangeable.** Project bootstrap → **production**; turns → **daily**. A 429
  walks BOTH, so one attempt is two upstream calls — but a generic 503 surfaces on the first host.
- **The transport fork is deliberately NOT ported** — both Bridge runtimes already negotiate `http/1.1`.
- **The model catalog is advisory.** Known-good: `gemini-3.1-pro-low`, `gemini-2.5-flash`, `gemini-3-flash`,
  `gemini-3.6-flash-low`, `gemini-3.6-flash-high`, `gemini-pro-agent`.
- **Credits' cooldown ledger is harmful with one credential** — do not helpfully port it.

Credential hygiene ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]):

- **Never write account-identifying values into this repo.** Tests use `example-project-1`. The spike fixtures
  at `D:\scratch\antigravity-spike\out\` carry the real project id; `tokens.json` /
  `.tokens-SECRET.json` there are **live credentials** — never read, never copy.
- **Never commit a token.** Anything credential-shaped bound for this PUBLIC repo is a question for the
  maintainer, not a default.
- **A live check runs in a sandboxed `WISP_HOME`.** #191's shape: `mktemp -d`, **copy** (never read)
  `~/.wisp/auth.json` in, write a sandbox `config.json`, point `WISP_HOME` at it, use a spare port. Every
  write — token refresh, bridge secret, the #171 status snapshot — lands in the sandbox, and the real Bridge
  on 41184 keeps serving. [[live-verify-the-bridge-from-source-isolated-wisp-home-on-a-spare-port]].
  ⚠ `pkill -f "index.tsx serve"` did **not** kill the sandbox host — find it by port and stop that pid, and
  check 41184 is still alive afterwards.

General:

- **A store file that does not parse is no longer overwritten — `merge` refuses (#182, ADR-0004).**
- **`writeConfig` / `writeAuth` can throw, and always could.** ~35 call sites tolerate it.
- **A fix release is not verified until the OLD version FAILS the same check.**
  [[verifying-a-fix-release-needs-the-previous-version-as-a-control]].
- **A vsix is evidence only when checked in the BUNDLE** — unzip it and grep `extension/dist/extension.js`.
- **RUN `bun run compile` IN BOTH PACKAGES.** The root script only covers `packages/vscode`. The test gate is
  **`bun run test`** (vitest) — bare `bun test` runs Bun's own runner and reports ~53 bogus failures.
- **npm is one of THREE faces.** Every release entry carries `### Surfaces`.
  [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]].
- **The `wisp-slot` version lives in TWO files** — `plugins/slot/.claude-plugin/plugin.json` **and**
  `.claude-plugin/marketplace.json`.
- **Never verify usage from `status.json`** — it is global.
  [[status-json-is-global-so-it-cannot-observe-another-session]].
- **`## Blocked by` is body text, not native tracker links** — a frontier query cannot see it. **Labels are
  the only real gate.**
- **`.context/` commits go to main, never a ticket branch.**
- **This repo has no PR CI** — only `release.yml` on tag `v*`. The local gate *is* the gate.

Reference clone for #185 lives at `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`, re-clonable, outside the repo).

## Related

- [[active-work]]
- [[overview]]
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
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[readablestream-error-discards-the-queued-chunks]]
- [[live-verify-the-bridge-from-source-isolated-wisp-home-on-a-spare-port]]
