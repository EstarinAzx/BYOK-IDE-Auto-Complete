---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-29): relay leg 1 landed #187 — the whole pure Antigravity layer — then stopped on a
dry queue, exactly as designed.** At `e04f53b` on main (pushed) plus this session's `.context/` commit. No
release cut, no release debt.

## queue empty

**No ticket carries `ready-for-agent`.** That is deliberate, not an oversight — see the gate below. Running
the relay again right now would find nothing and stop again.

## The one thread: #186, and it needs a human — ten minutes

**Run the #186 auth spike.** Browser OAuth on the Google account. Confirm Antigravity access exists, record
the PKCE verdict, record whether the pinned client version was accepted, and save the captured
request/response bodies (including one streaming turn) on the ticket. Those become the fixtures that replace
#187's derived ones.

**Then, one step at a time:** #186 passes → label **#188** → then **#189** → then **#190** and **#191**
together (independent of each other) → then **#192**, which closes #185. Re-arm the chain by re-issuing
`/relay N=1 /preset ticket-loop` (the state file is `stop: true`; re-issuing re-inits it).

Access **not** confirmed → comment the finding on #186, label nothing, leave #185 dormant. **Do not flip
labels hoping it works out.**

## Why the queue is gated on a human

`## Blocked by` is body text, not native tracker links — a frontier query cannot see it, so **labels are the
only real gate**. #187 was exempt because it is a pure transcription of the reference's own ~3,900-line test
corpus: no credentials, no account access, verifiable offline. **Every remaining ticket touches the live
wire.** Labelling one before the spike lets the relay build the entire Provider before anyone confirms the
account can reach it — which is exactly how **#170** ended up complete, correct, and unusable.

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

## The binding rule — still the highest-consequence thing here

**The port never mints opaque provider-side tool ids. The upstream's own `functionCall.id` passes through
untouched.** Absent upstream ⇒ an **empty** id, never a minted one.

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

- **#186** — the Antigravity auth spike above. The only thing unblocking the queue.
- **Install `packages/vscode/wisp-1.10.1.vsix`** — that face is not on the marketplace, so the extension does
  not carry #182 until it is installed by hand.
- **#170** — needs a **Kimi Code subscription**. The sign-in doubles as the unverified-constants check.

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
