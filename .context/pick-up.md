---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-29): #187 landed, then the #186 auth spike PASSED — access is confirmed and the
queue is open again.** At `63453e0` on main (pushed). No release cut, no release debt.

## Queue: #188 is `ready-for-agent`

Run **`/relay N=1 /preset ticket-loop`**. It picks up #188 (catalog row, kind, creds slice,
`AntigravityAuth`). The verified constants are posted as a comment on #188 — client id, callback, scopes,
host, paths, User-Agent, loadCodeAssist body — all measured live, not read off the reference.

**Re-arm order after #188 lands:** #189 → then #190 **and** #191 together → then #192, which closes #185.

## What #186 proved

| Question | Answer |
|---|---|
| Access | **confirmed** — project `phonic-bonfire-bq1hc` |
| PKCE S256 | **accepted** — the spec's auth decision stands, no revision |
| Refresh token | received (`access_type=offline` + `prompt=consent`) |
| Pinned version `2.2.1` | **accepted** |
| Daily host | **answered** — prod fallback never needed |
| Vision + PDF input | both **accepted**, HTTP 200 — #185's open question is closed |
| Tool calling | works, streaming and non-streaming |

Fixtures at `D:\scratch\antigravity-spike\out\` (outside the repo, disposable).

## Two live findings that change how the next tickets are written

1. **The model catalog is advisory, not a guarantee.** 24 models listed, not the 13 the spec assumed — and
   **`gemini-3.1-pro-high` 400s on every request shape tried** while `gemini-3.1-pro-low` and
   `gemini-3.6-flash-high` 200 on the identical body. `gemini-2.5-pro` returns 503 no-capacity. #188 must
   tolerate a listed-but-unservable row. Known-good: `gemini-3.1-pro-low`, `gemini-2.5-flash`,
   `gemini-3-flash`, `gemini-3.6-flash-low`, `gemini-3.6-flash-high`, `gemini-pro-agent`.

2. **⚠ Claude quota on this account is exhausted until `2026-07-30T20:55:48Z`.** Real ids are
   `claude-sonnet-4-6` and `claude-opus-4-6-thinking` (`-4-6`, not `4.5`). #188/#189/#190 are unaffected —
   they run on Gemini — but **#191 cannot be verified live until the quota resets.**

## The spike found a real bug in #187 — fixed in `63453e0`

**Thinking tokens are billed output and ride their own `usageMetadata` field.** Reading
`candidatesTokenCount` alone under-reported a reasoning turn by ~100x (candidates 1 vs thoughts 1123 on a
vision turn). Now `candidates + thoughts`, checked against the upstream's own `totalTokenCount`, with both
captured numbers as tests and verified by control. Same class as #165.

Two more observations, recorded on #186: `usageMetadata` **repeats identically on every chunk** (so #187's
terminal-only rule is right — forwarding each copy would double-count), and response parts carry
`thoughtSignature` (~1.3 KB) that **#191** will need for thinking passthrough.

## What #187 landed

`packages/core/src/antigravity.ts` (806 lines) + `packages/core/tests/antigravity.test.ts` (78 tests),
exported through the `catalog.ts` barrel like every other pure Provider core. Gate: **868/868 vitest** (783
before), `bun run compile` clean in **BOTH** packages.

The envelope, the content-derived session id, the model-family fork table, path-scoped schema cleaning (two
cleaners), the fourth tool builder, the four signature/pairing pieces, the stateless 429 classifier, the SSE
mapper onto `BridgeStreamEvent`. Credits and reasoning-replay stay out, as specced.

**Seams the next tickets inherit** — full list in [[active-work]]:

- `antigravityStableSessionId` returns **`undefined`** with no anchor text; **#189** owns the random fallback
  (it cannot live in a pure layer).
- `antigravity429Error` returns **`Antigravity API error 429: <reason>`** — #189/#190 must throw this shape.
- `decideAntigravity429` keeps all four kinds **plus `retryAfterMs`** because **#190** needs the horizon.

## The binding rule — now confirmed by the live wire

**The port never mints opaque provider-side tool ids. The upstream's own `functionCall.id` passes through
untouched.** Absent upstream ⇒ an **empty** id, never a minted one.

#186 captured a real one: `"id": "5hp24qb7"`. The upstream **does** mint its own, so passing it through is
right and there was never a need to invent one.

This is no longer only a convention: **tests pin it, and the guard was verified by control** — minting a
content-hash id when upstream sent none fails two of them. A leg that "improves" id handling now fails loudly
instead of silently. Do not weaken those tests to make a change pass.

## New landmine from this session

**The schema cleaner is safe because of its WALKER, not only its scope.**
[[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]]. Two protections where the reference
had one: path scoping, plus a walker that descends only schema positions and so cannot reach
`request.contents` at all. Measured by control — scope alone does **not** corrupt history; a **generic deep
walk applied whole-document does**, failing both arms of the history test. So the change that re-arms the
reference's production bug is *"simplify `mapSchema` to a generic deep walk"*, and **no single test catches
it**. A ⚠ comment sits at `mapSchema`; keep it.

## Released state — nothing owed

| Face | Version | Missing |
|---|---|---|
| npm `wisp-router` | **2.0.40** | nothing — #187 is unreleased core, no face owes a bump yet (#192 ships it) |
| `wisp` vsix | **1.10.1** | nothing — but **packaged, not installed** |
| `wisp-slot` plugin | **1.6.0** | nothing |

## Waiting on the user

- **Install `packages/vscode/wisp-1.10.1.vsix`** — that face is not on the marketplace, so the extension does
  not carry #182 until it is installed by hand.
- **#170** — needs a **Kimi Code subscription**. The sign-in doubles as the unverified-constants check.
- _(#186 is done — closed 2026-07-29, access confirmed.)_

## Landmines

Antigravity (carried forward, all still live):

- **The binding rule + the schema-walker rule above.**
- **Antigravity is a THIRD wire**, not OpenAI- or Anthropic-shaped: Gemini `generateContent` nested in a
  bespoke Cloud Code envelope. It still needs a third stream mapper wiring, a fourth tool builder (**landed**),
  a `BridgeDeps` widening, **and** its own branch in the Anthropic door's chain — that door deliberately
  refuses the executor record. "Just add a record" is wrong.
- **The retryability contract is a string.** `isTransientProviderError` regexes `String(err)` for
  `API error (429|500|502|503|504)`. #187 exports the correct shape; #189/#190 must actually throw it.
- **Schema cleaning applies only at schema paths** — see the walker note above.
- **The session id is content-derived, not a nonce.** A random-per-request implementation looks fine and
  loses upstream cache behaviour. #187 pins this; #189's fallback must stay the *fallback*.
- **#190 edits `routing.ts`, which every Provider shares.** Its two cooldown channels are separate on purpose
  so a blip cannot write a long horizon and a long quota window cannot be shortened by a blip. Preserve that.
- **Credits' cooldown ledger is harmful with one credential** — the reference consults it *before sending*,
  so a single benched credential 429s itself. Out of scope; do not helpfully port it.

Carried forward, general:

- **A store file that does not parse is no longer overwritten — `merge` refuses (#182, ADR-0004).** Both
  stores are read-merge-write, so any *new* "degrade to `{}`" in this layer is destructive by default. The
  pure parsers are still total on purpose — do not make them throw, they have six callers.
- **`writeConfig` / `writeAuth` can throw, and always could.** ~35 call sites already tolerate it. Resist any
  "return a result type instead" refactor.
- **A fix release is not verified until the OLD version FAILS the same check.**
  [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]. #187 applied the same discipline to
  code: break the rule on purpose, confirm the test fails.
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

## Loose threads noticed, not touched

`packages/vscode/src/chatProvider.ts` — #165's Anthropic branch has a **duplicated**
`if (ev.type !== 'toolCall') continue;`. Dead, not wrong. Still untouched.

`packages/tui/package.json` starts with a **UTF-8 BOM**. Harmless today; a live tripwire if anything ever
reads it with a bare `JSON.parse`.

Reference clone for #185 lives at `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`, re-clonable, outside the
repo).

## Related

- [[active-work]]
- [[overview]]
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
