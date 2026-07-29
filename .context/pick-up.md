---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-29): #183 shipped — `wisp-router@2.0.39` is on npm, verified against a control.**
That was the last piece of release debt. All three faces now carry every shipped fix, the tracker has no
`ready-for-agent` ticket, and nothing is in flight. At `819900b` on main, tag `v2.0.39`.

## There is no forced next task

This is the first session in the arc that opens with a genuinely empty queue. Do not invent urgency, and do
not restart the relay chain — with no `ready-for-agent` ticket it picks nothing, writes `queue empty`, stops.

**Ask the user what they want.** If they have no preference, the best default is **#182**.

### Why #182 is the default

It is the remaining half of #181. A BOM is fixed, but a *genuinely* unparseable store (truncated write, real
typo) still degrades to `{}` — and because both stores are **read-merge-write**, that `{}` is merged with the
next patch and written back over the real file. Same data loss, rarer trigger.

**It is a design call before it is code.** Do not open an editor first. The pure parsers have six callers and
a total contract (`string → object`, never throws); making them throw changes all six. The shape worth
exploring is refusing to **write** over contents that did not parse — that is a `writeConfig`/`writeAuth`
question, not a `parseObject` one. Route it through a grill or `/preset init`, not `/preset scope`.

The rest of the queue is either waiting on time (**#163** — needs a stretch of clean use in the 217k–245k
band, which is watching, not working) or ungroomed (**#174** Antigravity, **#69** copilot-wisp).

## Released state — nothing is owed

| Face | Version | Missing |
|---|---|---|
| npm `wisp-router` | **2.0.39** | nothing |
| `wisp` vsix | **1.10.0** | nothing — installed as `esarinazx.wisp@1.10.0` |
| `wisp-slot` plugin | **1.6.0** | nothing pushed; **the user's install is a stale cache snapshot** |

## Waiting on the user — down to one

- **#170** — needs a **Kimi Code subscription**. The sign-in doubles as the unverified-constants check, and
  the VS Code reload / Kimi picker confirmation folds into it. Nothing else is waiting.

_Cleared 2026-07-29:_ the Grok turn (**#167 now fully covered** — all three OAuth kinds have driven a turn),
and `/plugin update wisp-slot` (cache at 1.6.0). **#171 is confirmed live end-to-end** — the badge rendered
`[WISP opus→claude-opus-5 ctx 17% 5h 63% 7d 27%]`.

## Landmines

- **A store file that does not parse is not ignored — it is OVERWRITTEN.** Both stores are read-merge-write,
  so an empty parse result is merged with the next patch and written back. This is exactly #182 and it is
  **still live**. Treat any "degrade to `{}`" in this layer as destructive by default.
  [[a-bom-in-wisp-config-silently-empties-the-whole-config]].
- **A fix release is not verified until the OLD version FAILS the same check.** Most natural checks pass on
  the broken build too — on #183 a plain *read* check was green on 2.0.38 and 2.0.39 alike, because the read
  returned `{}` with exit 0. Install the previous published tarball as a control.
  [[verifying-a-fix-release-needs-the-previous-version-as-a-control]].
- **npm can 404 a version its own publish job just succeeded on.** Propagation lag, not a broken release —
  check the job log for `+ wisp-router@<v>` and `npm view … dist-tags`, then retry. Hit this on #183.
- **RUN `bun run compile` IN BOTH PACKAGES.** The root script only covers `packages/vscode`; `packages/tui`
  has its own (`tsc -p ./`). Vitest typechecks neither. Also: the test gate is **`bun run test`** (vitest) —
  bare `bun test` runs Bun's own runner instead and reports ~53 bogus failures on `vi.stubGlobal`.
  [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]].
- **npm is one of THREE faces**, and the vsix bundles its own `@wisp/core`. Every release entry carries a
  `### Surfaces` section — keep it, and **file an owed bump as a ticket in the same pass**; prose evaporates.
  [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]].
- **The `wisp-slot` version lives in TWO files** — `plugins/slot/.claude-plugin/plugin.json` **and**
  `.claude-plugin/marketplace.json`. They must move together (precedent `0965cab`).
- **Never verify usage from `status.json`.** It is global, and a bridged reader's own turn overwrites it. Use
  the per-session Claude Code transcript, folded by `message.id`.
  [[status-json-is-global-so-it-cannot-observe-another-session]].
- **The `ctx …%` badge does NOT come from the plugin cache.** `~/.claude/hooks/statusline-wrapper.ps1` runs
  the **repo checkout** copy of `wisp-statusline.js` deliberately, so `/plugin update` never changes what the
  statusline executes. Diagnosing the badge from the cached plugin version already cost one session.
  [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]].
- **`## Blocked by` on the harvest tickets is body text, not native links** — GraphQL `blockedBy` returns
  empty even for a genuinely blocked ticket.
  [[harvest-tickets-carry-body-text-blockers-not-native-links]].
- **`.context/` commits go to main, never a ticket branch.**

## Loose threads noticed, not touched

`packages/vscode/src/chatProvider.ts` — #165's Anthropic branch has a **duplicated**
`if (ev.type !== 'toolCall') continue;`. Dead, not wrong: it compiles and behaves identically. Worth deleting
next time that file is open. (Still untouched — this session never opened it.)

`packages/tui/package.json` itself starts with a **UTF-8 BOM**. Harmless today — Bun's `.json()` tolerates it
and the release workflow reads the version through exactly that path — but it is a live tripwire if anything
ever reads that file with a bare `JSON.parse`.

## Related

- [[active-work]]
- [[overview]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[harvest-tickets-carry-body-text-blockers-not-native-links]]
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]
