---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last firing (2026-07-29, relay leg 7): #172 landed.** `49761d8` on main (PR #178, squash-merged), ticket
closed with **three of four acceptance criteria machine-checked**. The Codex Provider's default model is now
`gpt-5.6-sol` — an id the ChatGPT-account path actually accepts. Gate was **759/759** (758 → 759, exactly the
one new test) and `bun run compile` clean in **both** packages.

## The queue is empty for agents — the relay STOPPED itself

**No leg 8 was spawned, and that is deliberate.** `.claude/relay/ticket-loop.md` now carries `stop: true`.

Two tickets remain and **neither is agent-takeable**:

- **#171** — labelled `ready-for-agent`, but its own body says it should not be. See the landmine below.
- **#173** (the release cut) — genuinely blocked. Seven of its eight blockers are closed; **#171 is the
  last one.**

So the chain is blocked on exactly one thing, and it is a human's call. Spawning another leg would only
re-derive this same state and burn a session.

## The one next task: decide what #171 is

Three legitimate options — pick one:

1. **Do the response-header recon** (it is the ticket's own first step). Then #171 is genuinely agent-ready
   and the whole chain unblocks.
2. **Split it** — carve the committed context-percentage half into its own ticket and label *that*
   `ready-for-agent`; leave the quota-meter half unlabelled pending recon.
3. **Drop the `ready-for-agent` label** on #171 and let #173 ship the harvest without it.

Options 2 and 3 unblock #173 immediately. Option 1 unblocks everything.

**Once #171 is resolved, restart the relay** — it will drain the rest:

```
/relay N=1 /preset ticket-loop -> after the ticket's gate (tests green + landed, or ready-for-human relabel), run /preset wrap-up gateless: eyeball gate auto-go (unattended), /context-update, rewrite .context/pick-up.md to the next unblocked ready-for-agent ticket or 'queue empty', commit .context on main — never the ticket branch. At leg boot also read .context/pick-up.md.
```

Restarting it **before** #171 is resolved will just stop again on the first firing.

## What #172 actually changed (for #173's release notes)

- **One production field**: the `codex` row's `defaultModel` in `packages/core/src/catalog.ts`,
  `gpt-5.3-codex` → `gpt-5.6-sol`. Every surface reaches the model through `resolveModel`, so one field
  covers both Bridge doors, the VS Code chat provider, Inquire, the status bar and the TUI test screen.
- **`gpt-5.3-codex` was not deleted anywhere** — still in `CODEX_MODELS`, still tiered by `codexModelCaps`,
  still valid for API-key callers. It is an account-path restriction, not a model-existence one.
- **This touches the shared catalog**, so it reaches the picker and native chat — which only ship in the
  **vsix**. #173 has an acceptance criterion demanding an explicit decision on whether a vsix bump is owed;
  this is the change that makes the answer non-obvious.

## Landmines

- **⚠️ #171's label lies.** Verbatim from its body: *"Deliberately left without the `ready-for-agent` label
  until the recon resolves. Half of this ticket is not yet known to be possible, and an unattended agent
  should not be sent at a display it cannot source data for."* **Legs 6 and 7 both honoured the body and
  skipped it.** Do not let a future leg silently take it — this is the sharper cousin of
  [[harvest-tickets-carry-body-text-blockers-not-native-links]]: *the label can lie too.*
- **A model list is not an accepted list.** `CODEX_MODELS` answers "which Codex ids exist"; the
  ChatGPT-account path separately answers "which a subscription may send", and it is **narrower**. The new
  test whitelists **live-probed** accepted ids (`gpt-5.6-sol`, `gpt-5.4`) rather than pattern-matching the
  rejects — the two refused ids (`gpt-5.3-codex` and **bare `gpt-5.6`**) share no shape, so any regex would
  be fitted to two points. Changing the default again means **probing first**, then widening the whitelist.
  [[2026-07-29-a-model-list-is-not-an-accepted-list-whitelist-the-probed-ids]].
- **An invariant in a comment is an invariant that ships broken.** `codex.ts:197` already said "the codex
  row's defaultModel must stay a member of this list" and nothing checked it. That is half of why #172
  existed. If you write a rule in a comment, write the test in the same commit.
- **RUN `bun run compile` IN BOTH PACKAGES.** The root script only covers `packages/vscode`;
  `packages/tui` has its own (`tsc -p ./`). Vitest does not typecheck either —
  [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]].
- **#165 is still unverified live — this is the #163 verdict and it needs a human.** Restart the Bridge on
  this build, bridge a Codex session, read `/context`. Non-zero ⇒ diagnosis right. Still zero ⇒ the
  tighter-OAuth-cap hypothesis is back. **Leave #163 open until this runs.** Seven shipped tickets ride on it.
- **The untested #169 failure mode is a 400, not silence.** A strict OpenAI-compatible backend that **400s
  on an unknown parameter** was never exercised against `stream_options`. If one rejects it, the fix is a
  per-row opt-out flag, not removing the opt-in for everyone.
- **#170's auth constants are unverified** — host `auth.kimi.com`, client id, endpoints, all quoted from the
  ticket because the CLIProxyAPI source path 404s. A wrong value **fails loud** at sign-in, so the first real
  sign-in IS the check. Same for `defaultModel: 'kimi-k2.7-code'`.
- **Adding a Provider credentialed one way but requested another? Grep for EVERY `keys?.[resolveKeyId(`
  site first.** The TUI had three — [[a-shared-bearer-rule-or-the-oauth-row-401s-on-half-the-paths]].
- **`kind` on a catalog row is two independent axes** — how the credential is obtained vs which wire carries
  the turn. [[2026-07-29-oauth-credentialed-but-keyed-on-the-wire-resolves-at-the-keyfor-seam]].
- **Anthropic quota is a FRACTION (0.22), Codex is an INTEGER percent (7).** Normalize or #171's meters land
  100× apart. Don't filter headers by keyword regex — that missed `x-codex-primary-used-percent`.
- **A transcript's `model` may not be the model that served the turn** — the door echoes the *requested*
  name. Open question, deliberately untouched.
- **Fold transcript rows by `message.id` before concluding anything** —
  [[cc-transcript-rows-are-blocks-not-messages]].
- **Test-fixture trap if you touch stream tests:** `ReadableStream` `controller.error()` discards the queued
  chunks — [[readablestream-error-discards-the-queued-chunks]].
- **`.context/` commits go to main, never a ticket branch.**

## Carried-over user actions

All want the **same session** — one Bridge restart covers the first four:

- **Verify #165 live** (above) — the decisive check, now carrying seven shipped tickets.
- **Verify #169 live** — a bridged session on the **default** Provider (OpenCode Go) must report non-zero
  tokens in `/context`. Run it through **Claude Code / the Anthropic door**, not curl against
  `/v1/chat/completions` — the OpenAI door deliberately drops usage events.
- **Verify #172 live** — a fresh Codex sign-in that never picks a model completes a turn. This is #172's one
  unchecked acceptance criterion.
- **#167's manual criterion**: one turn each through Codex, Anthropic and Grok, confirming all three still
  stream through the Bridge.
- **#170's two criteria** — needs a Kimi Code subscription. `wisp` → `/signin kimi`, approve at the printed
  URL, bridge a turn, check `/context` reports non-zero. The sign-in doubles as the constants check.
- **Decide what #171 is** — see above. This one blocks everything else.
- **Install `packages/vscode/wisp-1.9.0.vsix`** — still not done.

## Related

- [[active-work]]
- [[overview]]
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
