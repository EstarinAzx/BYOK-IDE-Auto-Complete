---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-29, relay leg 3): #189 is BUILT and PUSHED — [PR #194](https://github.com/EstarinAzx/Wisp-Router/pull/194) — held `ready-for-human`, deliberately NOT merged.**

## Queue: EMPTY — one thread, and it needs you

`ready-for-agent` is empty. #189 carries `ready-for-human`. The relay chain stopped on that signal, by design.

**Your move, about five minutes:**

1. `wisp` → **`/signin antigravity`** (browser OAuth on the Google account).
2. `wisp serve`, then the three curl commands in [PR #194](https://github.com/EstarinAzx/Wisp-Router/pull/194) — a models check, a streamed turn, a tool-calling turn.
3. Streamed text on the second, and a `tool_calls` entry whose `id` is the upstream's own on the third → **merge #194**, then label **#190 AND #191 together** and re-run `/relay N=1 /preset ticket-loop`.

Anything wrong → comment the finding on #189, leave the label, don't merge.

## Why #189 was held rather than merged

The gate is green — **969/969 vitest** (905 before), `bun run compile` clean in **both** packages — and everything checkable without a browser was checked. But the ticket's **headline** criterion, "a real streamed turn completes", needs an OAuth round trip that cannot run unattended, and **#190 and #191 build straight on it**. Merging would put an unproven claim under two more tickets.

There are **no Antigravity credentials on this machine** (`~/.wisp/auth.json` has no antigravity slice) — #188's persistence check ran against an isolated `WISP_HOME`, so the sign-in is genuinely still owed.

### Checked live, unattended — more than a compile

- **A real request reaches the real Cloud Code daily endpoint.** `wisp serve` on an isolated `WISP_HOME` with a deliberately bogus token: Google answered `401 UNAUTHENTICATED`, surfaced as `Antigravity API error 401: {...}`, door answered 502, no retry, no host fallback.
  ⚠ **Scoped honestly:** this proves URL, method and headers — **not** that the body is acceptable. Google authenticates before it validates, so a malformed body would 401 identically.
- **Signed-out → 401 before any response head** (`Content-Type: application/json`, never `text/event-stream`).
- **Image model listed and refused** — 400, reason named, before anything opens.
- **Models endpoint reflects signed-in state both directions** (row absent signed out, present signed in).
- **The #186 tool-call capture maps correctly.** `antigravityClient.test.ts` drives **verbatim spike SSE bytes**: the upstream's own `functionCall.id` (`5hp24qb7`) passes through untouched, thinking tokens billed as output (16 candidates + 138 thoughts), the signature blob never leaks as text, and the turn terminates with **no `[DONE]` sentinel**.
- **Transport measured, not assumed** — see Landmines.

### Still unverified (and why)

| # | Criterion | Blocker |
|---|---|---|
| 1 | A real streamed turn completes (Gemini) | needs `/signin antigravity` |
| 2 | Tool calling end to end — call → result → continue | needs `/signin antigravity` |
| 3 | A Claude model turn, forced tool mode | sign-in **and** the account quota, exhausted until `2026-07-30T20:55:48Z` |
| 4 | Production reached on daily's REAL failure | unforceable; the fallback itself is verified against a stubbed capacity 503, a 429 and a transport error |

## What #189 built (branch `ticket/189-antigravity-executor-openai-door`, `77e1a1e`)

`packages/core/src/antigravity.ts` **+239** — the thirteen-model lineup with per-model output caps, the daily-first host chain, turn URLs + mirrored headers, `antigravityApiError` (the throw shape), the injected random session-id fallback, and `buildAntigravityPayload` / `buildAntigravityRequestBody` (turns → Gemini payload → #187's whole envelope pipeline, in the one order that holds).

`packages/core/src/antigravityClient.ts` **(new)** — the socket: streaming with the SSE flag, non-streaming, and the host walk.

Plus the fifth `ProviderExecutor` record, the `BridgeDeps` `antigravitySignedIn`/`antigravityCreds` pair (optional, the xai precedent), the models-list branch, the image refusal, and both faces wired.

**Six deliberate-break controls** confirm the tests bite: the throw shape, the stable session id beating the random fallback, the binding rule, tool-result ordering, the 401 non-fallthrough, and the shared request body across a fallback. The throw-shape test asserts against **the real `isTransientProviderError`** — a contract checked against a copy of itself proves nothing.

### Two calls in #189 worth a second opinion

- **"The models endpoint lists all thirteen models"** was implemented as: the **Provider's** lineup is the thirteen (`oauthModelOptions` → pickers, `wisp models antigravity`), while the **door's** `/v1/models` keeps one row per Provider and reflects signed-in state. Listing thirteen model ids at the door would need `resolveRoute` to map bare model names to a Provider — a change to shared routing that **#190 also edits**. Flagged rather than silently redesigned.
- **Effort is not threaded.** This lineup encodes its own tier in the model id (`-low`, `-high`, `-extra-low`), which answers #185's open "how does effort map?" for this row.

## Waiting on the user

- **`/signin antigravity` + the three curls** — the thing that unblocks the whole spec (above).
- **Dismiss the two secret-scanning alerts** as "won't fix" —
  [#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
  [#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2). Settled as acceptable
  ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]); noise now.
- **Install `packages/vscode/wisp-1.10.1.vsix`** — not on the marketplace, so that face lacks #182 until installed by hand.
- **#170** — needs a **Kimi Code subscription**.

## Released state — nothing owed

| Face | Version | Missing |
|---|---|---|
| npm `wisp-router` | **2.0.40** | nothing — #188/#189 are unreleased core; #192 ships the spec |
| `wisp` vsix | **1.10.1** | nothing — but **packaged, not installed** |
| `wisp-slot` plugin | **1.6.0** | nothing |

## Landmines

Antigravity (all still live):

- **⚠ A live 401 does NOT validate the request body.** Google authenticates before it validates, so the #189 live probe proves the URL/method/headers only. Do not read it as "the envelope is accepted".
- **Never mint opaque provider-side tool ids.** The upstream's own `functionCall.id` passes through untouched; absent upstream ⇒ an **empty** id, never a minted one. #189's payload builder now carries this too — a control confirms minting fails the test.
- **The transport fork is deliberately NOT ported.** The reference forces HTTP/1.1 "to mimic Node.js https defaults"; probed 2026-07-29 against an h2-capable host, **both** Bridge runtimes already negotiate `http/1.1` (bun 1.3.14 `wisp serve`, node 22.17/undici extension host). Adding a knob would be dead configuration.
- **The throw shape is a CONTRACT.** `isTransientProviderError` regexes `String(err)` for `API error (429|500|502|503|504)`. `antigravityApiError` produces it; any "tidier" message silently gets **zero** retries.
- **The schema cleaner is safe because of its WALKER, not only its scope.**
  [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]]. The change that re-arms the reference's production bug is *"simplify `mapSchema` to a generic deep walk"*, and **no single test catches it**. A ⚠ comment sits at `mapSchema`; keep it.
- **The session id is content-derived, not a nonce.** #189's random fallback is resolved AFTER the stable id on purpose — a control confirms swapping that order fails.
- **Tool results ride their own content, AHEAD of the turn text.** The pairing validator forbids call and response parts in one content and wants the response content directly after the calls.
- **The two hosts are not interchangeable.** Project bootstrap → **production**; turns → **daily**. The reference's asymmetry, pinned by its own test.
- **#190 edits `routing.ts`, which every Provider shares.** Its two cooldown channels are separate on purpose so a blip cannot write a long horizon and a long quota window cannot be shortened by a blip. Preserve that.
- **Credits' cooldown ledger is harmful with one credential** — the reference consults it *before sending*, so a single benched credential 429s itself. Out of scope; do not helpfully port it.
- **⚠ Claude quota exhausted until `2026-07-30T20:55:48Z`** (`claude-sonnet-4-6`, `claude-opus-4-6-thinking` — note `-4-6`, not `4.5`). A 429 on a Claude model is the ACCOUNT, not the code.
- **The model catalog is advisory.** A row listed `recommended: true` can 400 on every shape. Known-good: `gemini-3.1-pro-low`, `gemini-2.5-flash`, `gemini-3-flash`, `gemini-3.6-flash-low`, `gemini-3.6-flash-high`, `gemini-pro-agent`.

Credential hygiene ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]):

- **Never write account-identifying values into this repo.** The spike fixtures at `D:\scratch\antigravity-spike\out\` carry the real project id — #189 scrubbed it to `example-project-1` before using those bytes in a test. `tokens.json` / `.tokens-SECRET.json` in that folder are **live credentials**: never read, never copy.
- **Never commit a token.** Anything credential-shaped bound for this PUBLIC repo is a question for the maintainer, not a default.

General:

- **A store file that does not parse is no longer overwritten — `merge` refuses (#182, ADR-0004).** Both stores are read-merge-write, so any *new* "degrade to `{}`" here is destructive by default.
- **`writeConfig` / `writeAuth` can throw, and always could.** ~35 call sites tolerate it.
- **A fix release is not verified until the OLD version FAILS the same check.**
  [[verifying-a-fix-release-needs-the-previous-version-as-a-control]].
- **A vsix is evidence only when checked in the BUNDLE** — unzip it and grep `extension/dist/extension.js`.
- **RUN `bun run compile` IN BOTH PACKAGES.** The root script only covers `packages/vscode`. The test gate is
  **`bun run test`** (vitest) — bare `bun test` runs Bun's own runner and reports ~53 bogus failures.
- **npm is one of THREE faces.** Every release entry carries `### Surfaces`.
  [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]].
- **The `wisp-slot` version lives in TWO files** — `plugins/slot/.claude-plugin/plugin.json` **and** `.claude-plugin/marketplace.json`.
- **Never verify usage from `status.json`** — it is global.
  [[status-json-is-global-so-it-cannot-observe-another-session]].
- **`.context/` commits go to main, never a ticket branch.**

Reference clone for #185 lives at `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`, re-clonable, outside the repo).

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]]
- [[2026-07-29-antigravity-narrow-port-never-mint-opaque-tool-ids]]
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
