---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-29): #188 LANDED.** Squash-merged as **`ba8dab3`** on main via PR #193; #188 closed,
branch deleted. Gate re-verified on merged main: 905/905 vitest, compile clean both packages.

## Queue: #189 is `ready-for-agent`

Run **`/relay N=1 /preset ticket-loop`**. It picks up **#189** (executor record + the OpenAI door — the
first real turn). Order after that: #190 **and** #191 together → #192, which closes #185.

**One loose end for you, not blocking:** dismiss the two secret-scanning alerts as "won't fix" —
[#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
[#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2). Settled as
acceptable (see below); they are just noise now.

## The security thread that ran through this session

Full reasoning: [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]. The short version:

- **Not a false positive.** GitHub matched Google's real `GOCSPX-` client-secret format. Both alerts are
  legitimate detections.
- **It is not your credential.** It is the Antigravity desktop app's, already public in CLIProxyAPI. It
  cannot reach your account, data, tokens, or billing — obtaining a token still requires a human to complete
  Google's consent screen with their own Google account.
- **The only genuine risk is Google revoking the client**, which would break Antigravity for everyone using
  this approach. Removing it from this repo would **not** reduce that risk (it is public elsewhere) — it
  would only quiet the scanner. Hence: hardcoded, alerts dismissed.
- **No token has ever been committed.** Verified with token-pattern search across all of git history — zero
  matches. ⚠ The one real credential artefact on disk is `D:\scratch\antigravity-spike\out\tokens.json`
  (live access + refresh tokens), outside the repo. If you ever suspect a leak, the durable fix is revoking
  at `myaccount.google.com/permissions` and signing in again — that invalidates every token ever issued,
  which no repo surgery can do.
- **The project id is scrubbed going forward**, history deliberately not rewritten (inert identifier;
  a public repo's history is already forkable). Tests use `example-project-1`.

## What #188 landed (on main, `ba8dab3`)

`packages/core/src/antigravityAuth.ts` (new) + `antigravityAuth.test.ts` (new), plus the pure credential
layer in `antigravity.ts`, the catalog row, the `antigravity` auth slice, and TUI `/signin` + `/signout`.

**Gate:** 905/905 vitest (868 before — 37 new), `bun run compile` clean in **BOTH** packages. Persistence
verified end to end against a real `WispHome` on an isolated `WISP_HOME`: sign in → restart → still signed
in with the project kept; sign out → `{}` tombstone → restart → still signed out.

⚠ The **live** Google round trip is the one acceptance criterion not machine-verified — it cannot run
unattended. The loopback catcher *is* driven for real (the test pulls `redirect_uri` + `state` out of the
authorize URL and fires the callback itself), so the flow and the PKCE parameters are covered. #186 remains
the live evidence for the constants. **Worth one manual `wisp` → `/signin antigravity` before merging.**

### Three decisions in #188 a reviewer should sanity-check

- **`defaultModel` is `gemini-3.1-pro-low`, not the `recommended: true` `gemini-3.1-pro-high`** — that row
  400s on every shape tried. A test now guards the default against being "upgraded".
- **Two hosts, deliberately:** the project bootstrap is pinned to the **production** host while turns go to
  **daily**. The reference's asymmetry, pinned the same way by its own test. "Fixing" the inconsistency is
  unverified territory.
- **No `onboardUser` fallback** — #185 scopes this to reading the project that exists, not provisioning one.
  Marked with a `ponytail:` comment naming the upgrade path.

### Seams #189 inherits

- `AntigravityAuth.current()` returns the bundle refreshed **and** with the project id bootstrapped when
  absent, so the request path can assume `projectId` is present whenever it can be.
- `ANTIGRAVITY_HTTP_USER_AGENT` is exported from the pure layer — one edit moves both bootstrap and turns.
- A refresh carries `projectId` across the rebuild; a test pins it, because losing it would silently put
  every later turn back on the request-build 400.
- From #187, unchanged: `antigravityStableSessionId` returns `undefined` with no anchor text (**#189** owns
  the random fallback); `antigravity429Error` returns `Antigravity API error 429: <reason>`;
  `decideAntigravity429` keeps all four kinds **plus `retryAfterMs`** because **#190** needs the horizon.

## Noticed, not fixed

- **`/signin`'s palette hint had silently lost `kimi`** — the #96 test pinned the pre-#170 literal, so the
  door worked but was undiscoverable. Restored in #188, and the test now asserts every door instead of a
  frozen string. Watch for this shape: a test that pins an exact string *stops* catching omissions.
- **`app.tsx`'s `/key` OAuth guard omits `isXaiProvider`** — `/key xai` opens a key field for a keyless row.
  Pre-existing, untouched.
- `packages/vscode/src/chatProvider.ts` — #165's Anthropic branch has a duplicated
  `if (ev.type !== 'toolCall') continue;`. Dead, not wrong. Still untouched.
- `packages/tui/package.json` starts with a **UTF-8 BOM**. Harmless today; a tripwire if anything ever reads
  it with a bare `JSON.parse`.

## Released state — nothing owed

| Face | Version | Missing |
|---|---|---|
| npm `wisp-router` | **2.0.40** | nothing — #188 is unreleased core; #192 ships the spec |
| `wisp` vsix | **1.10.1** | nothing — but **packaged, not installed** |
| `wisp-slot` plugin | **1.6.0** | nothing |

## Waiting on the user

- **Dismiss the two secret-scanning alerts** (above) — cosmetic, does not block the spec.
- **One manual `wisp` → `/signin antigravity`** before relying on the row — the live Google round trip is the
  one acceptance criterion no test can cover unattended.
- **Install `packages/vscode/wisp-1.10.1.vsix`** — not on the marketplace, so that face lacks #182 until
  installed by hand.
- **#170** — needs a **Kimi Code subscription**. The sign-in doubles as the unverified-constants check.

## Landmines

Antigravity (all still live):

- **Never mint opaque provider-side tool ids.** The upstream's own `functionCall.id` passes through
  untouched; absent upstream ⇒ an **empty** id, never a minted one. #186 captured a real one, so the
  upstream does mint its own. Tests pin this and the guard was verified by control — do not weaken them.
- **The schema cleaner is safe because of its WALKER, not only its scope.**
  [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]]. The change that re-arms the
  reference's production bug is *"simplify `mapSchema` to a generic deep walk"*, and **no single test catches
  it**. A ⚠ comment sits at `mapSchema`; keep it.
- **Antigravity is a THIRD wire** — Gemini `generateContent` nested in a bespoke Cloud Code envelope. Still
  needs a stream-mapper wiring, a `BridgeDeps` widening, **and** its own branch in the Anthropic door's
  chain. "Just add a record" is wrong.
- **The retryability contract is a string.** `isTransientProviderError` regexes `String(err)` for
  `API error (429|500|502|503|504)`. #189/#190 must actually throw that shape.
- **The session id is content-derived, not a nonce.** A random-per-request implementation looks fine and
  loses upstream cache behaviour. #189's fallback must stay the *fallback*.
- **#190 edits `routing.ts`, which every Provider shares.** Its two cooldown channels are separate on purpose
  so a blip cannot write a long horizon and a long quota window cannot be shortened by a blip. Preserve that.
- **Credits' cooldown ledger is harmful with one credential** — the reference consults it *before sending*,
  so a single benched credential 429s itself. Out of scope; do not helpfully port it.
- **⚠ Claude quota exhausted until `2026-07-30T20:55:48Z`** (`claude-sonnet-4-6`, `claude-opus-4-6-thinking`
  — note `-4-6`, not `4.5`). A 429 on a Claude model is the ACCOUNT, not the code. **#191 cannot be verified
  live until it resets.**
- **The model catalog is advisory.** A row listed `recommended: true` can 400 on every shape. Known-good:
  `gemini-3.1-pro-low`, `gemini-2.5-flash`, `gemini-3-flash`, `gemini-3.6-flash-low`,
  `gemini-3.6-flash-high`, `gemini-pro-agent`.

General:

- **A store file that does not parse is no longer overwritten — `merge` refuses (#182, ADR-0004).** Both
  stores are read-merge-write, so any *new* "degrade to `{}`" here is destructive by default. The pure
  parsers are still total on purpose — do not make them throw, they have six callers.
- **`writeConfig` / `writeAuth` can throw, and always could.** ~35 call sites tolerate it. Resist any
  "return a result type instead" refactor.
- **A fix release is not verified until the OLD version FAILS the same check.**
  [[verifying-a-fix-release-needs-the-previous-version-as-a-control]].
- **A vsix is evidence only when checked in the BUNDLE** — unzip it and grep `extension/dist/extension.js`.
- **npm can 404 a version its own publish job just succeeded on.** Propagation lag; check the job log, retry.
- **RUN `bun run compile` IN BOTH PACKAGES.** The root script only covers `packages/vscode`. The test gate is
  **`bun run test`** (vitest) — bare `bun test` runs Bun's own runner and reports ~53 bogus failures.
  [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]].
- **npm is one of THREE faces.** Every release entry carries `### Surfaces`; file an owed bump as a ticket in
  the same pass. [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]].
- **The `wisp-slot` version lives in TWO files** — `plugins/slot/.claude-plugin/plugin.json` **and**
  `.claude-plugin/marketplace.json`.
- **Never verify usage from `status.json`** — it is global.
  [[status-json-is-global-so-it-cannot-observe-another-session]].
- **The `ctx …%` badge runs from the repo checkout, not the plugin cache.**
  [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]].
- **`.context/` commits go to main, never a ticket branch.**

Reference clone for #185 lives at `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`, re-clonable, outside the
repo). Spike fixtures at `D:\scratch\antigravity-spike\out\`.

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]]
- [[2026-07-29-antigravity-narrow-port-never-mint-opaque-tool-ids]]
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-29-never-overwrite-a-store-we-could-not-parse]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]
