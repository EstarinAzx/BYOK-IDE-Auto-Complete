---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last firing (2026-07-29, relay leg 6): #170 landed.** `d656686` on main (PR #177, squash-merged), ticket
closed with **nine of eleven acceptance criteria machine-checked**. Kimi ships as a Provider: OAuth device-flow
sign-in, ordinary OpenAI-chat wire, no new chat handler. Gate was **758/758** (+27) and `bun run compile` clean
in **both** packages. The two open criteria need a Kimi Code subscription and are carried below.

**Kimi inherited usage reporting for free** — it rides the keyed path, so #169 covered it with no new code.
That is the harvest's design paying off.

## The one next task: ticket #172

`ready-for-agent` = **#171, #172, #173** (3 left). **#172 is next** — "Codex Provider default model is
rejected by the ChatGPT-account path". It is *not* the oldest; see the #171 warning below, which is the
whole reason for the deviation.

The relay chain is live (`.claude/relay/ticket-loop.md`, `stop: false`), so a leg should already be working
this. If no leg is running, re-issue:

```
/relay N=1 /preset ticket-loop -> after the ticket's gate (tests green + landed, or ready-for-human relabel), run /preset wrap-up gateless: eyeball gate auto-go (unattended), /context-update, rewrite .context/pick-up.md to the next unblocked ready-for-agent ticket or 'queue empty', commit .context on main — never the ticket branch. At leg boot also read .context/pick-up.md.
```

Don't re-plan or re-scope — ordering is settled in
[[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]], and each ticket carries its own
acceptance criteria.

## Where #172's code goes (read this before opening a file)

#172 is **the smallest ticket in the batch** — a one-value change plus the tests that prove nothing else
moved. Its body says explicitly: *scope carefully.*

- **The change is one field**: the `codex` row's `defaultModel` in `packages/core/src/catalog.ts`'s
  `PROVIDERS` array, currently `'gpt-5.3-codex'`. Suggested replacement `gpt-5.6-sol` (verified 200 by live
  probe 2026-07-29; `gpt-5.4` also returns 200).
- **Do NOT delete `gpt-5.3-codex` anywhere else.** This is an *account-path* restriction, not a
  model-existence one — the id stays valid for API-key callers and must stay in `codexModelCaps` tiering.
  The ticket calls this out, and an over-eager cleanup is the obvious way to fail it.
- **The caps-tiering tests are branch-ORDER sensitive.** `codexModelCaps` matches by pattern; an acceptance
  criterion names those tests specifically. Run the suite before and after and diff the counts.
- It is plausible this needs **no new test at all** beyond the existing ones staying green — the ticket's
  criterion 4 is literally "existing tests pass, caps-tiering branch-order tests in particular untouched."

## Landmines

- **⚠️ #171 is labelled `ready-for-agent` but its own body says it should not be.** Verbatim: *"Deliberately
  left without the `ready-for-agent` label until the recon resolves. Half of this ticket is not yet known to
  be possible, and an unattended agent should not be sent at a display it cannot source data for."* Two of
  its three blockers (#165, #169) are done; the third is the response-header recon, which is the ticket's own
  first step. **Leg 6 honoured the body and skipped to #172.** A human decides: do the recon, split the
  committed context-percentage half out, or drop the label. **Do not let a leg silently take it** — this is
  the sharper cousin of [[harvest-tickets-carry-body-text-blockers-not-native-links]]: *the label can lie too.*
- **RUN `bun run compile` IN BOTH PACKAGES.** The root script only covers `packages/vscode`.
  `packages/tui` has its own `bun run compile` (`tsc -p ./`). Leg 6 changed six TUI files and the root gate
  would have passed with TUI type errors unnoticed. Vitest does not typecheck either —
  [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]].
- **Adding a Provider that is credentialed one way but requested another? Grep for EVERY
  `keys?.[resolveKeyId(` site first.** The TUI had three; fixing one gives a signed-in user silent 401s from
  the others. [[a-shared-bearer-rule-or-the-oauth-row-401s-on-half-the-paths]].
- **`kind` on a catalog row is now two independent axes.** How the credential is obtained vs which wire
  carries the turn. `kimi-oauth` is the first row where they differ, and nothing dispatches on it —
  [[2026-07-29-oauth-credentialed-but-keyed-on-the-wire-resolves-at-the-keyfor-seam]].
- **#165 is still unverified live — this is the #163 verdict and it needs a human.** Restart the Bridge on
  this build, bridge a Codex session, read `/context`. Non-zero ⇒ diagnosis right. Still zero ⇒ the
  tighter-OAuth-cap hypothesis is back. **Leave #163 open until this runs.** #169's check can ride the same
  session — different door, different Provider.
- **The untested #169 failure mode is a 400, not silence.** A strict OpenAI-compatible backend that **400s
  on an unknown parameter** was never exercised against `stream_options`. If Kimi (or any keyed row) rejects
  it, the fix is a per-row opt-out flag, not removing the opt-in for everyone.
- **#170's auth constants are unverified** — host `auth.kimi.com`, client id, endpoints, all quoted from the
  ticket because the CLIProxyAPI source path 404s. A wrong value **fails loud** at sign-in with the server's
  own words (post-#166 a 4xx is neither classified nor transient), so the first real sign-in IS the check.
  Same for `defaultModel: 'kimi-k2.7-code'` — no models.dev entry exists to check it against.
- **Codex OAuth path rejects `gpt-5.3-codex` and bare `gpt-5.6`** — `gpt-5.6-sol` and `gpt-5.4` return 200.
  That's #172 itself. Related: #166 deliberately does **not** map 403 → auth, because that path 403s model
  rejections too.
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

All want the **same session** — one Bridge restart covers the first three:

- **Verify #165 live** (above) — the decisive check, now carrying six shipped tickets.
- **Verify #169 live** — a bridged session on the **default** Provider (OpenCode Go) must report non-zero
  tokens in `/context`. Run it through **Claude Code / the Anthropic door**, not curl against
  `/v1/chat/completions` — the OpenAI door deliberately drops usage events.
- **#167's manual criterion**: one turn each through Codex, Anthropic and Grok, confirming all three still
  stream through the Bridge. Still outstanding, and #168/#169/#170 have touched shared paths since.
- **#170's two criteria** — needs a Kimi Code subscription. Run `wisp` → `/signin kimi`, approve at the URL
  it prints, then bridge a turn and check `/context` reports non-zero. The sign-in doubles as the constants
  check.
- **Decide what #171 is** (see landmines) — this one blocks the relay's ordering, not just a checkbox.
- **Install `packages/vscode/wisp-1.9.0.vsix`** — still not done.

## Related

- [[active-work]]
- [[overview]]
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
