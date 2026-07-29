---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-29): #174 got groomed. Spec #185, tickets #186–#192. Nothing implemented.** An
eight-question grill settled the Antigravity scope; full reasoning in
[[2026-07-29-antigravity-narrow-port-never-mint-opaque-tool-ids]]. No code was written, no release cut, no
release debt. At `9208613` on main plus this session's `.context/` commit.

## Two threads. They do not block each other.

**1 — Human, ten minutes: run the #186 auth spike.** Browser OAuth on the Google account. Confirm Antigravity
access exists, record the PKCE verdict, record whether the pinned client version was accepted, and save the
captured request/response bodies (including one streaming turn) on the ticket. Those become #187's fixtures.

This gates every live-wire ticket. Access not confirmed → comment the finding on #186, label nothing, leave
#185 dormant. Do **not** flip labels hoping it works out.

**2 — Agent: `/relay N=1 /preset ticket-loop`.** Armed and re-seeded (`.claude/relay/ticket-loop.md`,
`stop: false`, leg 1). It lands **#187** and stops on a dry queue. That is correct, not a failure.

## The queue is deliberately one ticket deep

Only **#187** carries `ready-for-agent`. **#186** carries `ready-for-human`. The other five are bare.

`## Blocked by` is body text, not native links — a frontier query cannot see it, so **labels are the only
real gate**. Labelling #188 onward now would let the relay build the entire Provider before anyone confirms
the account has access. That is exactly how **#170** ended up complete, correct, and unusable.

#187 is exempt because it is a pure transcription of the reference's own ~3,900-line test corpus — its
correctness does not depend on account access, and it needs zero credentials to verify.

**Re-arming order, one step at a time:** #186 passes → label **#188** → then **#189** → then **#190** and
**#191** together (independent of each other) → then **#192**, which closes #185.

## The binding rule — do not let a leg "improve" this

**The port never mints opaque provider-side tool ids. The upstream's own `functionCall.id` passes through
untouched.**

Two-thirds of the reference's 1,980-line reasoning-replay subsystem exists to service ids that are
content-hash **lookup keys into a replay ledger**. Minting them without building the ledger makes every one a
dangling pointer. This single rule is what makes omitting that subsystem safe. A change that generates
"stable synthetic ids" breaks the foundation **silently** — nothing fails at compile time, and the damage
shows up as mangled tool history several turns later.

## Released state — nothing owed

| Face | Version | Missing |
|---|---|---|
| npm `wisp-router` | **2.0.40** | nothing |
| `wisp` vsix | **1.10.1** | nothing — but **packaged, not installed** |
| `wisp-slot` plugin | **1.6.0** | nothing |

## Waiting on the user

- **Install `packages/vscode/wisp-1.10.1.vsix`** — that face is not on the marketplace, so the extension does
  not carry #182 until it is installed by hand.
- **#170** — needs a **Kimi Code subscription**. The sign-in doubles as the unverified-constants check.
- **#186** — the Antigravity auth spike above.

## Landmines

New this session (Antigravity):

- **The binding rule above.** Highest-consequence, zero compile-time protection.
- **Antigravity is a THIRD wire**, not OpenAI- or Anthropic-shaped: Gemini `generateContent` nested in a
  bespoke Cloud Code envelope. It needs a third stream mapper, a fourth tool builder, a `BridgeDeps`
  widening, **and** its own branch in the Anthropic door's chain — that door deliberately refuses the
  executor record. "Just add a record" is wrong.
- **The retryability contract is a string.** `isTransientProviderError` regexes `String(err)` for
  `API error (429|500|502|503|504)`. A client that throws any other shape silently receives **zero** retries
  and nobody notices until a blip becomes a user-visible failure. Throw
  `` `Antigravity API error ${status}: ${body}` ``.
- **Schema cleaning applies only at schema paths.** The reference records that whole-document cleaning
  silently corrupted conversation history — keys like `title`/`format`/`default`/`const` also occur inside
  replayed function-call arguments.
- **The session id is content-derived, not a nonce.** A random-per-request implementation looks fine and
  loses upstream cache behaviour.
- **#190 edits `routing.ts`, which every Provider shares.** Its two cooldown channels are separate on purpose
  so a blip cannot write a long horizon and a long quota window cannot be shortened by a blip. Preserve that.
- **Credits' cooldown ledger is harmful with one credential** — the reference consults it *before sending*,
  so a single benched credential 429s itself. It is out of scope; do not helpfully port it.

Carried forward:

- **A store file that does not parse is no longer overwritten — `merge` refuses (#182, ADR-0004).** Both
  stores are read-merge-write, so any *new* "degrade to `{}`" in this layer is destructive by default. The
  pure parsers are still total on purpose — do not make them throw, they have six callers.
- **`writeConfig` / `writeAuth` can throw, and always could.** ~35 call sites already tolerate it. Resist any
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
- [[2026-07-29-antigravity-narrow-port-never-mint-opaque-tool-ids]]
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-29-never-overwrite-a-store-we-could-not-parse]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]
