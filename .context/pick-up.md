---
type: pick-up
project: wisp
updated: 2026-09-04
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Latest (2026-09-04): 2.0.48 + vsix 1.13.3 are SHIPPED, verified on both faces and installed. Nothing is
owed in the repo.**

A user report that every Antigravity turn was failing — a 400 inside a 502, retried ten times. **The tool
list was the cause, not the Provider.** One MCP tool declared `query.where` as an array of arrays with
nothing inside the inner one, and this wire rejects an `ARRAY` node carrying no `items`, failing the
*whole request* at every model. Fixed by `fillArrayItems` (`8db89a3`), cut as `531a063` / `v2.0.48`, run
`33754192787` green on all five jobs.

The rule came from **driving the wire, one tiny turn per candidate shape** — and it overturned the proto,
which marks `Schema.type` `REQUIRED` (not enforced) and `items` `OPTIONAL` (enforced):

    {"type":"array"}                            400  …properties[where].items: missing field
    {"type":"array","items":{"type":"array"}}   400  …properties[where].items.items: missing field
    {"type":"array","prefixItems":[…]}          400  …properties[where].items: missing field
    {"type":"array","items":{}} · {"description":"…"} · {} · {"type":"object"}   200

An interim commit (`efaa249`) had defaulted a missing `type` on the proto's authority; the table
disproved it and it was removed before the cut — `defaultMissingTypes` greps **0** in both shipped
artifacts. Full reasoning:
[[2026-09-04-the-server-not-the-proto-says-which-schema-fields-are-required]] ·
[[a-tool-schema-the-wire-rejects-fails-every-turn-not-one-tool]].

## ⚠ Owed to the user before anything else

**Restart the Bridge.** PID **9172** is still running `~/.wisp/bin/v2.0.47/wisp.exe` (started 2026-09-03
21:31), so the fix is released but **not live**. A bridged Claude Code session is talking to that very
process — killing it cuts that session, so it is the user's call, never an agent's
([[an-upgraded-package-does-not-touch-the-process-already-running]]). The editor face is already on
1.13.3; a window reload activates it.

## Next task: the Fable cache re-bills

The one thing this session found and did not fix. Three advisory lines off the **2.0.47** Bridge, all on
`claude-fable-5-1`, `effort=xhigh`, `images=1`:

    PARTIAL read=265269 expected>=274381 creation=12033 turns=89 — prior write not read back (#162)
    PARTIAL read=267043 expected>=277302 creation=11683 turns=91 — prior write not read back (#162)
    PARTIAL read=70852  creation=208521  uncached_input=2 turns=93 — probable re-bill (#145)

**How to read these before re-deriving them:**

- Healthy growth is exact — `read(n+1) = read(n) + creation(n)`. The `stalled` verdict fires when it
  isn't. Here each turn writes ~12k and the next reads back only ~1.8k more: **~10k per turn written and
  never read**. At the $10/M input Fable charges, that is roughly $0.12 of a ~$0.41 turn, ~30%.
- The **STALE** lines in the same log are the known-benign class (#156): the server claims a miss
  (`missed_input=170455`) the bill contradicts (`billed=11685`). Two sends racing. Ignore them.
- The third line printed the #145 wording, which fires only when the tracker has **no baseline** — a
  first sighting of that conversation key. So a 208k write there could be a compaction rebuild or a new
  branch, and the log cannot tell which. Not evidence on its own.
- Reading code: `createAnthropicCacheGrowthTracker` + `anthropicCacheOutcome` in `anthropic.ts`, emitted
  around `bridgeServer.ts:879-886`.

**First move: capture, don't reason.** The log says the write isn't read back but not *which bytes move*
between turns. Record two consecutive real `POST /v1/messages` bodies and diff them — the probe pattern
from this session (a tiny node server that writes the body to a file and answers 400) is under
`out/probe/` in spirit; it is gitignored and was deleted, so re-create rather than look for it.

**Scoping calls the user has already made:** they have only ever seen this on **Fable**. Worth
confirming whether the same session shape on Opus 5 stalls too — same family gate, so if it is the
trailing-system placement from #363 it should reproduce there and not on Sonnet/Haiku.

## Also unexplained: the big-body 429s

A 46,720-byte Antigravity body answered `429 RESOURCE_EXHAUSTED` on **both** hosts while a 296-byte body
on the **same model seconds later** answered 200. `claude-sonnet-4-6` on that wire is separately and
genuinely exhausted ("Individual quota reached… Resets in 34h0m17s"), but the gemini rows are not. Reads
like a size or token-rate limit. Consequence for diagnosis: **"429" on this wire is not proof the account
is out of quota** — retry small before concluding it.

## Bugs found but NOT shipped (still held — candidate tickets)

Carried forward unchanged from 2.0.47, plus two from this session:

- **Antigravity 4xx are not classified** — a deterministic 400 leaves as `502 provider request failed`,
  so Claude Code retries a request that can never succeed (`attempt 5/10`) and the retry storm hides the
  stable error. The arm classifies only 429s. Same instruction problem #166 fixed for Codex. **NEW.**
- **A TUI-hosted Bridge writes nothing to `bridge.log`** — only `wisp serve` appends
  (`packages/tui/src/serve.ts:24`), so the log that would have shown today's failures did not exist.
  **NEW.**
- **`wisp routing set` always warns "not signed in" for antigravity** — `hasCredentials` in
  `packages/tui/src/routingCli.ts:21` has no antigravity rung and falls through to the API-key test.
  **NEW, trivial.**
- **toolChoice not threaded to the Anthropic arm** (`bridgeServer.ts:664` hardcodes `'auto'`). HELD —
  forwarding a forced `tool_choice` would **400 on Fable 5.1/Mythos**; needs a model-gated forward.
- **Client `max_tokens` dropped**, replaced by `anthropicModelCaps().maxOutput`
  (`anthropicClient.ts:230`). HELD — it is a ceiling, not a bill; low value, ~6 edit sites.
- **Advisor turns under-report usage** (last-write-wins across base passes, `bridgeAnthropic.ts:400`).
  HELD — advisor-only, subtle accounting, higher risk.
- **media-only `tool_result` → empty `content`** (`anthropic.ts` ~334). HELD — unverified whether
  Anthropic 400s on it; ponytail says don't add unconfirmed hot-path guards.
- **Statusline resolver drift** (`wisp-statusline.js:131` missing the provider-id rung + unguarded family
  fuzzy). HELD — a **`wisp-slot`** surface, a separate cut.
- **Needs a real-session capture:** empty-content-turn 400s, thinking-signature lost on interleave,
  delta-usage zeroing cache fields.

## Queue: empty

`gh issue list --label ready-for-agent --state open` → `[]` at the cut. **Verify by query, not by this
note** ([[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]).

Open but deliberately **not** agent-ready: **#207** (blocked on three scoping calls), **#69**, **#163**.

## ⚠ Read before cutting a ticket branch

**`git rev-list --left-right --count origin/main...main` — the right-hand number must be 0.**

A branch cut from an unpushed main sweeps those commits into its own squash-merge (`3465c7c`, #202).
The release commits are pushed (`531a063`, tag `v2.0.48`), but **the `.context/` commit carrying this
note was deliberately left unpushed** — so expect `0 1` and push before branching. Full trap:
[[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]].

## Waiting on the user

- **Restart the Bridge** — see above. The only thing blocking the fix from being live.
- **File the held bugs** as tracker tickets when ready — the statusline drift is a `wisp-slot` cut, the
  rest are core.
- **Dismiss the two secret-scanning alerts** as "won't fix" —
  [#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
  [#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2).
- **Bridge access secret rotation** — delete `bridgeSecret` from `~/.wisp/auth.json`, start any host.
- **#170** — needs a **Kimi Code subscription**.
- **#189's last criterion** — note a completing Antigravity Claude-model turn on closed #189 when
  observed. (Not today: `claude-sonnet-4-6` there is quota-locked for ~34h.)
- **~20 stale local `ticket/*` branches** (`git branch --list 'ticket/*'`). Cleanup, not a blocker.
- **`.context/Untitled.canvas`** — untracked user file, left uncommitted; keep or remove is the user's
  call.
- Optional: the Antigravity **User-Agent pin is stale** — `ANTIGRAVITY_HTTP_USER_AGENT` says
  `antigravity/hub/2.2.1` while the live Hub manifest answers **2.12.0**. Every probe today rode 2.2.1
  and got 200s, so it is not load-bearing yet. The manifest is
  `https://antigravity-hub-auto-updater-974169037036.us-central1.run.app/manifest/latest-arm64-mac.yml`
  (UA `electron-builder`).
- Optional one-liner: `ANTHROPIC_MODELS` (`anthropic.ts:122`, the **offline fallback** list) still knows
  only `claude-fable-5`. Unreachable while models.dev answers.
- Optional: `/plugin update wisp-slot` to refresh cached skill/hook copies to 1.7.4.

## Landmines (durable — keep carrying)

Antigravity schema (new, 2026-09-04):

- **A tool schema this wire rejects fails EVERY turn on the Provider, not just calls to that tool** — the
  list rides on every request. Presents as "the whole Provider is down"
  ([[a-tool-schema-the-wire-rejects-fails-every-turn-not-one-tool]]).
- **The error is an address:** `function_declarations[N]` names the Nth tool **Claude Code sent**, and
  the path after `parameters` is the JSON-Schema node. The failing tool is usually an MCP server's, not
  this repo's — **capture the request body** rather than reasoning about which tools should be there.
- **An `ARRAY` must carry `items`; a typeless node needs nothing.** The proto's `REQUIRED` annotations do
  not describe the server. Re-probe per shape rather than reading `content.proto`
  ([[2026-09-04-the-server-not-the-proto-says-which-schema-fields-are-required]]).
- **`prefixItems` is invisible here** — a 2020-12 tuple arrives as a bare array and 400s.
- **A 429 on this wire is not proof of exhausted quota** — a 46k body 429'd while a 296-byte body on the
  same model passed seconds later. Retry small before concluding.

Anthropic client pin:

- **The version in a `claude_code_version_too_old` 400 is WISP'S, not the user's Claude Code**
  ([[a-live-picker-in-front-of-a-pinned-client-fingerprint-drifts-apart]]).
- **A Claude release makes TWO pins stale, in different packages** — `CLAUDE_CODE_VERSION` (loud, 400s)
  and `CLAUDE_FAMILY_MODELS` (silent, downgrades a route).
- **Never read "it appears in the picker" as evidence a model works.**
- **`withFamilyRoute` validates the providerId ONLY, never the model.**
- **"Released + installed + verified" is not "the fix is live"**
  ([[an-upgraded-package-does-not-touch-the-process-already-running]]).

Prompt-cache placement (#363):

- **The volatile system tail must sit BEHIND every message breakpoint, not in the `system` array** —
  render order is tools→system→messages, so anything in `system` is inside the cached prefix of every
  message marker ([[2026-09-03-the-volatile-tail-must-sit-behind-every-message-breakpoint]]).
- **A trailing `role:"system"` turn 400s on Sonnet & Haiku** — only Opus 5/4.8 + Fable/Mythos 5 accept
  it; gate on `modelSupportsMidConversationSystem`, never send it blind.
- **A turn's bytes must be identical as tail AND as history**, or the prefix cache busts every turn.
- **The 1M-context Claude-5 models have a HIGH minimum cacheable prefix** — a ~22k probe never cached
  while a ~90k real session did (Haiku cached at ~11k). Verify cache fixes with a big-enough prefix.
- **Healthy growth is `read(n+1) = read(n) + creation(n)`, exactly.** Anything less is a real stall, and
  a STALE line beside it is noise, not an explanation.

Statusline / status.json:

- **The model id Claude Code hands you is NOT the Alias name** — a picked route arrives as
  `claude-wisp-<name>`, optionally with a `[1m]` suffix
  ([[a-picked-alias-reaches-the-statusline-prefixed-claude-wisp]]).
- **When a route row is wrong, `grep model ~/.claude/settings.json` FIRST.**
- **The statusline DUPLICATES `resolveRoute`** — out-of-process, has drifted twice. Change
  `routing.ts:60-91` → check the copy, run `node plugins/slot/statusline/check.js` (30 assertions).
- **Its fixtures must use the shape the CALLER sends, not the name the source stores.**
- **A statusline fix needs the pre-fix file as the control** (`git show HEAD:<path>` into scratch).
- **Expired meters (`resetAt <= now`) render `↻ refilled`, dimmed** — one `expired()` predicate at BOTH
  render sites.
- **"Showing anthropic when I'm on codex" has TWO causes** — bare `wisp` → resolution failed; a complete
  route row beside a foreign quota row → global-slot displacement.
- **A bare `wisp` row in a hand-built sandbox is usually the BOM** — seed sandboxes from bash/node
  ([[a-bom-in-wisp-config-silently-empties-the-whole-config]]). `packages/tui/package.json` carries a
  BOM too: read it as text, never `JSON.parse` it in a one-liner.
- **`status.json` is ONE global slot** ([[status-json-is-global-so-it-cannot-observe-another-session]]).
- **Codex on a Plus plan has exactly ONE window**; a `5h`/`7d` pair is Anthropic's.
- **`stream: false` never records a snapshot.**
- **The statusline block runs from the repo checkout, not the plugin cache**
  ([[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]).

Bridge log (#202):

- **The serve banner is NOT mirrored into `bridge.log`** — it prints the Bridge access secret.
- **Only `wisp serve` writes `bridge.log`** — a TUI-hosted Bridge writes nothing. **Check which host is
  running before trusting an empty log.**
- **`bridge.log` is regenerable telemetry** — never overwrite-protected, invisible to the home-store
  watcher via the non-`.json` name filter (`homeStore.ts:125`).

Quota / recon (#204):

- **Only two wires report quota via headers — SETTLED**
  ([[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]).
- **Both usage endpoints answer Wisp's stored OAuth creds**: Anthropic
  `GET api.anthropic.com/api/oauth/usage`, Codex `GET chatgpt.com/backend-api/wham/usage`.
  **`/backend-api/api/codex/usage` is a 404 — do not retry.**
- **Validate a new quota source against one already trusted, not by watching a counter**
  ([[a-new-quota-source-is-cheapest-to-validate-against-one-already-trusted]]).
- **Parse `limits[]` on shape — named buckets are unstable codenames**
  ([[the-usage-payload-names-most-of-its-buckets-in-unstable-codenames]]).
- **Recon that reads a response head must DRAIN the body**
  ([[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]).
- **Prove a wire by driving it** — throwaway probes under gitignored `out/`; delete after. Did exactly
  this twice today; it beat both the truncated error and the proto.
- **Usage payloads carry account identifiers under unpredictable keys — redact on the VALUE**
  ([[loadcodeassist-answers-with-the-account-email-inside-it]]).
- **The Anthropic usage endpoint carries a multi-minute 429 penalty** — budget ≤3 reads.

Release:

- **An npm version can never be republished.** The tag is the trigger; no undo.
- **The tag must equal `packages/tui/package.json` exactly** — `release.yml` verifies.
- **`git push --follow-tags` does NOT push a lightweight tag.** Create with `git tag <v>` and the tag
  silently stays local while main lands; push it explicitly and confirm with `git ls-remote --tags`.
- **A fix release is not verified until the OLD version FAILS the same check**
  ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]).
- **A vsix is evidence only when checked in the BUNDLE**; **verify npm past the registry read** (scratch
  install, execute the bins).
- **Best evidence is a SWAP** — but a cut that removes nothing previously shipped cannot produce one;
  say so rather than implying stronger evidence
  ([[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]).
- **The platform npm packages 404 and that is normal** — the shim falls back to the GitHub release binary
  under `~/.wisp/bin/v<version>/`. Happened again on 2.0.48.
- **Every release entry carries `### Surfaces`, derived from `git log <last-tag>..main -- <face-path>`**
  ([[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]).
- **Labels are the only real gate**; a closed-by-PR issue keeps its `ready-for-agent` label.

Antigravity (full detail in the decision + gotcha entries):

- Two doors, two places ([[the-anthropic-door-does-not-use-the-executor-records]]). FULL system on this
  wire, never `systemSplit.stable`. 429 verdict rides ON the Error. Throw shape is a CONTRACT. SSE
  framing is CRLF. Turns → daily host, `loadCodeAssist` → production. Never mint opaque provider-side
  tool ids.
- **Effort reaches ONLY the `-tiered` rows** — a **suffix shape test**, never a pinned list.
  `xhigh`/`max` fold to `high` ([[2026-08-14-antigravity-effort-reaches-only-the-tiered-rows]]).
- **The model list is LIVE since 2.0.44** ([[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]).
- **A green suite did not catch a dead Provider** — drive a real turn
  ([[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]).

Credential hygiene ([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]):

- Never write account-identifying values into this repo; tests use `example-project-1`. The spike
  fixtures at `D:\scratch\antigravity-spike\out\` carry live credentials — never read, never copy.
- Anything credential-shaped bound for this PUBLIC repo is a question for the maintainer.
- A live-wire probe MAY read `~/.wisp/auth.json` for a bearer (read-only, gitignored `out/`, deleted
  after) — say so in the evidence, and redact emails/uuids/project ids on the VALUE.

General:

- **`packages/core` has NO `compile` script** — gate is `bun run --cwd packages/core typecheck`. Test
  gate is **`bun run test`** (vitest, now 1041) — bare `bun test` runs Bun's runner, bogus failures.
  `packages/tui/tests/` is the **bun runner** (28), run explicitly. No root `typecheck` script.
- Prefer the scoped **`packages/tui:verify`** skill for tui/core CLI-surface work.
- A store that does not parse is never overwritten (#182, ADR-0004); `status.json` and `bridge.log` are
  the documented exceptions.
- The `wisp-slot` version lives in TWO files — 1.7.4 in both.
- `.context/` commits go to main, never a ticket branch.
- No PR CI — only `release.yml` on tag `v*`; the local gate *is* the gate.

Reference clones (both outside the repo, re-clonable): `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`,
**2026-07-28 — its `gemini_schema.go` predates today's findings and has the same itemless-array gap**)
and `D:\scratch\traycer` (shallow, 2026-08-14).

## Related

- [[active-work]]
- [[overview]]
- [[decisions]]
- [[gotchas]]
- [[flows]]
- [[2026-09-04-the-server-not-the-proto-says-which-schema-fields-are-required]]
- [[a-tool-schema-the-wire-rejects-fails-every-turn-not-one-tool]]
- [[2026-09-03-the-volatile-tail-must-sit-behind-every-message-breakpoint]]
- [[2026-09-02-the-advertised-claude-cli-version-is-a-per-model-floor]]
- [[a-live-picker-in-front-of-a-pinned-client-fingerprint-drifts-apart]]
- [[an-upgraded-package-does-not-touch-the-process-already-running]]
- [[2026-08-14-antigravity-effort-reaches-only-the-tiered-rows]]
- [[a-bundled-dependency-is-not-a-face-but-every-face-carries-it]]
- [[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]
- [[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]
- [[2026-08-14-the-usage-endpoint-is-the-same-ledger-reached-without-a-turn]]
- [[a-new-quota-source-is-cheapest-to-validate-against-one-already-trusted]]
- [[the-usage-payload-names-most-of-its-buckets-in-unstable-codenames]]
- [[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]]
- [[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[a-picked-alias-reaches-the-statusline-prefixed-claude-wisp]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]
- [[loadcodeassist-answers-with-the-account-email-inside-it]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
