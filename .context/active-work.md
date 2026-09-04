---
type: active-work
project: wisp
updated: 2026-09-04
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-09-04 by Fable 5.1 (Fable re-bill run to ground → not a Wisp bug → log reclassified + Antigravity 4xx classified → 2.1.0 cut)_
_At commit: `1b450b0` on main, tag `v2.1.0` on `80e21bb`. Released: **`wisp-router@2.1.0`** (npm `latest`) and **vsix 1.13.4 built + installed**. `wisp-slot` 1.7.4 unchanged._

## Current focus

**2.1.0 is SHIPPED, verified on both faces and installed. Nothing is in flight.**

The session's question was the Fable cache re-bill left by 2.0.48. Answer: **it is the backend, not
Wisp.** A same-session model control settled it — one heavy bridged session (`9157be5a`) ran both models
through the same Bridge; 40 consecutive Opus 5 turns grew exactly (`read(n+1) = read(n)+creation(n)`)
while the Fable turns beside them fell 4-16k short on ~30% of turns
([[2026-09-04-the-fable-cache-rebill-is-the-backend-classify-dont-chase]]). Three checks closed the
other doors: Claude Code's native request is byte-identical on both models (driven at a recorder with Wisp
bypassed); Wisp's parse→build round-trip preserves Fable thinking signatures byte-for-byte; and the
shortfall exceeds one turn's whole output, so the classifier is a model-family gate, not a size bound.

Shipped in 2.1.0 (`f7b3c50`): the `#162` line names the known Fable backend re-bill on a Fable/Mythos
model (log-only, numbers still print; Opus keeps `real history re-bill`), and **Antigravity
400/401/403/404 now answer as themselves** through the #166 shape instead of leaving as a 502 that told
Claude Code to retry ten times. 5xx stays 502 on purpose; 429 keeps its body classifier.

**No Bridge is running.** The 2.0.47 process from the last note is gone (no `wisp` PID, no listener).
Whatever the user starts next (`wisp serve`, the TUI `/bridge`) lands on 2.1.0 — the global `wisp-router`
is 2.1.0 and the binary is at `~/.wisp/bin/v2.1.0/`. The editor face is 1.13.4; a window reload activates
it.

## State

- **In flight:** nothing.
- **Done this session:** mined three real transcripts for per-turn cache growth (the miner is throwaway,
  re-create under `out/probe/`); drove `claude` 2.1.260 at a zero-cost recording backend on Fable and
  Opus and diffed consecutive request skeletons; proved the parse→build thinking round-trip under bun;
  found the same-session Opus control; wrote the reclassification + the 4xx classifier TDD-first (six new
  tests, red then green); cut, published, verified both faces past the registry read, installed both.
- **Blocked:** nothing.

## Pick up here

**Queue empty by query at the cut** (`gh issue list --label ready-for-agent --state open` → `[]`; verify
by query, not by this note). The remaining held bugs are candidate tickets, listed in [[pick-up]]. The
strongest next cut is **a TUI-hosted Bridge writes nothing to `bridge.log`** — it is why today's failures
left no trace last session and why the re-bill needed transcripts instead of the log.

Open but deliberately **not** agent-ready: **#207** (active quota probe — three scoping calls), **#69**,
**#163**.

## Verification

- Pre-push `git rev-list --left-right --count origin/main...main` → `0 0` after the push; tag `v2.1.0`
  pushed explicitly and confirmed on `git ls-remote --tags`
- `bun run test` — **1047/1047 across 22 files** (was 1041; +4 Antigravity 4xx tests, +2 Fable/Opus
  log tests, each watched red before green)
- `bun run --cwd packages/core typecheck` clean · `bun run --cwd packages/tui compile` clean ·
  `bun test packages/tui/tests/` **28/28** · `bun run --cwd packages/vscode compile` clean
- `release.yml` run `33838090896` — **5/5 green**, all four platform binaries on the `v2.1.0` release
- **npm verified past the registry read:** 2.1.0 scratch-installed, **bin executed** (downloaded
  `wisp-v2.1.0-win32-x64.exe` from the GitHub release, printed the live routing map); global
  `wisp-router@2.1.0`; registry `latest: 2.1.0` (lagged ~1 min behind the publish step — a read straight
  after "success" still said 2.0.48; the platform packages published per the job log yet `npm view` 404s
  them, the documented-normal shim fallback)
- **Marker swap in both shipped artifacts, npm 2.1.0 / 2.0.48 and vsix 1.13.4 / 1.13.3** — identical
  columns in each pair: `isFableFamilyModel` **2/0**, `antigravity_bad_request` **1/0**,
  `known Fable backend re-bill` **1/0**, `antigravity_permission_denied` **1/0**, with
  `modelSupportsMidConversationSystem` **2/2** and `fillArrayItems` **2/2** as the shared controls
- Installed: global `wisp-router` 2.0.48 → **2.1.0**, `esarinazx.wisp` 1.13.3 → **1.13.4**
- **Not live-driven:** the Antigravity 4xx door answer is proven by unit test through the same `classify`
  hook #190 verified live for 429 — no fresh live 4xx was cheaply reachable (the itemless-array 400 is
  repaired since 2.0.48, and a bogus model needs a routing edit). Say "unit-proven through a live-proven
  hook", not "live-verified".

## Skills for next session

- `/preset pick-up` — the baton at [[pick-up]] is current: queue empty, held bugs listed, no Bridge
  running.
- Cache questions on a Claude model: **get a same-session control on a second model before touching the
  door** — the transcript miner (per-turn read/creation/shortfall) is a 60-line throwaway and beat every
  hypothesis this session.

## Open questions

- **The big-body 429s** — unchanged from 2.0.48: a 46,720-byte Antigravity body answered
  `429 RESOURCE_EXHAUSTED` on both hosts while a 296-byte body on the same model seconds later answered
  200. Looks like a size or token-rate limit. Now that 4xx answer as themselves, a 429 on this wire is
  still "retry small before concluding".
- **#207's three scoping calls** — unchanged: poll **cadence**; **precedence** when a poll and a turn
  header disagree; **opt-in or always-on**.
- Carried over, unchanged: dismiss the two secret-scanning alerts as won't-fix; rotate `bridgeSecret`;
  #170 needs a Kimi Code subscription; note #189's last criterion when observed; ~20 stale local
  `ticket/*` branches; `.context/Untitled.canvas` untracked, user's file, left alone.

## Recent context

- **Reasoning from the docs nearly sent this the wrong way twice.** The Fable 5.1 "preserved thinking"
  rules suggested Wisp's trailing system turn was a history edit; the capture showed the path is not even
  exercised. The thinking-signature correlation suggested a per-turn size bound; the numbers showed the
  shortfall exceeds a turn's whole output. The same-session control was the only thing that could not be
  argued with.
- **PowerShell splits a `git commit -m` here-string on embedded double quotes** — twice the fix commit
  failed as pathspecs and the next `-m` commit swept everything staged. Write the message to a gitignored
  file and use `-F`. Caught before the push both times by `git show --stat` per commit.
- **`Start-Sleep` is blocked in this harness** — a registry read that lags the publish step needs a plain
  re-read a tool call later, not a sleep.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[2026-09-04-the-fable-cache-rebill-is-the-backend-classify-dont-chase]]
- [[2026-09-04-the-fable-cache-rebill-is-the-backend-not-wisp]]
- [[2026-09-03-the-volatile-tail-must-sit-behind-every-message-breakpoint]]
- [[a-tool-schema-the-wire-rejects-fails-every-turn-not-one-tool]]
- [[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]]
- [[an-upgraded-package-does-not-touch-the-process-already-running]]
- [[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]
