---
type: pick-up
project: wisp
updated: 2026-07-29
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Last session (2026-07-29): #183 shipped (`wisp-router@2.0.39` on npm, verified against a control), then
#182 was fixed (`9fd63f0`, ADR-0004).** At `9fd63f0` on main. Nothing in flight, no `ready-for-agent` ticket.

## The one open thread: #182 is fixed but shipped nowhere

`9fd63f0` stops the read-merge-write mechanism from erasing a store it could not parse — the half of #181
that a BOM fix did not cover. It is a **data-loss fix sitting unreleased**, which is exactly the position
#181 was in before #183.

It lives in `@wisp/core`, so it reaches users only through **two** builds: an npm cut (`2.0.40`) **and** a
vsix build, because the extension bundles its own copy of core. The `wisp-slot` plugin is untouched.

**This was deliberately not done.** "Do #182" did not authorize two outward-facing publishes — that is the
user's call. Per the rule from #173, if the answer is yes, **file the owed pair as a ticket first**; an owed
bump recorded only in prose evaporates. #183 is the template and is three commits back.

If the answer is "not yet": nothing else is urgent. **#163** is waiting on time (a stretch of clean use in
the 217k–245k band — watching, not working), **#174** and **#69** are ungroomed.

## Released state

| Face | Version | Missing |
|---|---|---|
| npm `wisp-router` | **2.0.39** | **#182** |
| `wisp` vsix | **1.10.0** | **#182** — bundles its own `@wisp/core` |
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
- [[2026-07-29-never-overwrite-a-store-we-could-not-parse]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[harvest-tickets-carry-body-text-blockers-not-native-links]]
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]]
