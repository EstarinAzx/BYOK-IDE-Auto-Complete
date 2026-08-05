---
type: pick-up
project: wisp
updated: 2026-08-05
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Latest (2026-08-05): `2705bac` — `wisp-slot` 1.7.3, the statusline now resolves a PICKED alias.**
User reported *"when I select a custom alias the row doesn't show what it routes to."* Bare `wisp` row over a
foreign quota row — the bare row is the tell for a **resolution** failure, and it was: `~/.claude/settings.json`
holds `"model": "claude-wisp-keemee"`, because Claude Code's `/model` list IS the Bridge's Anthropic door and
that door prefixes every row `claude-wisp-<id>` (`bridgeAnthropic.ts:676`). The door strips its own prefix
inside the request parser (`bridgeAnthropic.ts:250`) *before* `resolveRoute` — routing was never wrong. The
statusline reads the name from Claude Code, upstream of that strip, and compared `claude-wisp-keemee` to
`keemee` with `===`. Fixed reader-side with one `clean()` (`^claude-wisp-`, then a trailing `[…]` tier suffix).
`check.js` 20 → **24 assertions, 3 control-verified failing**. Third drift in the same duplicated resolver —
and the **second time the fixtures were the accomplice**, feeding a bare alias id the picker never produces
([[2026-08-05-a-duplicated-resolver-is-fixtured-with-what-its-caller-sends-not-what-its-source-names]],
[[a-picked-alias-reaches-the-statusline-prefixed-claude-wisp]]).

**Prior pass: `3974441` — statusline quota displacement fixed** (reader now finds the route's own Provider by
`providerId` in the top-level snapshot *or* the `providers` ledger). Before that, #200 closed recon-complete
with the answer "build nothing" — none of the four silent wires earned `parseable meter`.

## Queue: EMPTY

`gh issue list --label ready-for-agent --state open` returns nothing. **Verify by query, not by this note.**

Two open issues, neither agent-ready:

- **#69** — copilot-wisp launcher, ungroomed backlog. `grill-me` / `/preset init` is the right shape.
- **#163** — waiting, not working (watch the 217k–245k band for Anthropic `stop_reason=refusal`).

A `ticket-loop` firing that lands here should **stop the loop** rather than invent work. Grooming #69, or
picking something off "Waiting on the user", are the honest next moves.

## Waiting on the user

- **Install `packages/vscode/wisp-1.11.0.vsix`** — still not installed. Nothing touched the extension.
- **Dismiss the two secret-scanning alerts** as "won't fix" —
  [#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
  [#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2). Settled
  ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]); noise now.
- **Bridge access secret rotation** — delete `bridgeSecret` from `~/.wisp/auth.json`, start any host. Low urgency.
- **#170** — needs a **Kimi Code subscription**.
- **#189's last criterion** — a Claude-model turn *completing* on Antigravity after the quota reset
  `2026-07-30T20:55:48Z`. Leave the result as a note on closed #189.
- **~19 stale local `ticket/*` branches** (`git branch --list 'ticket/*'`). Cleanup, not a blocker.

_(`/plugin update wisp-slot` came off this list on 2026-08-05 — cache and checkout both 1.7.3.)_

## Landmines (durable — keep carrying)

Statusline / status.json:

- **The model id Claude Code hands you is NOT the Alias name.** A picked route arrives as
  `claude-wisp-<name>`, optionally with Claude Code's own `[1m]` tier suffix. Any consumer reading the name
  from Claude Code rather than from the door must normalize first
  ([[a-picked-alias-reaches-the-statusline-prefixed-claude-wisp]]).
- **When a route row is wrong, `grep model ~/.claude/settings.json` FIRST.** It shows the exact string the
  reader is handed and is cheaper than the whole check suite. Two route-row bugs were each one grep from
  solved and each investigated the long way.
- **The statusline DUPLICATES `resolveRoute`** — out-of-process under Claude Code, cannot import `@wisp/core`,
  so `wisp-statusline.js` re-implements the lookup in plain JS. It has now drifted **twice**, the second time
  inside the fix for the first. Change `routing.ts:60-91` → check the copy, and run
  `node plugins/slot/statusline/check.js` (24 assertions; exit code is the verdict).
- **Its fixtures must use the shape the CALLER sends, not the name the source stores.** Both drifts survived
  a green check because the fixtures agreed with the code instead of with reality.
- **A statusline fix needs the pre-fix file as the control.** `git show HEAD:<path>` into a scratch dir
  alongside the new `check.js`; assertions that pass both ways test nothing — label them as pins if you keep them.
- **"Showing anthropic when I'm on codex" has TWO causes — the route row tells them apart.** Bare `wisp` →
  resolution failed (the copy drifted). A *complete* route row beside a foreign quota row → global-slot
  displacement.
- **`status.json` is ONE global slot, so your own reading may not be where you look for it.** The top level is
  the last bridged turn on the *machine*; a concurrent session on another Provider owns it and pushes yours
  into `providers`. Any consumer must check **both** places, keyed on `providerId`
  ([[status-json-is-global-so-it-cannot-observe-another-session]]).
- **The two-place lookup is safe ONLY because `mergeStatus` evicts the incoming Provider from the ledger** —
  exactly one place per Provider, so the reader can never find two readings for one wire. Don't weaken that.
- **Codex on a Plus plan has exactly ONE window.** `x-codex-secondary-window-minutes: 0`, correctly refused by
  `parseCodexQuota` (`status.ts:88-91`). A codex session shows a single `7d` row — **a `5h`/`7d` pair is
  Anthropic's**, which is the fast tell for displacement.
- **`stream: false` never records a snapshot** — the non-streaming branch is Claude Code's `/model` probe and
  is deliberately excluded (`bridgeServer.ts:843` is on the streaming path). A non-streaming probe looks
  exactly like a Provider that never reports.
- **The block the user sees runs from the repo checkout, not the plugin cache**
  ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]) — `/plugin update` does not change it.
- **The wrapper lives outside the repo** (`~/.claude/hooks/statusline-wrapper.ps1`) — a change to the block's
  shape may need it edited too, and that edit is in no commit.
- **An empty `providers` map is usually correct** — the ledger never holds the *active* Provider.

Quota / recon:

- **Only two wires report quota, and that is SETTLED, not a gap.** codex + anthropic call `onQuota`; xai,
  antigravity and the keyed path never will, because their heads carry nothing usable
  ([[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]).
- **Recon that reads a response head must DRAIN the body.** Cancelling means the turn may never be billed, so
  a `remaining` counter has nothing to move and a dead ceiling looks identical to an untouched meter. Fire
  2–3 consecutive completed turns
  ([[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]).
- **Prove a wire by driving it, not by reading it.** Two throwaway `bun` probes under gitignored `out/` (one
  direct to the backend, one through the running door with `stream: true`) settled which half was broken in
  under a minute. Delete them after; never commit.
- **`loadCodeAssist` returns the account email** inside `upgradeSubscriptionUri`, percent-encoded (`%40`),
  under a key no `email`/`id` pattern matches. Redact on the **value**, not the key name
  ([[loadcodeassist-answers-with-the-account-email-inside-it]]).

Release:

- **An npm version can never be republished.** The tag is the trigger; no undo.
- **The tag must equal `packages/tui/package.json` exactly** — `release.yml` verifies, fails loud.
- **A fix release is not verified until the OLD version FAILS the same check.** Credential-free controls:
  `wisp routing set haiku antigravity/gemini-3-flash` (missing sign-in *warns* at exit 0, missing Provider
  *errors* at exit 1), or grep the compiled `wisp.exe` for an identifier the change introduced.
- **A vsix is evidence only when checked in the BUNDLE** — unzip, grep `extension/dist/extension.js`.
- **Verify npm past the registry read** — scratch install, execute the bins.
- **Every release entry carries `### Surfaces`, derived from `git log <last-tag>..main -- <face-path>`,
  never copied from the ticket** —
  [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]].
- **Labels are the only real gate** — `## Blocked by` is body text a frontier query cannot see.
- **A closed-by-PR issue keeps its `ready-for-agent` label** — clear it by hand.

Antigravity (full detail in `active-work.md` history + memory notes):

- Two doors, two places: executor record (OpenAI) vs `startProviderStream` chain (Anthropic) —
  [[the-anthropic-door-does-not-use-the-executor-records]].
- FULL system on this wire, never `systemSplit.stable`. 429 verdict rides ON the Error. Throw shape is a
  CONTRACT (`Antigravity API error <status>`). SSE framing is CRLF — do not "simplify" `sseBlocks`.
- **Turns go to the daily host, `loadCodeAssist` to production** — the asymmetry is deliberate and still current.
- **A green suite did not catch a dead Provider** — drive a real turn; a live negative is usually the fixture
  or the model ([[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]).
- Never mint opaque provider-side tool ids. Credits' cooldown ledger is harmful with one credential.

Credential hygiene ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]):

- Never write account-identifying values into this repo; tests use `example-project-1`. The spike fixtures at
  `D:\scratch\antigravity-spike\out\` carry live credentials — never read, never copy.
- Anything credential-shaped bound for this PUBLIC repo is a question for the maintainer.
- Upstream **error bodies** leak too — opencode's `401 CreditsError` names a billing URL carrying the
  workspace id. Redact before quoting into a ticket or note.

General:

- **`packages/core` has NO `compile` script** — its gate is `bun run typecheck` (`tsc --noEmit`); only
  `packages/tui` has `compile` (`tsc -p ./`). Test gate is **`bun run test`** (vitest) — bare `bun test` runs
  Bun's runner, ~53 bogus failures.
- Prefer the scoped **`packages/tui:verify`** skill for tui/core work: sandboxed `WISP_HOME`, real entry points.
- A store that does not parse is never overwritten — `merge` refuses (#182, ADR-0004). **`status.json` is the
  documented exception**: it is regenerable telemetry.
- The `wisp-slot` version lives in TWO files (`plugins/slot/.claude-plugin/plugin.json` +
  `.claude-plugin/marketplace.json`).
- `.context/` commits go to main, never a ticket branch.
- No PR CI — only `release.yml` on tag `v*`; the local gate *is* the gate.

Reference clone at `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`, re-clonable, outside the repo). Holds **no**
statusline script, but **does** hold the Antigravity credits poll
(`internal/runtime/executor/antigravity_executor_credits.go:453`).

## Related

- [[active-work]]
- [[overview]]
- [[quota-recon]]
- [[a-picked-alias-reaches-the-statusline-prefixed-claude-wisp]]
- [[2026-08-05-a-duplicated-resolver-is-fixtured-with-what-its-caller-sends-not-what-its-source-names]]
- [[the-statusline-duplicates-resolveroute-and-drifts]]
- [[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]
- [[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[an-empty-quota-ledger-is-usually-correct-not-broken]]
- [[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]
- [[loadcodeassist-answers-with-the-account-email-inside-it]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
