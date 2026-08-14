---
type: active-work
project: wisp
updated: 2026-08-14
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-08-14 by Fable 5 (relay leg 2, ticket-loop)_
_At commit: `ca29ebc` on main. Released: `wisp-router@2.0.42`, `wisp-slot` 1.7.4. **npm 2.0.43 cut still OWED.**_

## Current focus

**2.0.43 is being built. #202 and #203 landed; #204 remains.**

**#203 — statusline expired-meter semantics — DONE** (PR #206, squashed as `ca29ebc`, issue closed and
`ready-for-agent` cleared). Any meter with numeric `resetAt <= now` (epoch seconds, as status.json carries
it) renders as a dimmed, barless row keeping its label and the reset glyph with a `refilled` marker —
never silently dropped, never alarmed on a percent whose window has rolled. One `expired()` predicate in
`plugins/slot/statusline/wisp-statusline.js`, applied at both render sites (active-route meter rows and
remembered-Provider rows). Route resolution and the 24h ledger prune untouched. wisp-slot bumped to
**1.7.4** in both manifest files.

Decisions inside it worth carrying:

- **Identical treatment means identical rule, not identical layout** — active expired rows keep the reset
  *time* ("refilled 2:08pm" = when it rolled); remembered rows show bare `↻ refilled` because they never
  showed reset times. Noted on the ticket.
- The row stays visible indefinitely once expired; hiding it after a grace period would be new policy and
  is explicitly not built.

## Queue: #204

- **#204 — usage-endpoint recon spike** (throwaway probes under gitignored `out/`, redact on values, ≤3
  reads — the Anthropic usage endpoint carries a multi-minute 429 penalty; verdict as a comment on #201,
  build ticket only on a build verdict).

Unblocked. #69 and #163 unchanged, neither agent-ready.

## Release owed

**npm `wisp-router` 2.0.43 — cut is OWED, not cut.** Unchanged by #203: the statusline is the `wisp-slot`
plugin face, which ships through the marketplace on merge, not through npm. `packages/tui/CHANGELOG.md`
still carries `## [2.0.43] — unreleased` (its Surfaces already derived); `package.json` deliberately not
bumped — the bump and the `v2.0.43` tag stay a deliberate human act.

`wisp-slot` 1.7.4 is **live for the user already** on this machine — the badge runs from the repo checkout
([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]); `/plugin update wisp-slot` only
refreshes the cached skill/hook copies.

## State

- **In flight:** nothing. Leg complete.
- **Done this leg:** #203 built (TDD: 4 new checks watched fail first), gated, merged, closed, label
  cleared, breadcrumbed; wisp-slot 1.7.4 in plugin.json + marketplace.json.
- **Blocked:** nothing.

## Verification

All on merged main (`ca29ebc`):

- `node plugins/slot/statusline/check.js` — **30/30** (24 existing + 6 new expiry cases; fixtures
  caller-shaped: epoch-second `resetAt`, picker-prefixed `claude-wisp-sol[1m]` on route cases)
- **Control run per the ticket:** pre-fix script (`git show HEAD:` into scratch) failed all 4 behavior
  assertions; the 2 passing both ways are labelled in-file as regression pins
- Live ANSI eyeball under sandboxed `WISP_HOME` (bash-seeded — PowerShell seeding hits the BOM trap,
  [[a-bom-in-wisp-config-silently-empties-the-whole-config]]): expired `5h` FAINT `↻ refilled 2:08pm`,
  unexpired `7d` bar + amber 61% unchanged, remembered row mixes `5h ↻ refilled · 7d 36%  7m ago`
- No package gate claimed — plugin-only change, per the ticket; the squash touched exactly the 4 intended
  files (pre-branch `git rev-list` guard held, unlike #202's sweep)

## Skills for next session

- `/preset pick-up` — baton at [[pick-up]] is current as of this leg.
- #204 is a recon spike: the quota-recon landmines in [[pick-up]] (drain the body, redact on value, prove
  by driving) are the working rules.

## Open questions

- **#204's verdict is genuinely open** — nobody has driven the usage endpoint with our token yet.
- Carried over, unchanged: install `packages/vscode/wisp-1.11.0.vsix`; dismiss the two secret-scanning
  alerts as won't-fix; rotate `bridgeSecret` (low urgency); #170 needs a Kimi Code subscription; note
  #189's last criterion on the closed issue when observed; ~20 stale local `ticket/*` branches.
- `.context/Untitled.canvas` sits untracked in the repo — user's own file, left alone, not committed.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[quota-recon]]
- [[the-statusline-duplicates-resolveroute-and-drifts]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
