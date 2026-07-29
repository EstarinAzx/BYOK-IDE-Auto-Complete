---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-29, relay leg 3): #189 LANDED.** Squash-merged as **`c6f644a`** on main via PR #194; #189 closed, branch deleted. Gate re-verified on merged main: **971/971 vitest**, compile clean **both** packages.

## Queue: #190 and #191 are both `ready-for-agent`

Run **`/relay N=1 /preset ticket-loop`**. It picks the oldest unblocked ticket, **#190** (rate limits answer 429; cooldown seeded from the server's stated horizon), then **#191** (the Anthropic door — Claude Code driven by Gemini). After both: **#192**, which closes spec #185.

Both run on **Gemini**, so neither is blocked by the Claude quota below.

## What #189 landed (on main, `c6f644a`)

The first real Antigravity turn. Antigravity is the **fifth `ProviderExecutor` record**, not a sixth special case.

`packages/core/src/antigravity.ts` **+239** — the thirteen-model lineup with per-model output caps, the daily-first host chain, turn URLs + mirrored headers, `antigravityApiError` (the throw shape), the injected random session-id fallback, and `buildAntigravityPayload` / `buildAntigravityRequestBody` (turns → Gemini payload → #187's whole envelope pipeline, in the one order that holds).

`packages/core/src/antigravityClient.ts` **(new)** — the socket: streaming with the SSE flag, non-streaming, and the host walk.

Plus the executor record, the `BridgeDeps` `antigravitySignedIn`/`antigravityCreds` pair (optional, the xai precedent), the models-list branch, the image refusal, and both faces wired.

### Verified live, end to end

After `/signin antigravity`, driven through `wisp serve` running from the branch:

- **A real streamed turn** — streamed `TURN_OK` from `gemini-3.1-pro-low`.
- **Tool calling end to end** — call emitted, result returned, and the model *used* it: *"The weather in Paris is currently 19 degrees Celsius with drizzle."*
- **Upstream ids untouched** — id `noxjacvf`, the same 8-char upstream shape as #186's `5hp24qb7`. Nothing minted.
- Signed-out → **401 before any head**; image model **listed and refused** (400, reason named) with real creds; models endpoint reflects sign-in both ways; the live 429 classified to the exact contract shape.

### ⚠ The bug the live turn caught — read before writing any SSE code

**The first live turn returned an EMPTY answer, at 200, with a fully green suite.**

The upstream frames SSE with **`\r\n\r\n`**. `sseBlocks` split on `'\n\n'` only, and that **never matches CRLF** — the `\r` sits between the two `\n`. So the entire response arrived as ONE block, its concatenated JSON documents failed to parse, every frame was dropped, and the turn completed cleanly with no text. Silent, and indistinguishable from a model that said nothing.

The tests missed it because the fixture bytes were **retyped rather than copied**, normalising CRLF to LF. Fixed in the same PR: the separator is now `/\r?\n\r?\n/` (matches `'\n\n'` identically, so Codex and Anthropic are unaffected), the fixtures frame with CRLF, and two named regression tests pin both endings. Control: reverting the separator fails 5 tests, including `expected [] to deeply equal ['TURN','_OK']`.

**The lesson, and it generalises:** a hand-retyped fixture silently normalises whitespace and line endings. When the framing is part of the contract, **copy the bytes** — an LF fixture cannot catch a CRLF bug. [[2026-07-29-a-retyped-sse-fixture-cannot-catch-a-crlf-framing-bug]]

### Still unverified from #189 — one criterion, and it is the account

**A Claude model turn on this Provider.** Live result was `Antigravity API error 429: QUOTA_EXHAUSTED`; the quota resets **`2026-07-30T20:55:48Z`**. The Claude path *is* wired — the request builds, sends, reaches the upstream, and comes back correctly classified (which is exactly the horizon **#190** consumes). What is unproven is a Claude turn *completing*. Re-check after the reset; it does not block #190 or #191.

Also unforceable: **production reached on daily's REAL failure**. Daily is confirmed as the host actually used; the fallback itself is verified against a stubbed capacity 503, a 429 and a transport error.

### Two calls in #189 a reviewer should sanity-check

- **"The models endpoint lists all thirteen models"** was implemented as: the **Provider's** lineup is the thirteen (`oauthModelOptions` → pickers, `wisp models antigravity`), while the **door's** `/v1/models` keeps one row per Provider and reflects signed-in state. Listing thirteen model ids at the door would need `resolveRoute` to map bare model names to a Provider — shared routing, which **#190 also edits**. Flagged, not silently redesigned.
- **Effort is not threaded.** The lineup encodes its tier in the model id (`-low`, `-high`, `-extra-low`), which answers #185's open "how does effort map?" for this row.

## Waiting on the user

- **Dismiss the two secret-scanning alerts** as "won't fix" —
  [#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
  [#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2). Settled as acceptable
  ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]); noise now.
- **Install `packages/vscode/wisp-1.10.1.vsix`** — not on the marketplace, so that face lacks #182 until installed by hand.
- **#170** — needs a **Kimi Code subscription**.
- _Done 2026-07-29:_ `/signin antigravity` — the row is live and driving real turns.

## Released state — nothing owed

| Face | Version | Missing |
|---|---|---|
| npm `wisp-router` | **2.0.40** | nothing — #187/#188/#189 are unreleased core; #192 ships the spec |
| `wisp` vsix | **1.10.1** | nothing — but **packaged, not installed** |
| `wisp-slot` plugin | **1.6.0** | nothing |

## Landmines

Antigravity:

- **SSE framing here is CRLF.** See the bug above. `sseBlocks` is now CRLF-tolerant — do not "simplify" it back to a plain `'\n\n'` split.
- **A live 401 does NOT validate the request body.** Google authenticates before it validates, so an auth failure proves URL/method/headers only.
- **Never mint opaque provider-side tool ids.** The upstream's own `functionCall.id` passes through untouched; absent upstream ⇒ an **empty** id, never a minted one. Confirmed live: real ids look like `noxjacvf`.
- **The throw shape is a CONTRACT.** `isTransientProviderError` regexes `String(err)` for `API error (429|500|502|503|504)`. `antigravityApiError` produces it; any "tidier" message silently gets **zero** retries.
- **The schema cleaner is safe because of its WALKER, not only its scope.**
  [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]]. The change that re-arms the reference's production bug is *"simplify `mapSchema` to a generic deep walk"*, and **no single test catches it**.
- **The session id is content-derived, not a nonce.** #189's random fallback resolves AFTER the stable id on purpose.
- **Tool results ride their own content, AHEAD of the turn text.** The pairing validator forbids call and response parts in one content and wants the response content directly after the calls.
- **The two hosts are not interchangeable.** Project bootstrap → **production**; turns → **daily**.
- **The transport fork is deliberately NOT ported** — both Bridge runtimes already negotiate `http/1.1` (measured). Adding a knob would be dead configuration.
- **#190 edits `routing.ts`, which every Provider shares.** Its two cooldown channels are separate on purpose so a blip cannot write a long horizon and a long quota window cannot be shortened by a blip. Preserve that.
- **Credits' cooldown ledger is harmful with one credential** — the reference consults it *before sending*, so a single benched credential 429s itself. Out of scope; do not helpfully port it.
- **⚠ Claude quota exhausted until `2026-07-30T20:55:48Z`** (`claude-sonnet-4-6`, `claude-opus-4-6-thinking` — note `-4-6`). A 429 on a Claude model is the ACCOUNT, not the code.
- **The model catalog is advisory.** A row listed `recommended: true` can 400 on every shape. Known-good: `gemini-3.1-pro-low`, `gemini-2.5-flash`, `gemini-3-flash`, `gemini-3.6-flash-low`, `gemini-3.6-flash-high`, `gemini-pro-agent`.

Credential hygiene ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]):

- **Never write account-identifying values into this repo.** The spike fixtures at `D:\scratch\antigravity-spike\out\` carry the real project id — #189 scrubbed it to `example-project-1` before using those bytes. `tokens.json` / `.tokens-SECRET.json` there are **live credentials**: never read, never copy.
- **Never commit a token.** Anything credential-shaped bound for this PUBLIC repo is a question for the maintainer, not a default.
- **A test run that touches `~/.wisp` restores it.** #189 pinned a temporary port + model there and restored the file byte-for-byte; the user's own Bridge on 41184 was never touched.

General:

- **A store file that does not parse is no longer overwritten — `merge` refuses (#182, ADR-0004).**
- **`writeConfig` / `writeAuth` can throw, and always could.** ~35 call sites tolerate it.
- **A fix release is not verified until the OLD version FAILS the same check.**
  [[verifying-a-fix-release-needs-the-previous-version-as-a-control]].
- **A vsix is evidence only when checked in the BUNDLE** — unzip it and grep `extension/dist/extension.js`.
- **RUN `bun run compile` IN BOTH PACKAGES.** The root script only covers `packages/vscode`. The test gate is **`bun run test`** (vitest) — bare `bun test` runs Bun's own runner and reports ~53 bogus failures.
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
- [[2026-07-29-a-retyped-sse-fixture-cannot-catch-a-crlf-framing-bug]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]]
- [[2026-07-29-antigravity-narrow-port-never-mint-opaque-tool-ids]]
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
