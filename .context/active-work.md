---
type: active-work
project: wisp
updated: 2026-09-04
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-09-04 by Opus 5 (user-reported Antigravity 400 → wire-driven diagnosis → fix + release cut)_
_At commit: `531a063` on main, tag `v2.0.48`. Released: **`wisp-router@2.0.48`** (npm `latest`) and **vsix 1.13.3 built + installed**. `wisp-slot` 1.7.4 unchanged._

## Current focus

**2.0.48 is SHIPPED, verified on both faces and installed. Nothing is in flight.**

⚠ **The running Bridge is still 2.0.47** (PID 9172, `~/.wisp/bin/v2.0.47/wisp.exe`, started 2026-09-03
21:31). A bridged Claude Code session talks to that process, so the restart is the user's call, not an
agent's ([[an-upgraded-package-does-not-touch-the-process-already-running]]). Until it restarts, the
Antigravity fix is released but **not live**.

Started as a user report: every Antigravity turn failing with a 400 wrapped in a 502, retried ten times.
**The tool list was the cause, not the Provider** — one MCP tool declared `query.where` as an array of
arrays with nothing inside the inner one, and this wire rejects an `ARRAY` node carrying no `items`,
failing the whole request at every model
([[a-tool-schema-the-wire-rejects-fails-every-turn-not-one-tool]]).

The upstream's real rule was established by **driving the wire, one tiny turn per candidate shape**,
which also overturned the proto: `Schema.type` is marked `REQUIRED` there and is **not** enforced, while
`items` is marked `OPTIONAL` and is
([[2026-09-04-the-server-not-the-proto-says-which-schema-fields-are-required]]).

## State

- **In flight:** nothing.
- **Done this session:** captured the real 71-tool request and replayed it through the Bridge; probed the
  wire per schema shape to establish the accept/reject rule; shipped `fillArrayItems`; **removed the
  interim `defaultMissingTypes` pass** (`efaa249`) that the shape table disproved before it ever
  released; cut, published, verified both faces past the registry read, and installed 2.0.48 + vsix
  1.13.3.
- **Blocked:** nothing.

## Pick up here

**The Fable cache re-bills** — the one thing this session found and did not fix. See [[pick-up]] for the
numbers and the first move. Queue otherwise empty by query at the cut (still verify by query, not by a
note — [[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]).

Open but deliberately **not** agent-ready: **#207** (active quota probe — same three scoping calls),
**#69**, **#163**.

## Verification

- Pre-push `git rev-list --left-right --count origin/main...main` → `0 0` after the push
- `bun run test` — **1041/1041 across 22 files** (was 1039; +2 fix tests)
- `bun run --cwd packages/core typecheck` clean · `bun run --cwd packages/tui compile` clean ·
  `bun test packages/tui/tests/` **28/28** · `bun run --cwd packages/vscode compile` clean
- **Live wire, the reported shape, same model and same minute** (`gemini-3.1-flash-lite`):

  | body | verdict |
  |---|---|
  | `{"type":"array","items":{"type":"array"}}` raw | **400** `…properties[where].items.items: missing field` |
  | the same shape through the cleaner | **200** |

  Nine shapes were probed in total; the full accept/reject table is in the decision entry and the 2.0.48
  changelog.
- `release.yml` run `33754192787` — **5/5 green**, all four platform binaries on the `v2.0.48` release
- **npm verified past the registry read:** 2.0.48 scratch-installed, **bin executed** (it downloaded
  `wisp-v2.0.48-win32-x64.exe` from the GitHub release and printed the live routing map)
- **Marker check in both shipped artifacts, 2.0.48 / 2.0.47 and vsix 1.13.3 / 1.13.2** — identical
  columns in each pair: `fillArrayItems` **2/0**, `array of any JSON value` **1/0**,
  `defaultMissingTypes` **0/0** (the removed pass, never shipped), with `modelSupportsMidConversationSystem`
  **2/2** and `claude-cli/` **1/1** as the shared controls
  ([[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]). One-way, not a swap: this cut
  removed nothing that had ever shipped, so no old marker can go to zero.
- Installed: global `wisp-router` 2.0.47 → **2.0.48**, `esarinazx.wisp` 1.13.2 → **1.13.3**

## Skills for next session

- `/preset pick-up` — the baton at [[pick-up]] is current: Bridge restart owed, Fable re-bills next.
- The re-bill work needs a **request capture**, not reasoning: the probe pattern from this session
  (record one `POST /v1/messages`, answer 400, replay it) is the cheapest way in.

## Open questions

- **The Fable cache re-bills** — three advisory lines seen on the 2.0.47 Bridge, ~10k cache-creation
  tokens per turn written and never read back. Cause unknown; the user has only ever seen it on Fable.
  Details in [[pick-up]].
- **The big-body 429s** — a 46,720-byte Antigravity body answered `429 RESOURCE_EXHAUSTED` on both hosts
  while a 296-byte body on the **same model seconds later** answered 200. Looks like a size or
  token-rate limit rather than the daily allowance. Unexplained, and it makes "out of quota" an
  unreliable read on this wire.
- **#207's three scoping calls** — unchanged: poll **cadence**; **precedence** when a poll and a turn
  header disagree; **opt-in or always-on**.
- Carried over, unchanged: dismiss the two secret-scanning alerts as won't-fix; rotate `bridgeSecret`;
  #170 needs a Kimi Code subscription; note #189's last criterion when observed; ~20 stale local
  `ticket/*` branches; `.context/Untitled.canvas` untracked, user's file, left alone.

## Recent context

- **The truncated terminal error was not worth blocking on.** The 502 wrapper pushed the load-bearing
  clause off-screen twice; both times driving the wire beat asking. The second time the user pasted the
  full Bridge log line, and the JSON path in it named the exact node — which the shape probe then
  reproduced character for character.
- **The proto was consulted and was wrong.** Reading `content.proto` produced a fix
  (`defaultMissingTypes`) for a rejection that does not exist. Only the per-shape wire probe separated
  what is required from what is merely annotated `REQUIRED`. Both faces were checked for its absence.
- The Antigravity User-Agent pin (`antigravity/hub/2.2.1`) was suspected and cleared — every probe today
  rode it and got 200s. The live Hub manifest is at **2.12.0**, so the pin is stale but not load-bearing
  for this bug.
- `bridge.log` is written only by `wisp serve`; the TUI host writes nothing to it. Today's failing turns
  left no trace there for that reason.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[2026-09-04-the-server-not-the-proto-says-which-schema-fields-are-required]]
- [[a-tool-schema-the-wire-rejects-fails-every-turn-not-one-tool]]
- [[an-upgraded-package-does-not-touch-the-process-already-running]]
- [[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]
- [[a-bundled-dependency-is-not-a-face-but-every-face-carries-it]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]
- [[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]
