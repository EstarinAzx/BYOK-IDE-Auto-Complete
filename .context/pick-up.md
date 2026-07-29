---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last firing (2026-07-29, relay leg 9): #173 landed — `wisp-router@2.0.38` is live on npm.** Commit
`55daebb` on main, tag `v2.0.38`, workflow run `30422101844` green on all four platform runners, ticket
closed with every acceptance criterion checked. **Spec #164 is complete — all nine tickets shipped.**

## The one next task: `queue empty` — the next move is a human one

**There is no `ready-for-agent` ticket. The relay chain has stopped and should not be restarted** until
something is labelled for it; with an empty queue it will pick nothing, write `queue empty`, and stop again.

The **live Bridge session that had been pending for nine tickets has now run, and the decisive check
passed** — see below. What remains is two small turns (#169, #172), then triage.

## The live session — ran 2026-07-29 on 2.0.38. Two of four checks passed.

- **#165 ✅ / #163 diagnosis confirmed.** A bridged **Codex** session (`sonnet` → `codex/gpt-5.6-sol`)
  reported **non-zero usage on 7/7 turns**, with `cacheW=0` throughout while `cacheR` grew — the
  Responses-wire fingerprint, so the numbers are genuinely the Codex mapping and not Anthropic usage leaking
  in. The 502s were a usage-reporting bug; the tighter-OAuth-cap hypothesis is not needed. **#163 stays
  open** — the mechanism is proven, but proving a 15-occurrence cluster *stopped* needs a stretch of use, not
  another session. Evidence on #165.
- **#171 ✅ (writer half).** `status.json` carried `211214 / 1000000 → 21%` plus meters `5h 55% · 7d 27%` —
  arithmetic correct, and Anthropic **fractions** correctly normalized to 0..100. The `ctx …%` **badge still
  will not appear** until the `wisp-slot` plugin ships the reader (#180). Judge by the file.
- **#169 ⬜ still to do.** A bridged session on a **keyed** Provider — a `glm` or `deepseek` alias (OpenCode
  Go) is the quickest — must report non-zero tokens. Watch for a **400 naming `stream_options`** rather than
  silence: that is the untested failure mode, and the fix would be a per-row opt-out flag, not removing the
  opt-in for everyone.
- **#172 ⬜ still to do.** A fresh Codex sign-in that never opens the model picker completes a turn.

**How to check usage — do NOT read `status.json` for this.** It is global and your own bridged turn
overwrites it; use the per-session Claude Code transcript instead, folded by `message.id`.
[[status-json-is-global-so-it-cannot-observe-another-session]].

Also still open by hand: **#167's** manual criterion (one turn each through Codex, Anthropic and Grok), and
**#170's** two criteria (needs a Kimi Code subscription — `wisp` → `/signin kimi`; the sign-in doubles as the
unverified-constants check).

## Then triage the two tickets this leg filed

Both are `ready-for-human` **only to stop the relay auto-grabbing them**, not because they are hard:

- **#180 — ship the harvest to the vsix + `wisp-slot` plugin.** Both bumps are **owed**. The vsix bundles its
  own `@wisp/core`, so #170's Kimi row, #172's corrected Codex default, #165's chat-path guard and #171's
  `recordStatus` reach **no** extension user on any npm version. The plugin carries #171's *reader* half, and
  `3e0125e` changed `wisp-statusline.js` without bumping `plugin.json` — so **1.5.0 means two different
  things**. Flip to `ready-for-agent` to pre-stage the bumps, changelogs and `bun run package`; the install
  step still needs you.
- **#181 — a BOM in `~/.wisp/config.json` silently empties the whole config.** Small, safe, agent-sized. It
  carries one design question worth answering first: tolerate the BOM, or **fail loud** on an unparseable
  config? Today it does neither.

## Landmines

- **RUN `bun run compile` IN BOTH PACKAGES.** The root script only covers `packages/vscode`; `packages/tui`
  has its own (`tsc -p ./`). Vitest typechecks neither —
  [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]].
- **npm is one of THREE faces.** The vsix bundles its own engine and `plugins/slot/` ships through the plugin
  marketplace, so a core fix reaches neither on an npm publish. Every release entry now carries a
  `### Surfaces` section — keep it, and **file the owed bump as a ticket in the same pass**, because an owed
  bump recorded only in prose evaporates.
  [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]].
- **Never seed a sandbox `WISP_HOME` from PowerShell `Out-File -Encoding utf8`** — it writes a BOM, and a BOM
  makes Wisp discard the *entire* config while still exiting 0 with plausible output. It looks exactly like a
  broken feature. [[a-bom-in-wisp-config-silently-empties-the-whole-config]].
- **A release tag must equal `packages/tui/package.json`'s version** or the workflow never matches. Assert it
  before pushing the tag — a wrong tag is annoying to unwind.
- **Release cuts are a direct commit on main, not a PR** (`b25e862`, now `55daebb`): `CHANGELOG.md` +
  `package.json` only. CI stamps the npm shell packages' versions from the tag, so nothing else needs
  committing.
- **`status.json` is a cross-release compatibility surface.** Core writes it, the plugin's statusline script
  reads it. Adding fields is free; renaming or removing one needs both sides to move in the same release —
  and they are on **different registries**.
- **Anything volatile written into `~/.wisp` must be excluded from the dir watcher** in `homeStore.ts`, or
  every write wakes both faces to re-read `config.json`. `status.json` is the first such file.
- **Don't widen `BridgeStreamEvent` casually.** The Anthropic encoder's `push()` reads an unrecognized event
  as a **client tool call**, so an unhandled member invents a `tool_use` block instead of degrading.
  [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]].
- **A model list is not an accepted list.** Changing the Codex default means **probing first**, then widening
  the whitelist — [[2026-07-29-a-model-list-is-not-an-accepted-list-whitelist-the-probed-ids]].
- **Anthropic quota is a FRACTION (0.22), Codex is an INTEGER percent (7).** Normalized in `status.ts` — do
  not re-normalize downstream. Never filter headers by keyword regex; that missed
  `x-codex-primary-used-percent` during the recon.
- **`## Blocked by` on the harvest tickets is body text, not native links** — GraphQL `blockedBy` returns
  empty even for a genuinely blocked ticket.
  [[harvest-tickets-carry-body-text-blockers-not-native-links]].
- **Fold transcript rows by `message.id` before concluding anything** —
  [[cc-transcript-rows-are-blocks-not-messages]].
- **`.context/` commits go to main, never a ticket branch.**

## Loose thread noticed, not touched

`packages/vscode/src/chatProvider.ts` — #165's Anthropic branch has a **duplicated**
`if (ev.type !== 'toolCall') continue;` (the line already existed just above the inserted one). Dead, not
wrong: it compiles and behaviour is identical. Left alone as out of #173's scope; noted on **#180**, which is
the ticket that touches that file next.

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]]
- [[2026-07-29-a-model-list-is-not-an-accepted-list-whitelist-the-probed-ids]]
- [[2026-07-29-oauth-credentialed-but-keyed-on-the-wire-resolves-at-the-keyfor-seam]]
- [[2026-07-29-chat-completions-usage-is-a-sibling-mapper-not-a-shared-one]]
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]]
- [[harvest-tickets-carry-body-text-blockers-not-native-links]]
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]
- [[cc-transcript-rows-are-blocks-not-messages]]
