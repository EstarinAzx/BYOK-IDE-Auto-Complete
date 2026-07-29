---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last firing (2026-07-29, relay leg 5): #169 landed.** `7b8d73d` on main (PR #176, squash-merged), ticket
closed with **seven of eight acceptance criteria machine-checked**. API-key Providers now opt into usage with
`stream_options: { include_usage: true }` and map their final chunk through a new `chatCompletionsUsage` in
`bridge.ts`. Gate was 731/731 + `bun run compile` clean. The eighth criterion is manual and carried below.

**Usage reporting is now complete across the whole catalog** — every Provider kind reports real tokens.

## The one next task: ticket #170

`ready-for-agent` = **#170–#173** (4 left). Unblocked right now: **#170**, **#171** and **#172** — #169
released the last two of those. **#170 is next by age** — "Kimi Provider via device flow".

The relay chain is live (`.claude/relay/ticket-loop.md`, `stop: false`), so a leg should already be working
this. If no leg is running, re-issue:

```
/relay N=1 /preset ticket-loop -> after the ticket's gate (tests green + landed, or ready-for-human relabel), run /preset wrap-up gateless: eyeball gate auto-go (unattended), /context-update, rewrite .context/pick-up.md to the next unblocked ready-for-agent ticket or 'queue empty', commit .context on main — never the ticket branch. At leg boot also read .context/pick-up.md.
```

Don't re-plan or re-scope — ordering is settled in
[[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]], and each ticket carries its own
acceptance criteria.

## Where #170's code goes (read this before opening a file)

#170 is **wider than the last four tickets** — it is a new Provider end to end, not a one-function change.
Four landing zones, and the ticket says explicitly it lands as *a record, not a handler*:

- **The auth manager is the bulk of it.** `packages/core/src/codexAuth.ts` / `anthropicAuth.ts` are the
  shipped siblings (moved to core in #61: editor-free, injected `openExternal`, injected auth.json store
  slices). Kimi's flow is **simpler than both** — RFC 8628 device authorization means **no loopback redirect
  catcher and no PKCE**, because the user authorizes out of band. Request a device code → show the
  verification URL + user code → poll the token endpoint at the server's stated interval.
- **The catalog row goes in `catalog.ts`'s `PROVIDERS` array** — shared by both faces since #60. Kimi is
  OpenAI-compatible on the wire, so it takes **no `kind`** and falls through to the keyed executor. That is
  what makes the ticket's "inherits usage reporting from #169" true for free — verify it, don't rebuild it.
- **No new chat handler.** #167's `ProviderExecutor` table already has the keyed record matching everything;
  a keyless-OAuth-but-OpenAI-compatible Provider is the one shape that table has not carried yet — check how
  `deps.clientFor` resolves a Provider whose credential is an **OAuth token rather than an API key** before
  assuming the keyed record covers it unchanged. This is the ticket's real design question.
- **Credentials live in `~/.wisp/auth.json`**, owner-only, per ADR-0002 (#59). Never in editor settings.
  Refresh ahead of expiry on the same schedule as the other Providers; sign-out must revoke.

Reference values are in the ticket body (auth host, endpoints, client id, 5s poll, 15 min window, 5 min
refresh lead) — the ticket itself says **re-verify before hardcoding**.

## Landmines

- **`blockedBy` lies on these tickets.** Their `## Blocked by` is **prose in the issue body**; the native
  GitHub dependency links are not set, so the GraphQL query returns an **empty list even for a genuinely
  blocked ticket** (#173 reads empty while three of its four blockers are open). Read the body section and
  cross-check [[active-work]]'s queue table.
  [[harvest-tickets-carry-body-text-blockers-not-native-links]]
- **#169 has a manual acceptance criterion** an unattended leg could not tick — see the carried actions
  below. It was closed with the box unticked, per the #167 precedent. Don't reopen it to re-do the work; the
  code shipped and is machine-tested.
- **The untested #169 failure mode is a 400, not silence.** The criteria covered a backend that *ignores*
  `stream_options`. A strict OpenAI-compatible backend that **400s on an unknown parameter** was never
  exercised. Post-#168 that is loud — a 400 is neither classified nor transient, so it fails fast with the
  backend's own words and is **not** retried. If Kimi rejects it, the fix is a per-row opt-out flag, not
  removing the opt-in for everyone.
- **#165 is still unverified live — this is the #163 verdict and it needs a human.** Restart the Bridge on
  this build, bridge a Codex session, read `/context`. Non-zero ⇒ diagnosis right. Still zero ⇒ the
  tighter-OAuth-cap hypothesis is back. **Leave #163 open until this runs.** #169's check can ride the same
  session — different door, different Provider.
- **RUN `bun run compile`, NOT JUST `bun run test`.** Vitest does not typecheck. This bit leg 1 (a widened
  union broke `else`-narrowing at six sites with all 676 tests green):
  [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]. A new Provider *kind* — if #170
  needs one — is exactly that shape of change.
- **The #168 constants were picked cold, never tuned** — 3 attempts / 200ms base / 30s cooldown after 3 failed
  requests in a 120s window, all in `routing.ts`. Grep the Bridge log for `#168` after the first real transient
  event. Not #170's job.
- **Codex OAuth path rejects `gpt-5.3-codex` and bare `gpt-5.6`** — `gpt-5.6-sol` and `gpt-5.4` return 200.
  That's #172; don't delete the id, it's still valid for API-key callers and in caps tiering. Related: #166
  deliberately does **not** map 403 → auth, because that path 403s model rejections too.
- **Anthropic quota is a FRACTION (0.22), Codex is an INTEGER percent (7).** Normalize or #171's meters land
  100× apart. Don't filter headers by keyword regex — that missed `x-codex-primary-used-percent`.
- **A transcript's `model` may not be the model that served the turn** — the door echoes the *requested*
  name. Open question, deliberately untouched.
- **Fold transcript rows by `message.id` before concluding anything** —
  [[cc-transcript-rows-are-blocks-not-messages]].
- **Test-fixture trap if you touch stream tests:** `ReadableStream` `controller.error()` discards the queued
  chunks — [[readablestream-error-discards-the-queued-chunks]].
- **`.context/` commits go to main, never a ticket branch.**
- Relay gotchas (unchanged): leg boot reads `overview.md` + `active-work.md`, NOT this file — hence the
  trailing "at leg boot also read .context/pick-up.md"; `/preset wrap-up` step 1 is a human eyeball gate an
  unattended leg treats as auto-go; relay spawns with `binary: claude` (native, NOT `claude-wisp` — legs must
  not route through the Bridge they are editing); the body uses 'queue empty' in single quotes (double quotes
  shred the cmd spawn quoting).

## Carried-over user actions

All four want the **same session** — one Bridge restart covers them:

- **Verify #165 live** (above) — the decisive check, now carrying five shipped tickets.
- **Verify #169 live** — a bridged session on the **default** Provider (OpenCode Go) must report non-zero
  tokens in `/context`. Run it through **Claude Code / the Anthropic door**, not curl against
  `/v1/chat/completions` — the OpenAI door deliberately drops usage events.
- **#167's manual criterion**: one turn each through Codex, Anthropic and Grok, confirming all three still
  stream through the Bridge. Still outstanding, and #168/#169 both touched shared paths since.
- **Install `packages/vscode/wisp-1.9.0.vsix`** — still not done.

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
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
