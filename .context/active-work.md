---
type: active-work
project: wisp
updated: 2026-07-30
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-30 14:40 by Opus 5 (1M) (auto)_
_At commit: `5592f44` on main — pushed, tag `v2.0.42` published._

## Current focus

**Second pass, `f565e94` — the block was naming the wrong Provider on an aliased route.** Reported from a
screenshot: session routed to `sol` (→ `codex/gpt-5.6-sol`), block showed a bare `wisp` row plus
`anthropic 5h 5% · 7d 36% 7m ago`. Cause was in the reader, not the ledger — `wisp-statusline.js` duplicates
`resolveRoute` and the duplicate knew only the family-fuzzy rung, so an alias resolved to no Target at all
(no model, no providerId, and `status.model === target.model` unreachable, which is what left the previous
Provider's reading as the only row). Now mirrors **alias exact → family fuzzy**. `wisp-slot` **1.7.1**;
`plugins/slot/statusline/check.js` added (10 assertions, real script, sandboxed `WISP_HOME`, no framework),
control-verified: **5 of 10 fail against the pre-fix file**. Flow recorded in [[flows]].

**Filed #200** (`ready-for-agent`) — the recon that had been sitting unfiled: four wires never call
`onQuota`, so the ledger can only ever hold two Providers.

**Prior pass — the statusline redesign is done and released.** The user's complaint was shape, not data: #171's readings
shipped as a one-line badge (`[WISP fable→claude-fable-5 ctx 7% 5h 11% 7d 35%]`) that looked like a copy of
the caveman/ponytail badges beside it, and CLIProxyAPI's stacked meter panel was held up as the target.
Two halves landed in one commit:

- **`wisp-slot` 1.7.0** — the badge is now a **block**: a route row (`wisp │ opus → claude-opus-5 │ ctx 17%
  │ anthropic`), one colour-scaled `●○` bar per quota window with percentage and reset time, and a dimmed
  row per other Provider whose limits are known, stamped with the reading's age.
- **`wisp-router` 2.0.42** — the **quota ledger**: `status.json` keeps every Provider that reported
  utilization in the last 24h instead of overwriting per turn
  ([[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]).

## State

- **In flight:** nothing. The arc is closed.
- **Done this session:**
  - `packages/core/src/status.ts` — `WispProviderQuota`, `WispStatus.providers`, `QUOTA_LEDGER_MAX_AGE_MS`,
    pure `mergeStatus(prev, next)`.
  - `packages/core/src/homeStore.ts` — `readStatus()` added; `writeStatus()` now read-merge-writes the
    ledger. Comment records why #182's never-overwrite rule does **not** apply to this file.
  - `plugins/slot/statusline/wisp-statusline.js` — full rewrite, badge → block. Emits **no leading
    newline** (the composing statusline owns layout) and still prints nothing unbridged.
  - `~/.claude/hooks/statusline-wrapper.ps1` (**outside the repo**) — captures the block and writes
    `` "`n" + $block `` only when non-empty, so an unbridged session costs no blank row.
  - Docs: `plugins/slot/README.md` (both wiring snippets + the block's anatomy), the stale
    `[WISP] statusline badge` string in `packages/vscode/webview/app.tsx`, `packages/tui/CHANGELOG.md`
    (2.0.42 with its own `### Surfaces`), version bumps in `packages/tui/package.json` +
    `plugins/slot/.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json`.
- **Blocked:** nothing blocking. Open items are all human-optional, listed under Open questions.

## Pick up here

**#200 is the one agent-ready ticket.** `gh issue list --label ready-for-agent --state open` is the gate.

1. **#200** — recon on the four wires with no `onQuota` (xai, antigravity, keyed ×2): capture the real
   response heads, record a verdict each, file follow-up implementation tickets only for wires whose verdict
   is `parseable meter`. Needs live sign-ins; an unreachable wire is recorded as *not captured*, never
   guessed. Capture-only by construction — no parser and no `status.ts` change lands in it.
2. **#69** — copilot-wisp launcher, ungroomed. `grill-me` / `/preset init`.
3. **#163** — waiting, not working (watch the 217k–245k band for refusals).

## Skills for next session

- `/preset pick-up` — the baton at [[pick-up]] is current as of `5592f44`.
- `packages/tui:verify` — scoped skill (discovered this session, `packages/tui/.claude/skills/verify`).
  Sandboxed `WISP_HOME` + real Bun entry points; use it for any `packages/tui` or core-that-tui-bundles
  change, and before any npm cut.

## Open questions

- **`/plugin update wisp-slot`** — hygiene only. The install record is still **1.6.0**
  (`~/.claude/plugins/cache/wisp-router/wisp-slot/1.6.0`, whose cached statusline is the old badge — 0 hits
  on the new markers), while the checkout is 1.7.0. Nothing behavioral is missing: `plugins/slot/hooks` and
  `skills` last moved at `0965cab`, before that install, and the block the user actually sees comes from the
  checkout via the wrapper ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]).
- **vsix not cut this pass.** The extension bundles its own `@wisp/core`, so it gains the ledger when next
  packaged; 1.11.0 is still the newest build and **still not installed**. Deliberate — adding a second
  uninstalled vsix to the pile is worse than waiting.
- Carried over, unchanged: dismiss the two secret-scanning alerts as won't-fix; rotate `bridgeSecret` in
  `~/.wisp/auth.json` (low urgency); **#170** needs a Kimi Code subscription; **#189**'s last criterion (a
  Claude-model turn *completing* on Antigravity after the `2026-07-30T20:55:48Z` reset — note it on closed
  #189); ~19 stale local `ticket/*` branches.

## Recent context

- **The ledger reads empty on this machine and that is correct, not broken.** Every turn has been
  `opus → anthropic`, and the ledger deliberately never holds the *active* Provider. One turn on a
  codex-routed family (`sonnet → codex/gpt-5.6-sol`) creates the `codex … Xm ago` row. Do not debug an
  empty `providers` map without first checking whether a second Provider has actually served a turn.
- **`impeccable` was deliberately skipped** despite the routing table's "frontend design → impeccable" row.
  It is the *web* engine — it gates on PRODUCT.md and browser probes, and its own description excludes
  non-UI work. An ANSI terminal renderer is not what it audits. Noted rather than obeyed blindly.
- **`●○` are Unicode-ambiguous width** and chosen anyway: they are what the reference panel uses and what
  reads as a meter at a glance. They render single-width except in terminals configured to treat
  CJK-ambiguous as wide. The file's older comment about avoiding wide glyphs (`⚠`) still stands for
  *symbols*; this is a deliberate exception with the reason in the code.
- **A non-zero percentage never renders as an empty bar** — `filled` is floored at 1 cell above 0%, because
  0% and 3% mean different things and rounding 3% to nothing makes a spending account look untouched.
- Release verification followed the house rule end to end: `release.yml` run
  [30506981631](https://github.com/EstarinAzx/Wisp-Router/actions/runs/30506981631) green; registry reads
  2.0.42 on both the shell and `@tsd47216/wisp-router-win32-x64`; bins **executed** from a scratch install
  under a sandboxed `WISP_HOME`; and the **2.0.41 control failed the identical grep** — the compiled
  `wisp.exe` carries `mergeStatus`/`readStatus`/`QUOTA_LEDGER_MAX_AGE_MS` at 2.0.42 and scores **0** at
  2.0.41 ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]).
- The `wisp-slot` version still lives in **two** files, and both moved: `plugins/slot/.claude-plugin/plugin.json`
  and `.claude-plugin/marketplace.json`.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]
- [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
