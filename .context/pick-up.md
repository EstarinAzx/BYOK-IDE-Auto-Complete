---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-29): the store data-loss arc closed end to end.** #183 cut npm 2.0.39, #182 fixed the
mechanism behind #181 (`9fd63f0`, ADR-0004), and #184 shipped it to both faces — **npm 2.0.40 + vsix
1.10.1**. At `b672333` on main. Nothing in flight, no `ready-for-agent` ticket, no release debt.

## There is no queued work

Ask the user what they want. Do not invent urgency, and do not restart the relay chain — with no
`ready-for-agent` ticket it picks nothing, writes `queue empty`, stops.

The only outstanding action is the user's: **install `packages/vscode/wisp-1.10.1.vsix`**. That face is not
on the marketplace, so the extension does not carry #182 until it is installed by hand.

Everything else open is waiting on time (**#163** — a stretch of clean use in the 217k–245k band, watching
not working) or ungroomed (**#174** Antigravity, **#69** copilot-wisp; both want a grill or `/preset init`
before they are tickets).

## Released state — nothing owed

| Face | Version | Missing |
|---|---|---|
| npm `wisp-router` | **2.0.40** | nothing |
| `wisp` vsix | **1.10.1** | nothing — but **packaged, not installed** |
| `wisp-slot` plugin | **1.6.0** | nothing — untouched by #182 |

## Waiting on the user — down to one

- **#170** — needs a **Kimi Code subscription**. The sign-in doubles as the unverified-constants check, and
  the VS Code reload / Kimi picker confirmation folds into it. Nothing else is waiting.

_Cleared 2026-07-29:_ the Grok turn (**#167 now fully covered** — all three OAuth kinds have driven a turn),
and `/plugin update wisp-slot` (cache at 1.6.0). **#171 is confirmed live end-to-end** — the badge rendered
`[WISP opus→claude-opus-5 ctx 17% 5h 63% 7d 27%]`.

## Landmines

- **A store file that does not parse is no longer overwritten — `merge` refuses (#182, ADR-0004).** The
  underlying shape still deserves respect: both stores are read-merge-write, so any *new* "degrade to `{}`"
  introduced in this layer is destructive by default, and the refusal only guards the one write path. The
  pure parsers are still total on purpose — do not make them throw, they have six callers.
  [[2026-07-29-never-overwrite-a-store-we-could-not-parse]].
- **`writeConfig` / `writeAuth` can throw, and always could** — `writeRaw` throws on ENOSPC/EPERM, and #182
  added a new trigger for that same contract. ~35 call sites already tolerate it; none were changed. Resist
  any "return a result type instead" refactor, which would touch all 35.
- **A fix release is not verified until the OLD version FAILS the same check.** Most natural checks pass on
  the broken build too — on #183 a plain *read* check was green on 2.0.38 and 2.0.39 alike, because the read
  returned `{}` with exit 0. Install the previous published tarball as a control. Used twice now (#183, #184)
  and it earned its keep both times.
  [[verifying-a-fix-release-needs-the-previous-version-as-a-control]].
- **A vsix is evidence only when checked in the BUNDLE.** The extension bundles its own `@wisp/core`, so a
  commit on main proves nothing about what an extension user runs. Unzip the `.vsix` and grep
  `extension/dist/extension.js` for a string the fix introduced — that is what #184 did.
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
- [[2026-07-29-never-overwrite-a-store-we-could-not-parse]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[harvest-tickets-carry-body-text-blockers-not-native-links]]
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]
