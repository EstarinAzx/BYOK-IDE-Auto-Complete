---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (relay leg 1: #187 landed, queue dry)._
_At commit: `e04f53b` on main. **Agent queue is EMPTY — #186 needs a human before anything else is labelled.**_

## Current focus

**#187 is landed (`e04f53b`). Spec #185's whole credential-free half is in.** `packages/core/src/antigravity.ts`
(806 lines) + `packages/core/tests/antigravity.test.ts` (78 tests), exported through the `catalog.ts` barrel
like every other pure Provider core. Gate: **868/868 vitest (783 before), `bun run compile` clean in BOTH
packages.**

It needed no credentials and did not wait on the spike — it is a transcription of the reference's own
~3,900-line test corpus. What landed: the Cloud Code envelope, the content-derived session id, the
model-family fork table, path-scoped schema cleaning (two cleaners), the fourth tool builder, the four
signature/pairing pieces, the stateless 429 classifier, and the SSE mapper onto `BridgeStreamEvent`.

**Both load-bearing rules were verified with controls, not just green ticks:**

- **The binding rule holds and is guarded.** Minting a content-hash id when upstream sent none — the exact
  "stable synthetic ids" change the spec warns about — **fails two tests**. Absent upstream id ⇒ **empty**
  id, never a minted one.
- **History preservation has TWO protections here, where the reference had one** — path scoping *plus* a
  walker that descends only schema positions. Control: scope alone does **not** corrupt history; a generic
  deep walk applied whole-document **does**, failing both arms. So the change that re-arms the reference's
  production bug is *"simplify the walker"*, and no single test catches it.
  [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]].

Reference clone still at `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`, re-clonable).

**Ticket #186 (auth spike) is `ready-for-human` and now gates EVERYTHING remaining.** Nothing else carries
`ready-for-agent` — see Queue below.

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

- **In flight:** nothing. Working tree clean on main at `e04f53b`, pushed. **The relay chain ran its one leg
  and stopped on a dry queue** (`.claude/relay/ticket-loop.md`, `stop: true`, leg 1) — the designed ending,
  not a failure. Re-arm by labelling the next ticket and re-running `/relay N=1 /preset ticket-loop`.
- **#187 ✅ `e04f53b`** — the pure Antigravity layer. Gate before the merge: **868/868 vitest**, `bun run
  compile` clean in **both** packages. Verified with two deliberate-break controls (binding rule, history
  corruption) — a green run alone would not have distinguished the safe implementation from the unsafe one.
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

**Spec #185 — Antigravity, seven tickets, ONE landed:**

| # | Ticket | Label | Blocked by |
|---|---|---|---|
| ~~186~~ | ~~Auth spike~~ | ✅ **passed — access confirmed** | — |
| ~~187~~ | ~~Pure layer — envelope, tools, signatures, 429, SSE~~ | ✅ **`e04f53b`** + `63453e0` | — |
| **188** | Catalog row, kind, creds slice, `AntigravityAuth` | **`ready-for-agent`** | — |
| **189** | Executor record + OpenAI door — first real turn | — | #188 |
| **190** | Rate limits answer 429; cooldown from server horizon | — | #189 |
| **191** | Anthropic door — Claude Code driven by Gemini | — | #189 |
| **192** | Release — npm + TUI face, surfaces named | — | #190, #191 |

**#186 PASSED 2026-07-29 — access confirmed, gate lifted, #188 labelled.** The rule that put the gate there
still governs the rest: `## Blocked by` is body text, not native links, so **labels are the only real gate**
and exactly one ticket is armed at a time.

**Re-arming order** (one step at a time): #188 lands → label #189 → then #190 **and** #191 together → then
#192, which closes #185.

**What #186 proved:** access confirmed (project `phonic-bonfire-bq1hc`), **PKCE S256 accepted** (no spec
revision needed), refresh token received, pinned version `2.2.1` accepted, **daily host answered**, vision
**and** PDF input both accepted (closing that open question), tool calling works streaming and non-streaming.
Verified constants are a comment on #188; fixtures at `D:\scratch\antigravity-spike\out\`, outside the repo.

**Two live findings that change the remaining tickets:**

1. **The model catalog is advisory, not a guarantee.** 24 models listed, not the 13 the spec assumed — and
   `gemini-3.1-pro-high` **400s on every request shape tried** while `gemini-3.1-pro-low` and
   `gemini-3.6-flash-high` 200 on the identical body; `gemini-2.5-pro` returns 503 no-capacity. #188 must
   tolerate a listed-but-unservable row.
2. **⚠ Claude quota exhausted until `2026-07-30T20:55:48Z`.** Real ids are `claude-sonnet-4-6` and
   `claude-opus-4-6-thinking` (`-4-6`, not `4.5`). #188–#190 unaffected (they run on Gemini); **#191 cannot
   be verified live until it resets.**

**What #187 hands the tickets downstream** (also recorded on the ticket):

- `antigravityStableSessionId` returns **`undefined`** when the payload carries no anchor text. The reference
  falls back to a random session id; a random value cannot live in a pure layer, so **#189 supplies it**.
- Request ids are **injected**, not minted: `antigravityRequestId(uuid)` / `antigravityImageRequestId(nowMs,
  uuid)` keep the upstream's two formats as pure functions. #189 owns the uuid/clock.
- `antigravity429Error` returns **`Antigravity API error 429: <reason>`** deliberately — anything else gets
  **zero** retries from `isTransientProviderError`. #189/#190 must throw this exact shape.
- `decideAntigravity429` keeps all four reference kinds **plus `retryAfterMs`**, because that is what **#190**
  needs to write a cooldown horizon. `antigravity429Error` is only the thin "declines below the instant-retry
  threshold" view over it.
- `BridgeStreamEvent` is imported **as a type only**, so `bridge -> catalog` stays the sole runtime edge and
  the module graph does not cycle (the `xai.ts` pattern).

**Still open, unrelated:**

| # | Ticket | Note |
|---|---|---|
| **163** | The 502 observation | Diagnosis confirmed. Open pending a stretch of clean use in the 217k–245k band. Closing it is *waiting*, not working. |
| **174** | Antigravity placeholder | **Groomed** → #185. Left open as the tracking issue until #185 closes. |
| **69** | copilot-wisp launcher | Ungroomed. |

**Closed this session:** #187 (`e04f53b`).
**Closed previously:** #183 (`819900b`/`v2.0.39`), #182 (`9fd63f0`, ADR-0004), #184
(`d36688c`/`v2.0.40` + `b672333`).

## Pick up here

**One thread, and it needs a human. The agent queue is dry by design.**

1. **Human: run the #186 auth spike.** Browser OAuth on the Google account, confirm Antigravity access,
   record the PKCE verdict and the posture verdict, save the captured request/response fixtures on the
   ticket. This gates every remaining ticket. Ten minutes.
2. **Then, and only then:** label **#188** `ready-for-agent` and re-run `/relay N=1 /preset ticket-loop`
   (flip `stop: false` in `.claude/relay/ticket-loop.md`, or just re-issue the command — a stopped chain
   re-inits). One ticket per re-arm, in the order above.

Access **not** confirmed → comment the finding on #186, label nothing, leave #185 dormant. Do not flip
labels hoping it works out.

Two user actions still outstanding from before: **install `packages/vscode/wisp-1.10.1.vsix`** (that face is
not on the marketplace, so it does not carry #182 until installed by hand), and **#170** needs a Kimi Code
subscription.

## Skills for next session

- `/preset pick-up` — session door.
- `/relay N=1 /preset ticket-loop` — **ran leg 1 (#187), stopped on a dry queue.** Re-arm by labelling the
  next ticket in the order above, then re-issuing the command.
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
