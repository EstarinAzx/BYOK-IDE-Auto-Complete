---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-30 by Opus 5 (relay leg 4: #190 landed and verified live)._
_At commit: `6a7e0fe` on main. **#191 is `ready-for-agent` — the chain is armed for leg 5.**_

## Current focus

**#190 LANDED (`6a7e0fe`, PR #195) — Antigravity answers rate limits as 429, and seeds cooldowns from the
horizon the server actually stated.** Gate on merged main: **991/991 vitest** (971 before), `bun run compile`
clean in **BOTH** packages.

Every executor record returned `undefined` from `classify`, so **every** rate limit on **every** Provider left
the Bridge as a 502 — a gateway fault, which is neither what happened nor something a client can act on.
Antigravity is the first record to say 429.

- `antigravity.ts` — `antigravity429Failure` builds #166's four-field failure shape plus, for a spent window,
  `cooldownSeconds` from the server's stated horizon. `antigravityApiError` **attaches it to the thrown
  Error**; `antigravityFailureOf` reads it back. `antigravity429Error` survives as the `{status, message}`
  view, so #187's pins hold unchanged.
- `routing.ts` — `ProviderCooldowns.noteQuotaWindow(id, seconds)`: a **second door onto the same long
  channel** for a record that classified the failure itself. `parseUsageLimitReset` untouched, so the widening
  is additive and no other Provider's behaviour moves.
- `bridgeServer.ts` — the record's `classify` hook, and `noteProviderError` seeding the quota window *before*
  the blip streak so a spent window never accumulates blip credit.

### Why the verdict rides on the Error rather than its message

The message cannot round-trip it. A 429 the pure layer **declined** renders as
`Antigravity API error 429: <raw upstream body>`, and that body says `RESOURCE_EXHAUSTED` /
`RATE_LIMIT_EXCEEDED` **exactly like a classified one** — they differ by a number that was parsed and then
thrown away. Guessing is asymmetric: guessing "classified" kills the bounded retry and loses the turn.

**The control is the argument.** Swapping in the natural message classifier leaves **990 of 991 green**,
failing only `leaves a below-threshold 429 to the bounded retry`. Every "does it answer 429" test passes,
because the wrong implementation answers 429 for everything — so the test that pins this is the one asserting
a **non**-classification. Full reasoning:
[[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]].

### Verified live — and the horizon checks out independently

The Claude quota on this Provider is exhausted until `2026-07-30T20:55:48Z`, so a real 429 was reachable on
demand. One real turn at `claude-sonnet-4-6` against the real daily host returned
`Antigravity API error 429: QUOTA_EXHAUSTED`, carrying `status 429`, `code antigravity_quota_exhausted`,
`type rate_limit_error` and **`cooldownSeconds: 118540`**.

The probe ran at `2026-07-29T12:00:28Z` — **118,548s** before the reset #189 independently recorded. The code
read **118,540**. The gap is the request's own latency, so that is genuinely the server's stated window, not a
default and not arithmetic done here. Happy path unaffected: the same probe at `gemini-3.1-pro-low` completed
a real streamed turn. Read-only — `~/.wisp` read, never written; the Bridge on 41184 untouched.

### Found while testing, left for #191

**The Anthropic door does not use the executor records at all.** `startProviderStream` carries its own
per-kind chain (codex → anthropic → xai → keyed) with no Antigravity arm, so `/v1/messages` on this Provider
answers `400 has no API key configured` before any 429 can happen. The classification is already
**door-neutral** — both doors answer through the shared `failProviderRequest` — so #191 gets the 429 for free
once it adds the arm, and must not re-implement it.
[[the-anthropic-door-does-not-use-the-executor-records]].

### Previously — #189 (`c6f644a`)

**#189 LANDED (`c6f644a`, PR #194) — the first real Antigravity turn works, verified live.** Antigravity is
the **fifth `ProviderExecutor` record**, not a sixth special case. Gate on merged main: **971/971 vitest**,
`bun run compile` clean in **BOTH** packages.

`antigravity.ts` +239 (thirteen-model lineup with per-model caps, daily-first host chain, URLs + mirrored
headers, `antigravityApiError` — the throw shape, the injected random session-id fallback, and
`buildAntigravityPayload` / `buildAntigravityRequestBody`) + new `antigravityClient.ts` (streaming with the
SSE flag, non-streaming, the host walk) + the executor record, the `BridgeDeps` pair, the models branch, the
image refusal, both faces wired.

**Live, after the user's `/signin antigravity`:** a real streamed turn (`TURN_OK` from `gemini-3.1-pro-low`);
**tool calling end to end** — call emitted, result returned, and the model used it (*"…19 degrees Celsius
with drizzle"*); the upstream's own id `noxjacvf` passed through untouched; signed-out 401 before any head;
the image row listed and refused with real creds; the live 429 classified to the exact contract shape. Plus,
from before the sign-in: the transport question settled by measurement — both Bridge runtimes already
negotiate `http/1.1`, so the reference's HTTP/1.1 fork is deliberately not ported.

### ⚠ The bug the live turn caught — and it would have shipped

**The first live turn returned an EMPTY answer at HTTP 200 with a 971-test green suite.** The upstream frames
SSE with `\r\n\r\n`; `sseBlocks` split on `'\n\n'`, which **never matches CRLF** (the `\r` sits between the
two `\n`). The whole response arrived as one block, its concatenated JSON failed to parse, every frame was
dropped — silent, and indistinguishable from a model that said nothing. The fixture had been **retyped rather
than copied**, normalising CRLF to LF, so every content assertion was faithful and only the framing was wrong.

Separator is now `/\r?\n\r?\n/` (identical on `'\n\n'`, so Codex/Anthropic untouched); fixtures reframed to
CRLF; two named regression tests. Control: reverting fails 5 tests including
`expected [] to deeply equal ['TURN','_OK']` — before the fixtures were reframed, the same revert failed
**nothing**. Full reasoning: [[2026-07-29-a-retyped-sse-fixture-cannot-catch-a-crlf-framing-bug]].

**The lesson about the gate:** #189's six deliberate-break controls and its contract asserted against the
*real* `isTransientProviderError` all ran **downstream of the framing**. Live verification was not ceremony —
it was the only thing that could catch this.

### One #189 criterion still open — the account, not the code

**A Claude model turn.** Live result: `Antigravity API error 429: QUOTA_EXHAUSTED`, resets
`2026-07-30T20:55:48Z`. The path *is* wired (the request builds, sends, reaches the upstream and classifies
correctly — which is exactly the horizon #190 consumes); what is unproven is a Claude turn *completing*. Does
**not** block #190 or #191, both of which run on Gemini. Also unforceable: production reached on daily's REAL
failure — daily is confirmed as the host used, and the fallback is stub-verified against a capacity 503, a
429 and a transport error.

### Previously — #187 (`e04f53b`)

**Spec #185's whole credential-free half.** `packages/core/src/antigravity.ts`
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

_(#186, the auth spike that gated this, passed 2026-07-29 — access confirmed.)_

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

- **In flight:** nothing. Working tree clean on main at `6a7e0fe`, pushed; the #190 branch is merged and
  deleted. **The relay chain ran legs 1–4 (#187, #188, #189, #190) and is armed for leg 5 on #191.**
- **#190 ✅ `6a7e0fe` (PR #195)** — rate limits answer 429; cooldowns seeded from the server's horizon. Gate on
  merged main: **991/991 vitest**, compile clean **both** packages. **Five** deliberate-break controls, each
  failing only the tests that pin its claim — including the one that proves the carrier design (the obvious
  message-sniffing classifier fails exactly one test). **Verified live** against a real quota-exhausted 429.
- **#189 ✅ `c6f644a` (PR #194)** — the executor record + the OpenAI door. Gate on merged main: **971/971
  vitest**, compile clean in **both** packages. Six deliberate-break controls, plus a **live** end-to-end
  turn and tool-call round trip after the user signed in. The live run is what caught the CRLF framing bug
  that the whole green suite missed — see Current focus.
- **#188 ✅ `ba8dab3` (PR #193)** — the catalog row, credential slice and `AntigravityAuth`. 905/905 vitest,
  persistence verified end to end against a real `WispHome`.
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

**Spec #185 — Antigravity, seven tickets, FIVE landed:**

| # | Ticket | Label | Blocked by |
|---|---|---|---|
| ~~186~~ | ~~Auth spike~~ | ✅ **passed — access confirmed** | — |
| ~~187~~ | ~~Pure layer — envelope, tools, signatures, 429, SSE~~ | ✅ **`e04f53b`** + `63453e0` | — |
| ~~188~~ | ~~Catalog row, kind, creds slice, `AntigravityAuth`~~ | ✅ **`ba8dab3`** (PR #193) | — |
| ~~189~~ | ~~Executor record + OpenAI door — first real turn~~ | ✅ **`c6f644a`** (PR #194) | — |
| ~~190~~ | ~~Rate limits answer 429; cooldown from server horizon~~ | ✅ **`6a7e0fe`** (PR #195) | — |
| **191** | Anthropic door — Claude Code driven by Gemini | **`ready-for-agent`** | — |
| **192** | Release — npm + TUI face, surfaces named | — | #190, #191 |

**#186 PASSED 2026-07-29 — access confirmed, gate lifted, #188 labelled.** The rule that put the gate there
still governs the rest: `## Blocked by` is body text, not native links, so **labels are the only real gate**
and exactly one ticket is armed at a time.

**#188 LANDED 2026-07-29** — squash-merged as **`ba8dab3`** via PR #193, closed. 905/905 vitest, compile
clean both packages, persistence verified end to end against a real `WispHome`. It was briefly held
`ready-for-human` mid-session while the credential question below was settled, then merged on the
maintainer's explicit call. **#189 LANDED 2026-07-29** — squash-merged as **`c6f644a`** via PR #194, closed.
971/971 vitest, compile clean both packages, and verified **live** end to end after the user's
`/signin antigravity`. **#190 LANDED 2026-07-30** — squash-merged as **`6a7e0fe`** via PR #195, closed.
991/991 vitest, compile clean both packages, five deliberate-break controls, and a real quota-exhausted 429
driven live. **#191 is the only armed ticket**; #192 closes the spec after it.

**Re-arming order** (one step at a time): #190 lands → #191 (already armed) → then #192, which closes #185.

**Credential hygiene, settled 2026-07-29** — [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]:

- **Never write account-identifying values into this repo.** The Cloud Code project id is read live from
  `loadCodeAssist` at sign-in; tests use the placeholder `example-project-1`. One earlier commit (`4421e61`)
  put the real id in `.context/`; scrubbed going forward, history deliberately **not** rewritten (it is an
  inert identifier — it authorises nothing without the OAuth bearer, and a public repo's history is already
  forkable).
- **No access or refresh token has ever been committed** — verified with token-pattern search across all of
  git history, zero matches. The live tokens live in `~/.wisp/auth.json` and `D:\scratch\antigravity-spike\`,
  both outside the repo. That scratch file is the only real credential artefact on disk.
- **Client id + secret are a judgement call, not a rule.** An installed-app secret cannot be kept
  confidential (RFC 8252) — which is why PKCE S256 is built in — but redistributing it can get the upstream
  client revoked. Ask before putting one in a public repo; do not decide it by reference parity alone.

**What #186 proved:** access confirmed (project id read live from `loadCodeAssist`; the real value is
deliberately not recorded in this repo), **PKCE S256 accepted** (no spec
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

**Closed this session:** #190 (`6a7e0fe`).
**Closed previously:** #183 (`819900b`/`v2.0.39`), #182 (`9fd63f0`, ADR-0004), #184
(`d36688c`/`v2.0.40` + `b672333`).

## Pick up here

**The agent queue is armed. Run `/relay N=1 /preset ticket-loop`.**

It takes the only unblocked `ready-for-agent` ticket — **#191** (the Anthropic door — Claude Code driven by
Gemini) — then **#192**, which closes spec #185.

Three things to carry into #191 specifically:

- **The work is one missing arm, not a subsystem.** That door does not use the executor records at all:
  `startProviderStream` has its own per-kind chain (codex → anthropic → xai → keyed) and Antigravity simply
  is not in it, so `/v1/messages` answers `400 has no API key configured` today.
  [[the-anthropic-door-does-not-use-the-executor-records]].
- **The 429 answer comes for free.** Both doors answer through the shared `failProviderRequest`, which reads
  `executorFor(provider).classify` — #190's classification is already door-neutral. Do **not** re-implement it.
- **The door carries wire behaviour the records do not**: the #139 system split, the #156 diagnosis chain,
  vision/documents and non-strict tools. That is why #167 left this door alone, and the arm must respect it.

One loose end that is **not** blocking: re-run a Claude-model turn after `2026-07-30T20:55:48Z` to close
#189's last acceptance criterion. As of `2026-07-29T12:00Z` that quota is still exhausted — which is what let
#190 verify its own 429 path live.

Two user actions still outstanding from before: **install `packages/vscode/wisp-1.10.1.vsix`** (that face is
not on the marketplace, so it does not carry #182 until installed by hand), and **#170** needs a Kimi Code
subscription.

## Skills for next session

- `/preset pick-up` — session door.
- `/relay N=1 /preset ticket-loop` — **ran legs 1–4 (#187, #188, #189, #190); leg 5 is armed on #191.**
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
- **Settled for this row:** _Antigravity — how does effort map?_ → **it does not need to.** The lineup encodes
  its own tier in the model id (`gemini-3.1-pro-low`, `gemini-3.6-flash-high`, `gemini-3.5-flash-extra-low`),
  so #189 threads no effort at all and the picker is the depth control. Mapping the shared knob onto Gemini's
  thinking config stays available if the user wants it — flagged on PR #194.
- **Antigravity: does the upstream accept vision or document input?** The Anthropic door carries both;
  unchecked. #186 should answer it, #191 must record the answer.
- **Antigravity: what refresh skew?** The reference uses ~50 minutes against a ~60-minute token, so it
  refreshes on nearly every request older than ten. Match it or pick something saner — open (#188).
- **Settled by measurement (#189):** _does the runtime's default transport already satisfy what the reference
  pins?_ → **yes, it costs nothing.** Probed 2026-07-29 against an h2-capable host: `http/1.1` negotiated on
  **both** Bridge runtimes — bun 1.3.14 (`wisp serve`) and node 22.17/undici (extension host). undici only
  speaks h2 when a Client is built with `allowH2`, which nothing here does. The reference's HTTP/1.1 transport
  fork is therefore **deliberately not ported**; adding a knob would be dead configuration.

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
- [[2026-07-29-antigravity-narrow-port-never-mint-opaque-tool-ids]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
