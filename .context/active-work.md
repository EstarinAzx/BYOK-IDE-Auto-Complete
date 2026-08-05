---
type: active-work
project: wisp
updated: 2026-08-05
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-08-05 by Opus 5 (1M) (auto)_
_At commit: `2705bac` on main. Released: `wisp-router@2.0.42`, `wisp-slot` **1.7.3** (installed — user ran `/plugin update` + `/reload-plugins` this pass)._

## Current focus

**Nothing in flight. The tracker queue is empty** (`gh issue list --label ready-for-agent --state open` → nothing, verified this pass). Off-tracker user-reported statusline bug, diagnosed and fixed.

**"When I select a custom alias, the row doesn't show what the alias routes to."** Screenshot: a bare `wisp` row over `anthropic 5h 13% · 7d 28% 58m`. Same visual signature as the 2026-07-30 report, and — per the route-row tell already on file — the *bare* row correctly named it a **resolution** failure, not global-slot displacement. Third drift class in the same duplicated resolver.

The cause was one step upstream of everything examined last time. `~/.claude/settings.json` holds `"model": "claude-wisp-keemee"`, not `keemee`: Claude Code's `/model` list **is** the Bridge's Anthropic door, and that door prefixes every row `claude-wisp-<id>` so the picker will list it (`bridgeAnthropic.ts:676`). The door strips its own prefix inside the request parser (`bridgeAnthropic.ts:250`) *before* `resolveRoute` runs — so routing was never wrong, and the strip is invisible to anyone reading `routing.ts`. The statusline reads the name from **Claude Code**, upstream of that strip, and compared `claude-wisp-keemee` to `keemee` with `===`. The exact-alias rung could only ever fire for a hand-set `ANTHROPIC_MODEL`.

**Why 20 green assertions did not catch it:** every route case in `check.js` fed a *bare* alias id — a string the picker never produces. The fixtures were written from the same mental model as the code, so their agreement was not evidence. That is the durable lesson ([[2026-08-05-a-duplicated-resolver-is-fixtured-with-what-its-caller-sends-not-what-its-source-names]]); `grep model ~/.claude/settings.json` would have ended the investigation in one command.

## State

- **In flight:** nothing.
- **Done this pass** (`2705bac`, main, wisp-slot **1.7.3**):
  - `plugins/slot/statusline/wisp-statusline.js` — one `clean()` helper applied to both name sources before matching: strips `^claude-wisp-`, then a trailing `[…]` (Claude Code's own `[1m]` tier suffix — `~/.claude.json`'s `additionalModelOptionsCache` literally holds `claude-fable-5[1m]`). Safe for the family fuzzy, which is a substring test.
  - `plugins/slot/statusline/check.js` — 20 → **24 assertions**. New case 8 drives the shape the picker actually sends (`claude-wisp-grok`, `claude-wisp-sol[1m]`), plus a labelled regression pin for the family fuzzy under a tier suffix.
  - `.context/decisions/2026-08-05-a-duplicated-resolver-is-fixtured-with-what-its-caller-sends-not-what-its-source-names.md`
  - `.context/gotchas/a-picked-alias-reaches-the-statusline-prefixed-claude-wisp.md`
  - Amended [[the-statusline-duplicates-resolveroute-and-drifts]] — drifted **twice** now, the second time inside the fix for the first; both times the fixtures were the accomplice.
- **Blocked:** nothing. Every open item is human-optional (below).

## Verification

- `node plugins/slot/statusline/check.js` → **24/24**, exit 0.
- **Control:** `git show HEAD:plugins/slot/statusline/wisp-statusline.js` into a scratch dir + the new `check.js` → **3 failing**, and the control's own output printed `wisp` over a foreign quota row — the reported bug reproduced exactly. The 4th new assertion (family fuzzy under `[1m]`) passes both ways and is labelled in-file as a regression pin, not proof.
- **Live render** against the real `~/.wisp/`: `claude-wisp-keemee` → `wisp │ keemee → kimi-k3 │ opencode-go`; `claude-wisp-grok` → `wisp │ grok → grok-4.5 │ xai`; `claude-opus-5[1m]` → full block with `ctx 13%` and both bars.
- **No package gate run** — nothing under `packages/` was touched, so `bun run test` / `typecheck` / `compile` had nothing to say. `check.js` is the whole gate for a statusline-only change.

## Pick up here

**Queue is empty** — verified by query this pass, not from a file. Verify again the same way; never trust this line.

Two open issues, neither agent-ready:

1. **#69** — copilot-wisp launcher, ungroomed backlog. `grill-me` / `/preset init` is the right shape.
2. **#163** — waiting, not working (watch the 217k–245k band for Anthropic `stop_reason=refusal`).

So the next session either grooms #69 into tickets, picks up something from the human-optional list, or the user brings new work. **Do not invent a ticket to keep a loop fed.**

## Skills for next session

- `/preset pick-up` — the baton at [[pick-up]] is current as of `2705bac`.
- `packages/tui:verify` — scoped skill (`packages/tui/.claude/skills/verify`). Sandboxed `WISP_HOME` + real Bun entry points; use it for any `packages/tui` or core-that-tui-bundles change, and before any npm cut.

## Open questions

- **No release is owed.** `git log v2.0.42..main` per face: `packages/tui`, `packages/core` and `packages/vscode` are all still **empty** — this pass touched `plugins/` only, shipping as wisp-slot **1.7.3** via `marketplace.json` on main. No tag, no npm cut ([[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]).
- **`/plugin update wisp-slot` is DONE** — cache and checkout both at 1.7.3, `/reload-plugins` run. This item leaves the waiting list. (It was always cosmetic for the badge itself: the wrapper hardcodes the checkout path — [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]].)
- **`packages/vscode/wisp-1.11.0.vsix` still not installed.** Nothing touched the extension this pass either.
- Carried over, unchanged: dismiss the two secret-scanning alerts as won't-fix; rotate `bridgeSecret` in `~/.wisp/auth.json` (low urgency); **#170** needs a Kimi Code subscription; **#189**'s last criterion (a Claude-model turn *completing* on Antigravity after the `2026-07-30T20:55:48Z` reset — note it on closed #189); ~19 stale local `ticket/*` branches.

## Recent context

- **Read the picked model string before reading any code.** `grep model ~/.claude/settings.json` names the exact bytes the reader is handed. Both statusline route-row bugs were one grep from solved, and both were investigated the long way instead.
- **The bare-`wisp` vs named-route tell held up.** Written after the 2026-07-30 pass to separate resolution failures from global-slot displacement, it correctly classified this report on sight and saved re-running the whole quota investigation. A cheap diagnostic written into `gotchas/` paid off within a week.
- **A substring test can mask a broken exact test indefinitely.** The family fuzzy (`includes('opus')`) shrugs off both the `claude-wisp-` prefix and the `[1m]` suffix, so families worked the entire time the alias rung was dead — which framed the bug as "aliases are broken" rather than "the id is not the string you think".
- **The door normalizes one line inside its request parser.** `bridgeAnthropic.ts:250` is where `claude-wisp-` dies, nowhere near `routing.ts`. Anyone auditing routing correctness reads `resolveRoute`, sees clean names, and never learns the wire carries a prefix.
- **`packages/core` has no `compile` script.** The gate there is `bun run typecheck` (`tsc --noEmit`); only `packages/tui` has `compile` (`tsc -p ./`). Carried forward — untested this pass, no package changed.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[quota-recon]]
- [[2026-08-05-a-duplicated-resolver-is-fixtured-with-what-its-caller-sends-not-what-its-source-names]]
- [[a-picked-alias-reaches-the-statusline-prefixed-claude-wisp]]
- [[the-statusline-duplicates-resolveroute-and-drifts]]
- [[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]
- [[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[an-empty-quota-ledger-is-usually-correct-not-broken]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
