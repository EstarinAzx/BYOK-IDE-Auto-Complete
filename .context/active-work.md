---
type: active-work
project: wisp
updated: 2026-07-30
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-30 by Opus 5 (relay leg 6: #192 cut as PR #198, held at the tag push)._
_At commit: `5e96abc` on main; the release cut is `c49532c` on `ticket/192-antigravity-release`, **unmerged on
purpose**. **#192 is `ready-for-human` and the agent queue is DRY — the relay chain stopped here.**_

## Current focus

**#192 CUT, NOT PUBLISHED — PR #198 (`c49532c`) bumps the TUI package to 2.0.41 and writes its changelog.
The `v2.0.41` tag is deliberately not pushed, and the PR is deliberately not merged.**

Gate: **1009/1009 vitest**, `bun run compile` clean in **BOTH** packages. No code changed — everything being
released is already on main (`e04f53b`, `63453e0`, `ba8dab3`, `c6f644a`, `6a7e0fe`, `915d415`).

### Why it stopped

An npm version **can never be republished**, and it is public. Every prior ticket in this spec had a worst case
of "a merge to your own repo"; this one does not, so the tag is handed over rather than taken. Not merged
either, on purpose: a release commit sitting on `main` untagged is a trap for the next agent, which would see
`2.0.41` in `package.json`, `2.0.40` on npm, and reasonably conclude a tag push is owed.

**Two commands, the user's to run:**

```
gh pr merge 198 --squash --repo EstarinAzx/Wisp-Router
git checkout main && git pull && git tag v2.0.41 && git push origin v2.0.41
```

### The Surfaces check caught a wrong ticket premise

#192's body says "the extension face gets nothing from this release." **It does.**
`git log v2.0.40..main -- packages/vscode/` returns **`ba8dab3` (#188)** and **`c6f644a` (#189)**: the
extension constructs `AntigravityAuth` to refresh the bundle and bootstrap the Cloud Code project, passes
`antigravitySignedIn`/`antigravityCreds` into **its own** `createBridgeServer` — **that face hosts the Bridge
too** — and renders the `antigravity-oauth` row with a truthful signed-in status. It bundles its own
`@wisp/core`, so **no npm version delivers any of it**. Bump owed, filed as **#197** (vsix 1.11.0),
deliberately **unlabelled** so no frontier query picks it before #192 lands.

Full reasoning:
[[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]. `plugins/` was
genuinely untouched, so `wisp-slot` staying at **1.6.0** is evidence-backed rather than assumed.

### Still unmet — every one of these needs the publish

Release workflow green on all four runners · published version verified **past the registry read** (real
install, bins executed) · **2.0.40 installed as a control and failing** the check 2.0.41 passes · npm 404 on a
just-published version treated as propagation lag · **spec #185 closed** · then label **#197**
`ready-for-agent`.

## Previously (relay leg 5)

**#191 LANDED (`915d415`, PR #196) — the Anthropic door's fourth arm. Claude Code, driven by Gemini, through
Antigravity.** Gate on merged main: **1009/1009 vitest** (991 before), `bun run compile` clean in **BOTH**
packages.

The Anthropic door does **not** shape requests through the executor records. `startProviderStream` carries its
own hand-rolled per-kind chain — deliberately, because the door owns wire behaviour the records cannot express
(the #139 system split, the #156 diagnosis chain, vision/documents, non-strict tools). That chain ran
codex → anthropic → xai → keyed, so an Antigravity Target fell through to the keyed tail and answered
`400 has no API key configured`: a missing arm wearing a config mistake's error message. It was
**unit-invisible by construction** — every OpenAI-door test passes with the arm absent — so every test added
here drives the real listener over `/v1/messages`.

- `bridgeServer.ts` — the fourth arm: creds check, the image refusal (the same string the OpenAI door's record
  uses), the turn mapping, `antigravityStream`.
- `antigravity.ts` — thought parts now ride the **thinking** channel instead of being dropped, and
  **documents** ride as `inlineData` parts beside images.

### Inherited, not rebuilt

**The 429 and the retry boundary.** Both doors answer through the one shared `failProviderRequest`, which
reads `executorFor(provider).classify`, so #190's classification was already door-neutral; and `openPrimed`
wraps the eager base pass only (advisor continuations and the reviewer sub-call are deliberately not retried).
The arm carries **no** 429 handling and **no** retry of its own — that boundary is matched, not widened.

### The four deliberate divergences from the arm above it

Full reasoning: [[2026-07-30-the-antigravity-arm-is-not-a-copy-of-the-anthropic-arm]].

1. **The FULL system rides, not `systemSplit.stable`.** The Anthropic arm prefers `stable` because the split
   places a **cache breakpoint** and the volatile tail threads separately as `systemSuffix`. This wire has
   neither, so `stable` alone is not "the cached part" — it is the system prompt with its tail deleted.
   Copying the arm three lines up (the most natural tidy-up there is) silently drops the mid-session
   `<system-reminder>` append from every request, with nothing erroring.
2. **Thought parts surface; `thoughtSignature` does not.** It is *this* wire's replay token; an Anthropic
   `thinking.signature` means a different thing, and the only consumer would be a replay path that does not
   exist (`AntigravityTurn` has no `rawContent` channel). An empty signature is what the Anthropic OAuth wire
   already sends through this same encoder.
3. **Documents wired beside images** — one attachment shape on this wire, two lines. Left out, it repeats the
   door's old silent-vision hole with PDFs.
4. **No effort, no strictness flag, no `mapOAuthStream` hop** — Gemini bakes reasoning into the model id,
   `buildAntigravityTools` already cleans Claude Code's schemas, and the stream already speaks
   `BridgeStreamEvent`.

### The controls

Five deliberate breaks, each failing **exactly its own tests and nothing else**: removing the arm (the whole
`/v1/messages` block goes, everything else stays green), copying the Anthropic arm's `systemSplit` preference
(one test), dropping documents (one), re-dropping thought parts (three), removing the image refusal (one).

### Verified live — driving the door, not the record

Through a sandboxed `WISP_HOME` (real `~/.wisp` config + auth never written; the real Bridge on 41184 left
running): a streamed turn; a **tool round trip** — `get_weather` called with the upstream's own id
`i7j25lmi`, the result sent back, answered *"The weather in Paris is currently 17°C and raining."*; **vision**
on a real PNG, described correctly; **a PDF** read back (`WISP191`); a family route and an Alias both
answering, the Alias on its pinned model; the image row refused; `claude-wisp-antigravity` in the door's own
list.

**Claude Code launched through `claude-wisp` completed a real agent turn** — a Read tool call and its result —
answered by Gemini, with both door calls logged routing to `antigravity`.

### #185's open question is answered

**This upstream accepts BOTH vision and document input.** A 400 on an image mid-run turned out to be an
**invalid hand-written fixture PNG**, not the wire — and a `gemini-3.1-pro-low` run that declined to call a
tool was the model's discretion, with the declarations on the wire the whole time. Both cost a diagnosis
cycle; the lesson is folded into
[[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]].

### Still open on #189 — the account, not the code

**A Claude-model turn on Antigravity.** That quota is exhausted until `2026-07-30T20:55:48Z` (it is what let
#190 verify its 429 live). "Claude Code driven by Gemini" is #191's own framing, so nothing is blocked.

### Previously — #190 (`6a7e0fe`)

**Antigravity answers rate limits as 429, and seeds cooldowns from the horizon the server actually stated.**
Gate: **991/991 vitest**, compile clean both packages. Every executor record returned `undefined` from
`classify`, so every rate limit on every Provider left the Bridge as a 502 — a gateway fault, which is neither
what happened nor something a client can act on.

**The verdict rides ON the thrown Error, not in its message** — deliberately breaking the house style, because
for this Provider the message cannot round-trip it: a **declined** 429 renders as
`Antigravity API error 429: <raw upstream body>`, and that body says `RESOURCE_EXHAUSTED` /
`RATE_LIMIT_EXCEEDED` exactly like a classified one. They differ by a number that was parsed and discarded.
Swapping in the natural message classifier leaves **990 of 991 green**, failing only `leaves a below-threshold
429 to the bounded retry` — so the test that pins the design is the one asserting a **non**-classification.
[[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]].

Verified live: a real `claude-sonnet-4-6` 429 carried `cooldownSeconds: 118540` against an
independently-recorded reset **118,548s** away — the server's own horizon, to within request latency.

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

- **In flight: PR #198, open and unmerged on purpose.** Branch `ticket/192-antigravity-release` at `c49532c`,
  pushed. Working tree clean on main at `5e96abc`. **The relay chain ran legs 1–6 (#187, #188, #189, #190,
  #191, #192) and STOPPED at leg 6** — #192 is `ready-for-human`, the agent queue is dry, and no leg 7 was
  spawned.
- **#192 ⏸ CUT, HELD (PR #198, `c49532c`)** — wisp-router **2.0.41**, the Antigravity release. Gate:
  **1009/1009 vitest**, compile clean **both** packages. Two files only (version + changelog), matching every
  prior release cut's shape. **The `v2.0.41` tag is not pushed and the PR is not merged** — npm cannot
  republish a version, so the one irreversible act in this spec is the user's. Its `### Surfaces` check found
  #192's own body wrong about the extension face; **#197** filed for the owed vsix 1.11.0 bump.
- **#191 ✅ `915d415` (PR #196)** — the Anthropic door's fourth arm; Claude Code driven by Gemini. Gate on
  merged main: **1009/1009 vitest** (991 before), compile clean **both** packages. **Five** deliberate-break
  controls, each failing only its own tests. **Verified live** — a streamed turn, a tool round trip on the
  upstream's own id, vision on a real PNG, a PDF read back, a family route and an Alias both answering, and a
  real Claude Code agent turn through `claude-wisp` answered by Gemini. Answers #185's open question: this
  upstream takes **both** vision and documents.
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

**Spec #185 — Antigravity, seven tickets, SIX landed, the seventh cut and held:**

| # | Ticket | Label | Blocked by |
|---|---|---|---|
| ~~186~~ | ~~Auth spike~~ | ✅ **passed — access confirmed** | — |
| ~~187~~ | ~~Pure layer — envelope, tools, signatures, 429, SSE~~ | ✅ **`e04f53b`** + `63453e0` | — |
| ~~188~~ | ~~Catalog row, kind, creds slice, `AntigravityAuth`~~ | ✅ **`ba8dab3`** (PR #193) | — |
| ~~189~~ | ~~Executor record + OpenAI door — first real turn~~ | ✅ **`c6f644a`** (PR #194) | — |
| ~~190~~ | ~~Rate limits answer 429; cooldown from server horizon~~ | ✅ **`6a7e0fe`** (PR #195) | — |
| ~~191~~ | ~~Anthropic door — Claude Code driven by Gemini~~ | ✅ **`915d415`** (PR #196) | — |
| **192** | Release — npm + TUI face, surfaces named | ⏸ **`ready-for-human`** — PR #198 open, tag held | — |

**Follow-up filed by #192:**

| # | Ticket | Label | Blocked by |
|---|---|---|---|
| **197** | Antigravity reaches the extension face — vsix 1.11.0 bump owed | **none, deliberately** | #192 |

**#197 is unlabelled on purpose.** `## Blocked by` is body text no frontier query can see, so labelling it now
would hand the next leg the extension release before the npm cut it depends on had merged. Label it
`ready-for-agent` **after** `v2.0.41` is published.

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
driven live. **#191 LANDED 2026-07-30** — squash-merged as **`915d415`** via PR #196, closed. 1009/1009
vitest, compile clean both packages, five deliberate-break controls, and verified live including a real Claude
Code agent turn through `claude-wisp` answered by Gemini.

**#192 CUT AND HELD 2026-07-30 (relay leg 6).** PR #198 (`c49532c`) bumps the TUI package to **2.0.41** and
writes its changelog; gate **1009/1009** vitest, compile clean both packages. **Neither merged nor tagged** —
an npm version can never be republished, so that act is the maintainer's. Relabelled `ready-for-human`, the
agent queue went dry, and the relay chain stopped rather than spawning leg 7. Its `### Surfaces` check found
#192's own body wrong about the extension face, and filed **#197** for the owed vsix bump.

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

**The hold is LIFTED. #192 is `ready-for-agent` and relay leg 7 is publishing 2.0.41.**

The maintainer waved off leg 6's hold on 2026-07-30. **Merging PR #198 and pushing the `v2.0.41` tag is
authorized** — that publishes publicly and permanently to npm, and it is expected of leg 7, not an overstep.

**⚠ Leg 7 must RESUME PR #198, not restart #192.** The ticket-loop idempotency guard fires on branch
`ticket/192-antigravity-release`; the right answer is resume, not "collision → `ready-for-human`".

Order: merge → re-gate on merged main → tag → watch `release.yml` on all four runners → verify **past the
registry read** with the bins executed → **2.0.40 as a failing control** → close #192 + spec #185 (clearing
#192's label by hand) → label **#197** `ready-for-agent` last.

One loose end that is **not** blocking: re-run a Claude-model turn after `2026-07-30T20:55:48Z` to close
#189's last acceptance criterion. As of `2026-07-29T12:00Z` that quota is still exhausted — which is what let
#190 verify its own 429 path live.

Two user actions still outstanding from before: **install `packages/vscode/wisp-1.10.1.vsix`** (that face is
not on the marketplace, so it does not carry #182 until installed by hand), and **#170** needs a Kimi Code
subscription.

## Skills for next session

- `/preset pick-up` — session door.
- `/relay N=1 /preset ticket-loop` — **ran legs 1–6 (#187, #188, #189, #190, #191, #192) and stopped: #192 is
  `ready-for-human` and the queue is dry.** Re-arm by publishing 2.0.41 and labelling #197.
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
