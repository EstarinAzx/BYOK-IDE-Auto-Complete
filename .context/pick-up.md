---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-29): spec #164 shipped to all three faces, every live check passed, one real bug
found and fixed.** Relay leg 9 landed #173 (`wisp-router@2.0.38` on npm); then, with the user present, the
whole harvest was verified against real bridged sessions, **#181** was found and fixed, and **#180** cut the
vsix and plugin. At `ab2235b` on main.

## The one next task: #183 — cut npm 2.0.39

**Why it is the priority.** #181 is a **data-loss** fix that landed *after* the 2.0.38 cut. It went out in
vsix 1.10.0, but the npm face — the one with the most users — still has the bug: a BOM in
`~/.wisp/config.json` (what Notepad and PowerShell's `Out-File -Encoding utf8` write **by default**) makes
Wisp read it as empty, and because the stores are **read-merge-write**, the next settings change writes that
emptiness back over the real file. Routing map gone. Same path on `auth.json` + one sign-in = every API key
and OAuth token gone. Silently.

Mechanically identical to #173, which is fresh in the tracker:

- Bump `packages/tui/package.json` → `2.0.39`; **tag `v2.0.39` must equal it exactly** or the workflow never
  fires (the workflow asserts this too, but a bad tag is annoying to unwind — assert before pushing).
- Changelog entry with a **`### Surfaces`** section (the convention 2.0.38 started).
- **Direct commit on main, no PR** (`b25e862`, `55daebb`) touching only `CHANGELOG.md` + `package.json`. CI
  stamps the npm shell + platform package versions from the tag.
- **Verify past the registry read**: install it and confirm a **BOM'd config survives a subsequent write**.
  A plain read test would pass on 2.0.38 too — the write is where the bug actually was.

## What is released, and what each face is missing

| Face | Version | Missing |
|---|---|---|
| npm `wisp-router` | 2.0.38 | **#181** → that is #183 |
| `wisp` vsix | 1.10.0 | nothing — installed as `esarinazx.wisp@1.10.0` |
| `wisp-slot` plugin | 1.6.0 | nothing pushed; **the user's install is a stale cache snapshot** |

## Waiting on the user (not blockers)

- **Reload VS Code** → confirm **Kimi** in the picker / native chat + its panel sign-in state.
- **`/plugin update wisp-slot`** → the dev-machine install is a **cache snapshot** at commit `b45c43c4`
  (2026-07-25), *not* a live pointer at the checkout. Verified: its `wisp-statusline.js` has **zero**
  references to `status.json`/`contextPercent`/`meters`. So the `ctx …%` badge will not appear until it
  updates. (The cached `slot` **skill** is current — 8 `wisp snapshot` refs, no stale lease-file ones.)
- **#167's last third** — a **Grok** turn (`/test grok`). Codex and Anthropic already covered.
- **#170** — needs a Kimi Code subscription.

## Landmines

- **A store file that does not parse is not ignored — it is OVERWRITTEN.** Both stores are read-merge-write,
  so an empty parse result is merged with the next patch and written back. That is what made #181 data loss
  rather than a nuisance, and it is **still live for genuinely corrupt files (#182)**. Treat any "degrade to
  `{}`" in this layer as destructive by default.
  [[a-bom-in-wisp-config-silently-empties-the-whole-config]].
- **RUN `bun run compile` IN BOTH PACKAGES.** The root script only covers `packages/vscode`; `packages/tui`
  has its own (`tsc -p ./`). Vitest typechecks neither.
  [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]].
- **npm is one of THREE faces**, and the vsix bundles its own `@wisp/core`. Every release entry carries a
  `### Surfaces` section — keep it, and **file an owed bump as a ticket in the same pass**; prose evaporates.
  [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]].
- **The `wisp-slot` version lives in TWO files** — `plugins/slot/.claude-plugin/plugin.json` **and**
  `.claude-plugin/marketplace.json`. They must move together (precedent `0965cab`).
- **Never verify usage from `status.json`.** It is global, and a bridged reader's own turn overwrites it. Use
  the per-session Claude Code transcript, folded by `message.id`.
  [[status-json-is-global-so-it-cannot-observe-another-session]].
- **A logout/login does NOT test a `defaultModel` change.** Sign-out clears `auth.json`; the picked model
  lives in `config.json` and survives, and `resolveModel` is `modelMap[id] || defaultModel`. Routing entries
  pin a model too. Only a home with **no `models.<id>` entry** exercises it.
- **A model list is not an accepted list.** Changing a Codex default means **probing first**, then widening
  the whitelist — [[2026-07-29-a-model-list-is-not-an-accepted-list-whitelist-the-probed-ids]].
- **Don't widen `BridgeStreamEvent` casually.** The Anthropic encoder's `push()` reads an unrecognized event
  as a **client tool call** — an unhandled member invents a `tool_use` block instead of degrading.
  [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]].
- **Anthropic quota is a FRACTION (0.22), Codex an INTEGER percent (7).** Normalized in `status.ts` — do not
  re-normalize downstream. Never filter headers by keyword regex.
- **`## Blocked by` on the harvest tickets is body text, not native links** — GraphQL `blockedBy` returns
  empty even for a genuinely blocked ticket.
  [[harvest-tickets-carry-body-text-blockers-not-native-links]].
- **`.context/` commits go to main, never a ticket branch.**

## Loose thread noticed, not touched

`packages/vscode/src/chatProvider.ts` — #165's Anthropic branch has a **duplicated**
`if (ev.type !== 'toolCall') continue;`. Dead, not wrong: it compiles and behaves identically. Noted on #180
(now closed) — worth deleting next time that file is open.

## Related

- [[active-work]]
- [[overview]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]]
- [[2026-07-29-a-model-list-is-not-an-accepted-list-whitelist-the-probed-ids]]
- [[harvest-tickets-carry-body-text-blockers-not-native-links]]
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]
- [[cc-transcript-rows-are-blocks-not-messages]]
