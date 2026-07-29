---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last firing (2026-07-29, relay leg 8): #171 landed.** `3e0125e` on main (PR #179, squash-merged), ticket
closed with **every acceptance criterion checked**. The Bridge now writes `~/.wisp/status.json` after each
bridged turn on the Anthropic door, and the `wisp-slot` statusline renders
`[WISP haiku→gpt-5.6-sol ctx 122% 5h 4% 7d 22%]`. Gate was **779/779** (759 → 779, +20 new tests) and
`bun run compile` clean in **both** packages.

## The one next task: ticket #173 — cut `wisp-router` 2.0.38

**`ready-for-agent` = #173, and that is the whole queue.** All eight of its blockers are closed. It is the
last ticket in spec #164, and shipping it is what makes the eight-ticket harvest reachable by users.

The relay chain is live (`.claude/relay/ticket-loop.md`, `stop: false`, leg 9), so a leg should already be
working this. If no leg is running, re-issue:

```
/relay N=1 /preset ticket-loop -> after the ticket's gate (tests green + landed, or ready-for-human relabel), run /preset wrap-up gateless: eyeball gate auto-go (unattended), /context-update, rewrite .context/pick-up.md to the next unblocked ready-for-agent ticket or 'queue empty', commit .context on main — never the ticket branch. At leg boot also read .context/pick-up.md.
```

## What #173 actually needs (read before opening a file)

- **Release mechanics are established, not to be redesigned.** Delivery is per-platform `bun build --compile`
  binaries published by the **tag-triggered** workflow (`.github/workflows/release.yml`, tag `v*`). **The git
  tag must equal the version in `packages/tui/package.json`** or the workflow never matches. The TUI keeps its
  own `CHANGELOG.md` covering 2.0.11 onward.
- **The judgement call is the real work.** #172 changed the **shared catalog**, which reaches the picker and
  native chat — surfaces that ship only in the **vsix**, not on npm. #173 has an explicit acceptance criterion
  demanding a recorded decision, with reasoning, on whether a matching vsix bump is owed. Answer it; don't
  leave it implicit, and don't assume npm alone suffices because the title says npm.
- **Release notes must say which surface each change reaches** (npm Bridge vs vsix picker / native chat) —
  also an acceptance criterion, not a nicety.
- **`packages/tui:verify`** is finally the right tool — this ticket bumps the TUI package.
- **⚠️ This ticket publishes to npm** — the one outward-facing, hard-to-reverse action in the batch. The
  `ready-for-agent` label plus the spec's "final leg of the relay run" is the authorization; the *reasoning*
  for the vsix half still has to be written down.

## What #171 shipped (for #173's release notes)

- **Bridge → `~/.wisp/status.json`**, written by the **Anthropic door only** (Claude Code's route), carrying
  the turn's real usage against the model's window plus the account's quota utilization.
- **Reaches npm** (the TUI hosts the Bridge via `wisp serve` / `claude-wisp`) **and** the vsix (the extension
  hosts the same engine) **and** the marketplace plugin (the statusline script that reads the file). Three
  surfaces — worth calling out precisely in the notes.
- New pure module `packages/core/src/status.ts`; `onQuota` callbacks in the two OAuth clients;
  `WispHome.writeStatus`; an optional `recordStatus` dep on the Bridge.

## Landmines

- **RUN `bun run compile` IN BOTH PACKAGES.** The root script only covers `packages/vscode`;
  `packages/tui` has its own (`tsc -p ./`). Vitest does not typecheck either —
  [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]].
- **`status.json` is a cross-release compatibility surface.** Core writes it; the `wisp-slot` plugin's
  statusline script reads it. Adding fields is free (the reader ignores unknown keys); renaming or removing
  one needs both sides to move in the same release.
- **Anything volatile written into `~/.wisp` must be excluded from the dir watcher** in `homeStore.ts`, or
  every write wakes both faces to re-read `config.json`. `status.json` is the first such file.
- **Don't widen `BridgeStreamEvent` casually.** The Anthropic encoder's `push()` reads an unrecognized event
  as a **client tool call**, so an unhandled member invents a `tool_use` block instead of degrading.
  [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]].
- **#165 is still unverified live — this is the #163 verdict and it needs a human.** Restart the Bridge on
  this build, bridge a Codex session, read `/context`. Non-zero ⇒ diagnosis right. Still zero ⇒ the
  tighter-OAuth-cap hypothesis is back. **Leave #163 open until this runs.** Eight shipped tickets ride on it.
- **#171's end-to-end path rides that same trip.** After a real bridged turn, `~/.wisp/status.json` should
  exist. Absent ⇒ `recordStatus` never fired. Present but the badge shows no readings ⇒ the reader's
  30-minute staleness window or its model-match guard.
- **A model list is not an accepted list.** Changing the Codex default again means **probing first**, then
  widening the whitelist —
  [[2026-07-29-a-model-list-is-not-an-accepted-list-whitelist-the-probed-ids]].
- **The untested #169 failure mode is a 400, not silence.** A backend that **400s on an unknown parameter**
  was never exercised against `stream_options`. The fix would be a per-row opt-out flag, not removing the
  opt-in for everyone.
- **#170's auth constants are unverified** — host `auth.kimi.com`, client id, endpoints, all quoted from the
  ticket because the CLIProxyAPI source path 404s. A wrong value **fails loud** at sign-in.
- **Anthropic quota is a FRACTION (0.22), Codex is an INTEGER percent (7).** Normalized in `status.ts` — do
  not re-normalize downstream. And never filter headers by keyword regex; that missed
  `x-codex-primary-used-percent` during the recon.
- **A transcript's `model` may not be the model that served the turn** — the door echoes the *requested*
  name. Open question, deliberately untouched.
- **Fold transcript rows by `message.id` before concluding anything** —
  [[cc-transcript-rows-are-blocks-not-messages]].
- **`.context/` commits go to main, never a ticket branch.**

## Carried-over user actions

All want the **same session** — one Bridge restart covers the first four:

- **Verify #165 live** (above) — the decisive check, now carrying eight shipped tickets.
- **Verify #171 live** — same trip: a real turn should produce `~/.wisp/status.json` and a `ctx …%` badge.
- **Verify #169 live** — a bridged session on the **default** Provider (OpenCode Go) must report non-zero
  tokens in `/context`. Run it through **Claude Code / the Anthropic door**, not curl against
  `/v1/chat/completions` — the OpenAI door deliberately drops usage events.
- **Verify #172 live** — a fresh Codex sign-in that never picks a model completes a turn.
- **#167's manual criterion**: one turn each through Codex, Anthropic and Grok, confirming all three still
  stream through the Bridge.
- **#170's two criteria** — needs a Kimi Code subscription. `wisp` → `/signin kimi`, approve at the printed
  URL, bridge a turn, check `/context` reports non-zero. The sign-in doubles as the constants check.
- **Install `packages/vscode/wisp-1.9.0.vsix`** — still not done.

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]]
- [[2026-07-29-a-model-list-is-not-an-accepted-list-whitelist-the-probed-ids]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[2026-07-29-oauth-credentialed-but-keyed-on-the-wire-resolves-at-the-keyfor-seam]]
- [[a-shared-bearer-rule-or-the-oauth-row-401s-on-half-the-paths]]
- [[2026-07-29-chat-completions-usage-is-a-sibling-mapper-not-a-shared-one]]
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]]
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]]
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]
- [[readablestream-error-discards-the-queued-chunks]]
- [[harvest-tickets-carry-body-text-blockers-not-native-links]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
- [[cc-transcript-rows-are-blocks-not-messages]]
