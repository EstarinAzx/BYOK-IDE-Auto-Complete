---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (relay leg 6 — #170 landed)._
_At commit: `d656686` on main, pushed. The relay chain is live; leg 7 works #172._

## Current focus

**The relay is draining the CLIProxyAPI harvest** (spec #164). Legs 1–6 landed **#165** (Responses-wire
usage), **#166** (error classification), **#167** (the ProviderExecutor seam), **#168** (retry + transient
cooldown), **#169** (API-key usage) and **#170** (the Kimi Provider). Three remain — and **one of those three
should not be taken by an agent** (see the queue).

**Usage reporting is complete across the catalog**, and #170 proved it extends for free: Kimi inherited it
without a line of usage code, because it rides the keyed path.

**The verdict is still not in.** #165's last acceptance criterion — a bridged Codex session reading non-zero
`/context` — needs a human with a restarted Bridge. **Six** shipped tickets now ride on that check.

## State

- **In flight:** nothing. Working tree clean on main; relay leg 7 due on #172.
- **Done this session (relay leg 6):**
  - **#170 landed** — `d656686` on main (PR #177, squash-merged), ticket closed with **nine of eleven
    acceptance criteria machine-checked**; the two open ones need a Kimi Code subscription.
  - **The keyed record did NOT cover an OAuth token unchanged — but the gap was one seam, not one
    executor.** `clientFor` builds from `keyFor`, which reads the keys map. Teaching `keyFor` about Kimi
    carries it through the keyed executor, the picker's usability check, the Bridge model list and Inquire
    with no new branch anywhere. Decision:
    [[2026-07-29-oauth-credentialed-but-keyed-on-the-wire-resolves-at-the-keyfor-seam]].
  - **`kind: 'kimi-oauth'` is a UI marker only.** Nothing dispatches on it — every kind check is an
    `=== 'string'` comparison, so Kimi falls through to the keyed executor by construction. The marker only
    tells the faces "offer sign-in, not a key field".
  - **New trap, cost two silent 401s in review:** the TUI had **three** copies of the bearer-resolution rule.
    [[a-shared-bearer-rule-or-the-oauth-row-401s-on-half-the-paths]].
  - **The root `compile` script only covers `packages/vscode`.** This leg changed six TUI files; `packages/tui`
    has its own `bun run compile` and must be run separately or its type errors ship silently.
  - Gate: **758/758 tests** (+27), `bun run compile` clean in **both** packages.
- **User action pending:**
  - **Decide what #171 is** — see the queue note. This is the only one blocking the relay's ordering.
  - **Verify #165 live** — restart the Bridge on this build, bridge a Codex session, read `/context`.
    This is the #163 verdict; see [[pick-up]] for what each outcome means.
  - **Verify #169 live** — same trip, different door: a bridged session on the **default** Provider
    (OpenCode Go) must report non-zero tokens in `/context`. Watch for a **400 naming `stream_options`**
    rather than silence — that is the failure mode the acceptance criteria did *not* cover.
  - **#167's manual criterion is still outstanding** — one turn each through Codex, Anthropic and Grok to
    confirm all three still stream. Unchanged by #168/#169 in intent, but both touched shared paths.
  - **#170's two open criteria** — needs a Kimi Code subscription: the live device sign-in round trip, and a
    Kimi turn reporting real usage through the Bridge. **The auth constants are unverified** (host, client
    id, endpoints) — the CLIProxyAPI source path 404s. A wrong one fails loud at sign-in, so the sign-in
    attempt IS the verification.
  - **Install `packages/vscode/wisp-1.9.0.vsix`** (carried over, still not done).

## Queue — 3 tickets left, all labelled `ready-for-agent`

| # | Ticket | Blocked by |
|---|---|---|
| ~~165~~ | ~~Codex and Grok turns report real token usage~~ | **DONE — `1971541`** |
| ~~166~~ | ~~Codex failures classified into real HTTP statuses~~ | **DONE — `07969d2`** |
| ~~167~~ | ~~Collapse three Bridge handlers into one ProviderExecutor record~~ | **DONE — `c697733`** |
| ~~168~~ | ~~Transient failures retried and cooled down~~ | **DONE — `89f94c5`** |
| ~~169~~ | ~~API-key Providers report real token usage~~ | **DONE — `7b8d73d`** |
| ~~170~~ | ~~Kimi Provider via device flow~~ | **DONE — `d656686`** |
| **172** | Codex Provider default model rejected by ChatGPT-account path | — (**next**) |
| 171 | Statusline: live context percentage + quota meters | ⚠️ **label contradicts its own body — human call** |
| 173 | **Cut `wisp-router` 2.0.38** — ship the harvest | 171, 172 |

Also open, ungroomed: **#69** (copilot-wisp launcher), **#163** (502 observation — #165+#166 are its
candidate fix; leave open until the live `/context` check confirms).

- **#172 is next** — genuinely unblocked, self-contained, and its body says so explicitly.
- **⚠️ #171 carries a contradiction an agent must not resolve on its own.** It is *labelled*
  `ready-for-agent`, but its body ends with: *"Deliberately left without the `ready-for-agent` label until
  the recon resolves… an unattended agent should not be sent at a display it cannot source data for. Label
  it once the header capture answers the question — or split the committed context-percentage half out and
  label that alone."* Two of its three blockers (#165, #169) are done; the third is the response-header
  recon, which is the ticket's own first step. **Leg 6 honoured the body and skipped it.** A human should
  either do the recon, split the ticket, or drop the label.
- **These edges are body text, not native links** — GraphQL `blockedBy` reports empty for all of them. See
  [[harvest-tickets-carry-body-text-blockers-not-native-links]] before trusting a dependency query. #171 is
  the sharper version of that trap: **the label itself can lie too.**

## Pick up here

The relay is running — leg 7 takes **#172**. Do not re-plan; the tickets carry their own acceptance criteria
and the ordering rationale is settled in
[[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]. The one deviation from strict age order
is #171, and its reason is in the queue table.

## Skills for next session

- `/preset pick-up` — session door (the baton points straight at the relay).
- `/relay N=1 /preset ticket-loop` — exact command preserved in [[pick-up]].
- `packages/tui:verify` — sandboxed CLI verification for TUI command-surface changes.

## Open questions

- **Does #165 actually kill the 502s?** Still THE decisive test. Restart the Bridge, bridge a Codex session,
  confirm `/context` reads non-zero, then watch whether the 217k–245k cluster stops recurring. If it does not,
  the tighter-OAuth-cap hypothesis is back — and #166 now means the next failure arrives as a **400 naming the
  cause** rather than an opaque 502, with #168 having already retried it three times first.
- **Does any keyed backend reject `stream_options`?** New with #169 and unverified live. The criterion covered
  a backend that *ignores* the opt-in; the untested case is a strict one that **400s on an unknown parameter**.
  Loud rather than silent post-#168. If one does, the fix is a per-row opt-out flag, not removing the opt-in.
- **Are the #168 constants right in production?** 3 attempts / 200ms base / 30s cooldown after 3 failed
  requests in 120s were picked cold, never tuned against a real outage. They are one-line changes in
  `routing.ts`; revisit after the first real transient event shows up in the Bridge log (grep `#168`).
- **Should the two doors' provider dispatch ever fully merge?** Left open on purpose (#167). It costs one flag
  per wire difference today; revisit only when a backend actually needs the same shaping on both doors, and
  only with permission to move wire behaviour.
- **Is `kimi-k2.7-code` a real Kimi Code model id?** Best-effort. models.dev carries **no first-party
  Kimi/Moonshot provider** (checked 2026-07-29 — Kimi models appear only inside `fireworks-ai`, `wandb` and
  `crossmodel`), so the row takes no `catalogKey` and caps fall to the neutral default. The row serves a live
  `/models` route, so the picker is the correction path. Same for the auth host/client id/endpoints.
- **ANSWERED (leg 6):** ~~does the keyed record cover an OAuth-token Provider unchanged?~~ No — but the gap
  is one seam (`keyFor`), not one executor. See the decision entry.
- **ANSWERED (leg 5):** ~~can the two usage mappers be one function?~~ No — sibling, not shared. See the
  decision entry.
- **ANSWERED (leg 4):** ~~does the retry wrap the shared error answer?~~ No — the cooldown does, the retry
  wraps priming.
- **ANSWERED (leg 3):** ~~is `startProviderStream` a fourth copy of the OpenAI door's handlers?~~ No — it
  shares their four kinds but not their request shaping.
- **ANSWERED (leg 2):** ~~can the doors even set an error status on a streaming request?~~ Only if the stream
  is primed first — now uniform across every path.
- **ANSWERED (leg 1):** ~~do non-Anthropic Providers report usage?~~ No — and as of #169 every Provider kind
  does.
- **Should the door echo the resolved target instead of the requested model name?** Unchanged, still open.
- **The 2026-07-25 10:11 turn reports 484 output tokens with no surviving content block.** Still unexplained.
- **Does the Agent tool ever take a non-enum model?** Re-check after a Claude Code minor bump.

## Recent context

- **CLIProxyAPI is worth re-reading, not re-cloning blind.** Sponsor-funded and further along on usage, error
  taxonomy, retry and multi-provider auth. Most does not apply; the three modules worth reading are named in
  the decision entry.
- **It ships Kimi and Antigravity today** — Kimi shipped as #170; Antigravity is ~5,600 lines and gets its
  own spec. Worth noting for that spec: the CLIProxyAPI source path the Kimi ticket cited **404s**, so plan
  to re-derive constants rather than quote them.
- **Response headers are load-bearing and Wisp currently discards them** — #171 adds the snapshot.
- **The vsix is the ship vehicle for picker/native-chat surfaces**; npm releases don't reach them.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[2026-07-29-oauth-credentialed-but-keyed-on-the-wire-resolves-at-the-keyfor-seam]]
- [[a-shared-bearer-rule-or-the-oauth-row-401s-on-half-the-paths]]
- [[2026-07-29-chat-completions-usage-is-a-sibling-mapper-not-a-shared-one]]
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]]
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]]
- [[readablestream-error-discards-the-queued-chunks]]
- [[harvest-tickets-carry-body-text-blockers-not-native-links]]
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]]
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]]
- [[cc-transcript-rows-are-blocks-not-messages]]
