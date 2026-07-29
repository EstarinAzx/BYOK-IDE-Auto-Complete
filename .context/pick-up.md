---
type: pick-up
project: wisp
updated: 2026-07-30
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-30, relay leg 4): #190 LANDED.** Squash-merged as **`6a7e0fe`** on main via PR #195; #190 closed, branch deleted. Gate re-verified on merged main: **991/991 vitest** (971 before), compile clean **both** packages. Verified **live** against a real quota-exhausted 429.

## Queue: #191 is the only armed ticket

Run **`/relay N=1 /preset ticket-loop`**. It takes **#191** (the Anthropic door — Claude Code driven by Gemini), then **#192**, which closes spec #185.

## What #190 landed (on main, `6a7e0fe`)

Every executor record returned `undefined` from `classify`, so **every** rate limit on **every** Provider left the Bridge as a 502 — a gateway fault, which is neither what happened nor something a client can act on. Antigravity is the first record to say **429**.

- `antigravity.ts` — `antigravity429Failure` builds #166's four-field failure shape plus, for a spent window, `cooldownSeconds` from the horizon the server stated. `antigravityApiError` **attaches it to the thrown Error**; `antigravityFailureOf` reads it back. `antigravity429Error` survives as the `{status, message}` view, so #187's pins hold.
- `routing.ts` — `ProviderCooldowns.noteQuotaWindow(id, seconds)`: a **second door onto the same long channel** for a record that classified the failure itself. `parseUsageLimitReset` untouched.
- `bridgeServer.ts` — the record's `classify` hook, and `noteProviderError` seeding the quota window *before* the blip streak.

### The design call worth knowing before touching it

**The verdict rides ON the thrown Error, not in its message** — deliberately breaking the house style, because for this Provider the message cannot round-trip it. A 429 the pure layer **declined** renders as `Antigravity API error 429: <raw upstream body>`, and that body says `RESOURCE_EXHAUSTED` / `RATE_LIMIT_EXCEEDED` **exactly like a classified one**. They differ by a number that was parsed and then thrown away.

Guessing is asymmetric: guessing "declined" wastes two retries then answers right; guessing **"classified" kills the bounded retry** and loses a turn to a rate limit that had already expired.

**The control is the whole argument.** Swapping in the natural message classifier leaves **990 of 991 green**, failing only `leaves a below-threshold 429 to the bounded retry`. Every "does it answer 429" test passes, because the wrong implementation answers 429 for everything — so the test that pins this is the one asserting a **non**-classification. [[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]]

### Verified live — and the horizon checks out independently

A real turn at `claude-sonnet-4-6` against the real daily host returned `Antigravity API error 429: QUOTA_EXHAUSTED`, carrying `status 429`, `code antigravity_quota_exhausted`, `type rate_limit_error`, **`cooldownSeconds: 118540`**.

The probe ran at `2026-07-29T12:00:28Z` — **118,548s** before the reset #189 independently recorded (`2026-07-30T20:55:48Z`). The code read **118,540**. The gap is the request's own latency, so that is genuinely the server's stated window. Happy path unaffected: the same probe at `gemini-3.1-pro-low` completed a real streamed turn.

## What #191 actually has to do — read this first

**The Anthropic door does not use the executor records at all.** #167 unified the *OpenAI* door onto one `ProviderExecutor` record per kind and left this one alone: `startProviderStream` carries its own hand-written chain — codex → anthropic → xai → keyed — and never consults `providerExecutors`. Antigravity is simply not in it, so `/v1/messages` on this Provider falls through to the keyed tail and answers `400 has no API key configured` — which reads like a config mistake and is a missing arm.

So the work is **one arm**, not a subsystem. Three things follow:

- **The 429 answer comes for free.** Both doors answer through the one shared `failProviderRequest`, which reads `executorFor(provider).classify`. #190's classification is already door-neutral. Do **not** re-implement it.
- **The door carries wire behaviour the records do not** — the #139 system split, the #156 diagnosis chain, vision/documents, non-strict tools. That is exactly why #167 left it alone, and the new arm must respect it rather than delegate to the record.
- **Drive the door, not the record.** The gap was unit-invisible: `bridgeServer.test.ts` had no Antigravity case at all before #190, and every OpenAI-door test passes with the arm absent. [[the-anthropic-door-does-not-use-the-executor-records]]

Also open on #191 specifically: **does the upstream accept vision or document input?** #186 said yes to both (vision *and* PDF); the Anthropic door carries both, and #191 must record what actually happens.

⚠ **#191 cannot be fully verified on a Claude model until `2026-07-30T20:55:48Z`** — that quota is still exhausted (it is what let #190 verify its own 429 live). Gemini models are unaffected, and "Claude Code driven by Gemini" is the ticket's own framing, so this is not a blocker.

## Waiting on the user

- **Dismiss the two secret-scanning alerts** as "won't fix" —
  [#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
  [#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2). Settled as acceptable
  ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]); noise now.
- **Install `packages/vscode/wisp-1.10.1.vsix`** — not on the marketplace, so that face lacks #182 until installed by hand.
- **#170** — needs a **Kimi Code subscription**.
- **#189's last criterion** — a Claude-model turn *completing* on Antigravity, after the quota resets `2026-07-30T20:55:48Z`. Not blocking anything.

## Released state — nothing owed

| Face | Version | Missing |
|---|---|---|
| npm `wisp-router` | **2.0.40** | nothing — #187–#190 are unreleased core; #192 ships the spec |
| `wisp` vsix | **1.10.1** | nothing — but **packaged, not installed** |
| `wisp-slot` plugin | **1.6.0** | nothing |

## Landmines

Antigravity:

- **The 429 verdict is carried on the Error, never sniffed from the message.** A declined 429 and a classified one use the *same words*. A "tidier" message-matching `classify` passes 990/991 tests and silently kills the bounded retry. [[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]]
- **The two cooldown channels are separate maps on purpose.** `noteQuotaWindow` and `noteUsageLimit` write `usageUntil`; `noteTransient` writes `transientUntil`; `coolingUntil` reports the later. Collapsing them lets a blip sideline a Provider for days, or a six-day window be cut to seconds.
- **A cooling Antigravity has no fallback for a Gemini model name** — `withCooldownFallback` re-aims *family* matches only, and a family match is a `claude-*` id by construction. Recorded and pinned by #190, not a bug to "fix".
- **SSE framing here is CRLF.** `sseBlocks` is CRLF-tolerant — do not "simplify" it back to a plain `'\n\n'` split.
- **A live 401 does NOT validate the request body.** Google authenticates before it validates, so an auth failure proves URL/method/headers only.
- **Never mint opaque provider-side tool ids.** The upstream's own `functionCall.id` passes through untouched; absent upstream ⇒ an **empty** id, never a minted one. Confirmed live: real ids look like `noxjacvf`.
- **The throw shape is a CONTRACT.** `isTransientProviderError` regexes `String(err)` for `API error (429|500|502|503|504)`. Any "tidier" message silently gets **zero** retries. #190's carrier is additive precisely so this still holds.
- **The schema cleaner is safe because of its WALKER, not only its scope.** [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]]. The change that re-arms the reference's production bug is *"simplify `mapSchema` to a generic deep walk"*, and **no single test catches it**.
- **The session id is content-derived, not a nonce.** #189's random fallback resolves AFTER the stable id on purpose.
- **Tool results ride their own content, AHEAD of the turn text.** The pairing validator forbids call and response parts in one content and wants the response content directly after the calls.
- **The two hosts are not interchangeable.** Project bootstrap → **production**; turns → **daily**. A 429 walks BOTH before it surfaces, so one attempt is two upstream calls.
- **The transport fork is deliberately NOT ported** — both Bridge runtimes already negotiate `http/1.1` (measured).
- **The model catalog is advisory.** A row listed `recommended: true` can 400 on every shape. Known-good: `gemini-3.1-pro-low`, `gemini-2.5-flash`, `gemini-3-flash`, `gemini-3.6-flash-low`, `gemini-3.6-flash-high`, `gemini-pro-agent`.
- **Credits' cooldown ledger is harmful with one credential** — the reference consults it *before sending*, so a single benched credential 429s itself. Out of scope; do not helpfully port it.

Credential hygiene ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]):

- **Never write account-identifying values into this repo.** The spike fixtures at `D:\scratch\antigravity-spike\out\` carry the real project id — scrub to `example-project-1` before using those bytes. `tokens.json` / `.tokens-SECRET.json` there are **live credentials**: never read, never copy.
- **Never commit a token.** Anything credential-shaped bound for this PUBLIC repo is a question for the maintainer, not a default.
- **A test run that touches `~/.wisp` restores it.** #190's live probe read `auth.json` in-process and wrote nothing at all — no server, no port, no config write — which is the cheapest shape for a live check.

General:

- **A store file that does not parse is no longer overwritten — `merge` refuses (#182, ADR-0004).**
- **`writeConfig` / `writeAuth` can throw, and always could.** ~35 call sites tolerate it.
- **A fix release is not verified until the OLD version FAILS the same check.** [[verifying-a-fix-release-needs-the-previous-version-as-a-control]].
- **A vsix is evidence only when checked in the BUNDLE** — unzip it and grep `extension/dist/extension.js`.
- **RUN `bun run compile` IN BOTH PACKAGES.** The root script only covers `packages/vscode`. The test gate is **`bun run test`** (vitest) — bare `bun test` runs Bun's own runner and reports ~53 bogus failures.
- **npm is one of THREE faces.** Every release entry carries `### Surfaces`. [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]].
- **The `wisp-slot` version lives in TWO files** — `plugins/slot/.claude-plugin/plugin.json` **and** `.claude-plugin/marketplace.json`.
- **Never verify usage from `status.json`** — it is global. [[status-json-is-global-so-it-cannot-observe-another-session]].
- **`## Blocked by` is body text, not native tracker links** — a frontier query cannot see it. **Labels are the only real gate.**
- **`.context/` commits go to main, never a ticket branch.**

Reference clone for #185 lives at `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`, re-clonable, outside the repo).

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]]
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
