---
type: active-work
project: wisp
updated: 2026-08-14
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-08-14 by Fable 5 (auto)_
_At commit: `2705bac` on main (no code commits this pass — planning only). Released: `wisp-router@2.0.42`, `wisp-slot` 1.7.3._

## Current focus

**2.0.43 planned and ticketed.** This pass was the init funnel for the user's three 2.0.43 ideas: recon
(two grok-4.6 subagents over a fresh Traycer clone + inline verification against our own code), then spec
**#201**, then three independent tickets — all labelled `ready-for-agent`, none blocking another:

1. **#202 — `wisp log`**: serve appends timestamped Bridge log lines to `~/.wisp/bridge.log` (one-deep
   rotation on serve start; the home watcher's existing non-`.json` filter already ignores it), and a new
   renderer-free dispatch branch prints (`wisp log`) or follows (`wisp log -f`) it. TUI face only, no core
   seam. Surfaces: tui → npm 2.0.43 cut owed when it lands.
2. **#203 — statusline expired-meter semantics**: a meter with `resetAt <= now` renders dimmed "refilled"
   (no bar, no alarm percent) instead of presenting a rolled window's old percentage as a live alarm.
   Verified gap: `wisp-statusline.js` prunes by reading age only, never compares `resetAt` to now.
   Traycer-derived rule. Plugin-only → wisp-slot bump.
3. **#204 — usage-endpoint recon spike**: do the Anthropic OAuth usage endpoint (and any Codex equivalent)
   answer our stored tokens? Throwaway probes under gitignored `out/`, redact on values, 2–3 reads max
   (known multi-minute 429 penalty on the Anthropic one). Verdict lands as a comment on #201; build ticket
   only if the answer is build.

**Cursor provider: settled no-build** — [[2026-08-14-a-cursor-provider-has-no-wire-to-route-through]].
Traycer's "cursor provider" is a harness (user API key driving `@cursor/sdk`), not a model wire; nothing to
route through.

## Traycer recon (what the comparison actually yielded)

Clone at `D:\scratch\traycer` (shallow, re-clonable, outside the repo — joins `D:\scratch\CLIProxyAPI` as a
reference checkout). Its host binary is **closed-source**; the open repo is protocol schemas + clients.

- **Term collision, resolved:** their "advisory" = provider-CLI version notices. They never emulate the
  Anthropic wire, so there is **no Advisor implementation to compare** against our door's `advisor_20260301`
  emulation. The user's "did they build a better advisor" question is answered: they built none.
- **Their rate-limit edge over our passive header parse:** an active usage-endpoint probe (Anthropic
  `/api/oauth/usage` via the Claude CLI, 15-min cadence, post-429 cooldown, last-good envelope) plus
  expired-window semantics (`resetsAt <= now` → not a current reading; that's #203) plus split warn
  thresholds (80% for ≤24h windows, 95% for longer). The probe idea is #204's question; the passive
  side-channel stays the source of truth for 2.0.43.
- **Their codex `rateLimitReachedType`** (authoritative limit-hit flag) and Claude model-scoped windows
  (7d-opus, 7d-sonnet, extraUsage credits) come from usage payloads, not headers — evidence for what #204's
  probe might unlock, nothing to build from headers alone.

## State

- **In flight:** nothing. Queue has three unblocked `ready-for-agent` tickets (#202, #203, #204).
- **Done this pass:** spec #201; tickets #202–#204; decision record
  `2026-08-14-a-cursor-provider-has-no-wire-to-route-through` + index line; Traycer clone + two-subagent
  recon; `.context` refresh. No package, plugin, or workflow file touched — nothing shipped, no release owed.
- **Blocked:** nothing.

## Verification

- No code changed → no gates run. The spec/ticket bodies carry their own gates (tui:verify + workspace
  suite for #202; `check.js` + pre-fix control for #203; redaction discipline for #204).
- Queue state verified by query this pass (`gh issue list --label ready-for-agent`): exactly #202, #203, #204.

## Pick up here

Work the frontier — all three tickets are independent; **#202** is the release-defining feature and the
natural first pick. `/preset scope 202` (or a `ticket-loop` firing) starts it. #163 and #69 remain open,
neither agent-ready, unchanged.

## Skills for next session

- `/preset pick-up` — baton at [[pick-up]] is current as of this pass.
- `packages/tui:verify` — mandatory for #202 (tui face change + pre-npm-cut checks).

## Open questions

- **#204's verdict is genuinely open** — nobody has driven the usage endpoint with our token yet. Do not
  assume it answers; the ticket exists to find out.
- Carried over, unchanged: install `packages/vscode/wisp-1.11.0.vsix`; dismiss the two secret-scanning
  alerts as won't-fix; rotate `bridgeSecret` (low urgency); #170 needs a Kimi Code subscription; note
  #189's last criterion on the closed issue when observed; ~19 stale local `ticket/*` branches.
- `.context/Untitled.canvas` sits untracked in the repo — user's own file, left alone, not committed.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[quota-recon]]
- [[2026-08-14-a-cursor-provider-has-no-wire-to-route-through]]
- [[2026-08-05-a-duplicated-resolver-is-fixtured-with-what-its-caller-sends-not-what-its-source-names]]
- [[the-statusline-duplicates-resolveroute-and-drifts]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
