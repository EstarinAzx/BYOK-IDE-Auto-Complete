---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (grooming session: #174 → spec #185 + tickets #186–#192)._
_At commit: `9208613` on main. **Agent queue holds exactly one ticket: #187.**_

## Current focus

**#174 is groomed. Spec #185, tickets #186–#192, nothing implemented.** An eight-question grill settled the
narrow-port scope; the full reasoning is in
[[2026-07-29-antigravity-narrow-port-never-mint-opaque-tool-ids]]. Headline: ~1,200–1,500 TS lines against
the reference's 5,643 non-test Go lines, both Bridge doors, all 13 models, credits **and** reasoning-replay
out — the latter safe **only** under the binding rule that the port never mints opaque provider-side tool ids.

Reference clone refreshed at `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`, re-clonable).

**Ticket #186 (auth spike) is `ready-for-human` and gates everything live.** #187 (the pure layer) is the
only `ready-for-agent` ticket, deliberately — see Queue below.

### Previously (release arc, closed)

**The store data-loss arc is closed end to end.** That session cut **npm 2.0.39** (#183,
clearing the harvest's last debt), fixed **#182** (`9fd63f0`, ADR-0004) — the read-merge-write mechanism
behind #181 no longer erases a store it could not parse — then shipped it to both faces as **npm 2.0.40 +
vsix 1.10.1** (#184).

**What is released right now:**

| Face | Version | Carries | Owed |
|---|---|---|---|
| npm `wisp-router` | **2.0.40** | the harvest, #181 **and** #182 | nothing |
| `wisp` vsix | **1.10.1** | same — **packaged, NOT yet installed** | nothing |
| `wisp-slot` plugin | **1.6.0** | #171's statusline reader | nothing — untouched by #182 |

**No release debt.** The one loose end is an install, not a build: `packages/vscode/wisp-1.10.1.vsix` exists
on disk but this face is not published to the marketplace, so the user must install it by hand before the
extension carries #182.

## State

- **In flight:** nothing implemented. Working tree clean on main. **Relay chain re-seeded and armed**
  (`.claude/relay/ticket-loop.md`, `stop: false`, leg 1) — but armed for **exactly one leg**: it will land
  #187, find the queue dry, write `queue empty`, and stop. That is correct, not a failure.
- **#183 ✅ `819900b` / `v2.0.39`** — release green on all four native runners + publish; `latest` is 2.0.39.
  Gate before the cut: **783/783 tests, `bun run compile` clean in both packages.**
  - **Verified past the registry read, with a control.** The same BOM'd `config.json` plus one unrelated
    `wisp routing set haiku codex/gpt-5.6-sol`, run against the *published* tarballs: **2.0.38 erased**
    `provider`, `effort` and the pre-existing `opus` route; **2.0.39 kept all three**. The control failing is
    the load-bearing half — a plain *read* check is green on both, because pre-fix the read returned `{}` with
    exit 0. [[verifying-a-fix-release-needs-the-previous-version-as-a-control]].
- **Live verification of the harvest — all green** (done last session against published 2.0.38):
  - **#165 ✅** — 7/7 Codex-served turns reported non-zero usage; `cacheW=0` while `cacheR` grew = the
    Responses-wire fingerprint. Read from the per-session Claude Code **transcript**, folded by `message.id`.
  - **#169 ✅** — 2/2 keyed turns (`glm`, `deepseek` → **OpenCode Go**) reported usage; no 400 on
    `stream_options`. ⚠ Both aliases hit the **same Provider row** — one backend verified, not nine.
  - **#171 ✅ writer AND reader — the badge is confirmed live.** The writer put
    `163855/1000000 → 16%` + meters `5h 63% · 7d 27%` in `status.json`; the reader rendered
    `[WISP opus→claude-opus-5 ctx 17% 5h 63% 7d 27%]`. **Correction to last session's diagnosis:** the badge
    was never gated on `/plugin update`. `~/.claude/hooks/statusline-wrapper.ps1` runs the **repo checkout**
    copy of `wisp-statusline.js` on purpose, so the stale 1.5.0 plugin cache never fed it — it had the reader
    from `3e0125e` onward. [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]].
  - **#167 ✅ complete** — the last third is covered: a **Grok** turn streamed a reply (user-confirmed
    2026-07-29). All three OAuth kinds have now driven a turn through the unified `ProviderExecutor` records.
  - **#172 ✅** — `/test` in a throwaway `WISP_HOME` printed `/test: Codex (gpt-5.6-sol)` and streamed.
  - **#163 → diagnosis confirmed, ticket open.** The 502s were a usage-reporting bug, not a window bug.
- **#182 ✅ `9fd63f0` (ADR-0004), shipped as #184** — `merge` refuses to write over a store that did not
  parse. **Verified on the published artifacts with a control:** a truncated `config.json` plus an unrelated
  `wisp routing set` is **overwritten on 2.0.39** (exit 0) and **left byte-identical on 2.0.40** (exit 1).
  Re-ran #183's BOM harness on 2.0.40 to prove the other direction did not regress — a BOM'd store is
  *usable*, so it must still write, and it does. The vsix was checked in the **bundle**, not the commit:
  `dist/extension.js` inside `wisp-1.10.1.vsix` carries the refusal string and #181's BOM strip.
- **User action pending:**
  - **Install `packages/vscode/wisp-1.10.1.vsix`** — packaged this session, not published to the
    marketplace, so the extension does not carry #182 until it is installed by hand.
  - **#170's two criteria** — needs a **Kimi Code subscription**; the sign-in doubles as the
    unverified-constants check (auth host, client id, endpoints were never verified offline and fail loud at
    sign-in with the server's own words).
  - _Done 2026-07-29:_ `/plugin update wisp-slot` (cache now 1.6.0, byte-identical to the repo copy) and the
    Grok turn. The VS Code reload / Kimi picker check is folded into #170 above — it cannot be finished
    without the subscription anyway.

## Queue

Spec #164: all nine shipped (#165 `1971541`, #166 `07969d2`, #167 `c697733`, #168 `89f94c5`, #169 `7b8d73d`,
#170 `d656686`, #171 `3e0125e`, #172 `49761d8`, #173 `55daebb`/`v2.0.38`), plus the follow-ups #181 `4ec1a81`,
#180 `ab2235b` and #183 `819900b`/`v2.0.39`.

**Spec #185 — Antigravity, seven tickets, none started:**

| # | Ticket | Label | Blocked by |
|---|---|---|---|
| **186** | Auth spike — access, PKCE, posture | `ready-for-human` | none — needs a human at a browser |
| **187** | Pure layer — envelope, tools, signatures, 429 classifier, SSE mapper | **`ready-for-agent`** | none |
| **188** | Catalog row, kind, creds slice, `AntigravityAuth` | — | #186 |
| **189** | Executor record + OpenAI door — first real turn | — | #188, #187 |
| **190** | Rate limits answer 429; cooldown from server horizon | — | #189 |
| **191** | Anthropic door — Claude Code driven by Gemini | — | #189 |
| **192** | Release — npm + TUI face, surfaces named | — | #190, #191 |

**Why only #187 carries `ready-for-agent`.** `## Blocked by` is body text, not native links — a frontier
query cannot see it, so **labels are the only real gate**. Labelling #188 onward now would let the relay build
the whole Provider before anyone confirms this account has Antigravity access, which is exactly the #170
failure mode. #187 is exempt because it is a pure transcription of the reference's own ~3,900-line test corpus:
its correctness does not depend on account access and it needs zero credentials to verify.

**Re-arming order** (one step at a time): human runs #186 → label #188 → then #189 → then #190 **and** #191
together → then #192, which closes #185. Access not confirmed → comment on #186, label nothing, leave #185
dormant.

**Still open, unrelated:**

| # | Ticket | Note |
|---|---|---|
| **163** | The 502 observation | Diagnosis confirmed. Open pending a stretch of clean use in the 217k–245k band. Closing it is *waiting*, not working. |
| **174** | Antigravity placeholder | **Groomed** → #185. Left open as the tracking issue until #185 closes. |
| **69** | copilot-wisp launcher | Ungroomed. |

**Closed in the previous session:** #183 (`819900b`/`v2.0.39`), #182 (`9fd63f0`, ADR-0004), #184
(`d36688c`/`v2.0.40` + `b672333`).

## Pick up here

**Two independent threads. They do not block each other.**

1. **Human: run the #186 auth spike.** Browser OAuth on the Google account, confirm Antigravity access,
   record the PKCE verdict and the posture verdict, save the captured request/response fixtures on the
   ticket. This gates every live-wire ticket. Ten minutes.
2. **Agent: start the relay** — `/relay N=1 /preset ticket-loop`. It lands #187 and stops on a dry queue.

Two user actions still outstanding from before: **install `packages/vscode/wisp-1.10.1.vsix`** (that face is
not on the marketplace, so it does not carry #182 until installed by hand), and **#170** needs a Kimi Code
subscription.

## Skills for next session

- `/preset pick-up` — session door.
- `/relay N=1 /preset ticket-loop` — armed, one leg (#187). Re-arm by flipping labels in the order above.
- `packages/tui:verify` — sandboxed CLI verification for TUI command surfaces (isolated `WISP_HOME`).
- `grill-me` / `/preset init` — still the right shape for **#69**, the last ungroomed ticket.

## Open questions

- **Settled:** _tolerate or fail loud on a corrupt store?_ → **neither: refuse to write.** ADR-0004,
  [[2026-07-29-never-overwrite-a-store-we-could-not-parse]].
- **Should a refused write print a bare error instead of a stack trace?** Left out of #182 deliberately. On
  the TUI command paths an unhandled throw dumps a Bun stack trace — legible, exit 1, and *identical to how
  ENOSPC has always surfaced there*, so #182 made an existing rough edge more reachable rather than adding
  one. Fixing it properly is cross-cutting (every command path), not a one-liner at one site.
- **Do the 502s actually stop?** #163. Watch for refusals in the 217k–245k band. Compaction should now fire,
  so that band may simply stop being reached — that is the fix working, not evidence going missing.
- **Does `auth.json` share every config failure mode?** Same read path and same read-merge-write shape; the
  BOM case is now proven and fixed for both, the corrupt case is not.
- **Does any keyed backend reject `stream_options`?** **OpenCode Go accepts it** (#169, verified). Still
  unexercised: OpenAI, Groq, Mistral, OpenRouter, Ollama, Ollama Cloud, KiloCode, Cline, Custom. A rejection
  is a **400 naming `stream_options`** — loud, not silent — and the fix is a per-row opt-out flag.
- **Should `status.json` be per-session rather than global?** **It bites** — a bridged reader's own turn
  overwrites it, so it cannot observe another session.
  [[status-json-is-global-so-it-cannot-observe-another-session]].
- **Is the 30-minute staleness window right?** Picked cold (#171). Now finally observable, once the plugin is
  updated.
- **Which Codex ids does the ChatGPT-account path accept?** `gpt-5.6-sol` and `gpt-5.4` probed 200;
  `gpt-5.3-codex` and bare `gpt-5.6` probed 400. The rule behind the split is unknown, so the test
  whitelists rather than pattern-matches.
- **Are the #168 retry constants right in production?** Picked cold, never tuned against a real outage.
- **Should the two doors' provider dispatch ever fully merge?** Left open on purpose (#167).
- **Antigravity: how does effort map?** Every record handles the shared effort setting differently — one maps
  it, two pass it raw, one ignores it. Gemini has its own thinking config. Deferred to implementation (#185).
- **Antigravity: does the upstream accept vision or document input?** The Anthropic door carries both;
  unchecked. #186 should answer it, #191 must record the answer.
- **Antigravity: what refresh skew?** The reference uses ~50 minutes against a ~60-minute token, so it
  refreshes on nearly every request older than ten. Match it or pick something saner — open (#188).
- **Does the runtime's default transport already satisfy what the reference pins?** The reference forces
  HTTP/1.1 because Go defaults to HTTP/2; undici is HTTP/1.1 already, so this fork may cost nothing.
  **Verify in #189, do not assume.**

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[2026-07-29-antigravity-narrow-port-never-mint-opaque-tool-ids]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
