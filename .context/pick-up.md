---
type: pick-up
project: wisp
updated: 2026-09-04
tags: [context, pick-up]
---

# Pick up

Start: read `.context/overview.md` + `.context/active-work.md` to rehydrate the project.

**Latest (2026-09-04, second cut of the day): 2.1.0 + vsix 1.13.4 are SHIPPED, verified on both faces and
installed. Nothing is owed in the repo.**

The Fable cache re-bill that 2.0.48 left open was run to ground and **is the backend, not Wisp**. One heavy
bridged session ran both models through the same Bridge: 40 consecutive Opus 5 turns grew exactly
(`read(n+1) = read(n)+creation(n)`), the Fable turns beside them fell 4-16k short on ~30% of turns. Claude
Code's native request is byte-identical on both models, Wisp rebuilds Fable thinking byte-for-byte, and the
shortfall exceeds one turn's whole output. So 2.1.0 (`f7b3c50`) **names** it in the `#162` line on a
Fable/Mythos model instead of sending the user to chase breakpoints, and changes nothing on the wire.
Same cut: **Antigravity 400/401/403/404 answer as themselves** (the #166 shape) instead of the 502 that
had Claude Code retrying a dead request ten times. Full reasoning:
[[2026-09-04-the-fable-cache-rebill-is-the-backend-classify-dont-chase]] ·
[[2026-09-04-the-fable-cache-rebill-is-the-backend-not-wisp]].

## Bridge state

**No Bridge is running** — the 2.0.47 process from the last note is gone (no PID, no listener). There is
nothing to restart; whatever the user starts next lands on 2.1.0 (global `wisp-router@2.1.0`, binary at
`~/.wisp/bin/v2.1.0/`). The editor face is on 1.13.4; a window reload activates it.

## Next task: none queued — pick from the held bugs

`gh issue list --label ready-for-agent --state open` → `[]` at the cut. **Verify by query, not by this
note** ([[a-handoff-cannot-predict-a-queue-state-its-own-last-step-changes]]). Open but deliberately
**not** agent-ready: **#207** (blocked on three scoping calls), **#69**, **#163**.

Bugs found but NOT shipped (still held — candidate tickets, strongest first):

- **A TUI-hosted Bridge writes nothing to `bridge.log`** — only `wisp serve` appends
  (`packages/tui/src/serve.ts:24`). Twice now the log that would have shown a failure did not exist; the
  re-bill had to be diagnosed from Claude Code transcripts instead. Best next cut.
- **`wisp routing set` always warns "not signed in" for antigravity** — `hasCredentials` in
  `packages/tui/src/routingCli.ts:21` has no antigravity rung and falls through to the API-key test.
  Trivial.
- **toolChoice not threaded to the Anthropic arm** (`bridgeServer.ts:664` hardcodes `'auto'`). HELD —
  forwarding a forced `tool_choice` would **400 on Fable 5.1/Mythos** (the docs now say so outright);
  needs a model-gated forward.
- **Client `max_tokens` dropped**, replaced by `anthropicModelCaps().maxOutput`
  (`anthropicClient.ts:230`). HELD — a ceiling, not a bill; low value, ~6 edit sites.
- **Advisor turns under-report usage** (last-write-wins across base passes, `bridgeAnthropic.ts:400`).
  HELD — advisor-only, subtle accounting, higher risk.
- **media-only `tool_result` → empty `content`** (`anthropic.ts` ~334). HELD — unverified whether
  Anthropic 400s on it; don't add unconfirmed hot-path guards.
- **Statusline resolver drift** (`wisp-statusline.js:131` missing the provider-id rung + unguarded family
  fuzzy). HELD — a **`wisp-slot`** surface, a separate cut.
- **Wisp drops Claude Code's per-message `output_config.effort` and `clear_at`** on positioned system
  turns (`bridgeAnthropic.ts:177` keeps text only) and never sends the `per-turn-control` /
  `mid-conversation-system-clear-at` betas. Harmless today (effort rides top-level and is constant; the
  ephemeral hint sits behind Wisp's marker only because Claude Code puts it behind its own), but it is
  the gap the capture exposed. **NEW, low priority** — nothing is broken by it yet.
- **Needs a real-session capture:** empty-content-turn 400s, thinking-signature lost on interleave,
  delta-usage zeroing cache fields.

## Also unexplained: the big-body 429s

Unchanged from 2.0.48. A 46,720-byte Antigravity body answered `429 RESOURCE_EXHAUSTED` on both hosts
while a 296-byte body on the same model seconds later answered 200. Reads like a size or token-rate limit.
**"429" on this wire is not proof the account is out of quota** — retry small before concluding it.

## ⚠ Read before cutting a ticket branch

**`git rev-list --left-right --count origin/main...main` — the right-hand number must be 0.**

A branch cut from an unpushed main sweeps those commits into its own squash-merge (`3465c7c`, #202).
The release commits are pushed (`80e21bb`, tag `v2.1.0`, `1b450b0`), but **the `.context/` commit
carrying this note is deliberately left unpushed** — expect `0 1` and push before branching. Full trap:
[[a-branch-cut-from-an-unpushed-main-sweeps-it-into-the-squash]].

## Waiting on the user

- **Start a Bridge when needed** — none is running; it will be 2.1.0.
- **File the held bugs** as tracker tickets when ready — the statusline drift is a `wisp-slot` cut, the
  rest are core/tui.
- **Dismiss the two secret-scanning alerts** as "won't fix" —
  [#1 Client ID](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/1),
  [#2 Client Secret](https://github.com/EstarinAzx/Wisp-Router/security/secret-scanning/2).
- **Bridge access secret rotation** — delete `bridgeSecret` from `~/.wisp/auth.json`, start any host.
- **#170** — needs a **Kimi Code subscription**.
- **#189's last criterion** — note a completing Antigravity Claude-model turn on closed #189 when
  observed.
- **~20 stale local `ticket/*` branches** (`git branch --list 'ticket/*'`). Cleanup, not a blocker.
- **`.context/Untitled.canvas`** — untracked user file, left uncommitted; keep or remove is the user's
  call.
- Optional: the Antigravity **User-Agent pin is stale** — `ANTIGRAVITY_HTTP_USER_AGENT` says
  `antigravity/hub/2.2.1` while the live Hub manifest answers **2.12.0**. Not load-bearing yet.
- Optional one-liner: `ANTHROPIC_MODELS` (`anthropic.ts:122`, the **offline fallback** list) still knows
  only `claude-fable-5`. Unreachable while models.dev answers.
- Optional: `/plugin update wisp-slot` to refresh cached skill/hook copies to 1.7.4.

## Landmines (durable — keep carrying)

Fable cache (new, 2026-09-04):

- **A `#162` stall on a Fable/Mythos model is the backend, not a Wisp cache break** — the line now says so.
  The only evidence that overturns it is **an Opus control from the same session that stalls too**; a
  Fable-only report is not evidence against the door
  ([[2026-09-04-the-fable-cache-rebill-is-the-backend-not-wisp]]).
- **Claude Code 2.1.26x sends no unmarked tail in the `system` array** — its per-turn reminder is a
  trailing `role:"system"` turn with the ephemeral hint block *behind* its own marker, dropped when the
  turn becomes history. `systemSplit.volatile` is empty on real traffic and the #363 trailing-system path
  is not exercised (`uncached_input=2` is that fact). Don't reason about #363 from a Claude Code session.
- **Reasoning from the API docs about caching lost to the numbers twice** — get the transcript miner
  (per-turn read / creation / shortfall) before any hypothesis. Sixty lines, re-create under `out/probe/`.
- **The shortfall exceeds one turn's whole output** — no per-turn size bound is honest; gate on model
  family.

Antigravity errors (new, 2026-09-04):

- **A 4xx now answers as itself** — so a `502 provider request failed` on this arm is a 5xx or transport,
  never a client error. If Claude Code is retrying an Antigravity request ten times, it is not a 400.
- **`antigravityApiError` is the ONE place a verdict attaches** — the 4xx map lives beside the 429
  classifier; the record's `classify` hook and `failProviderRequest` read it off the Error, never the
  message ([[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]]).

Antigravity schema (2026-09-04):

- **A tool schema this wire rejects fails EVERY turn on the Provider, not just calls to that tool** — the
  list rides on every request ([[a-tool-schema-the-wire-rejects-fails-every-turn-not-one-tool]]).
- **The error is an address:** `function_declarations[N]` names the Nth tool **Claude Code sent**, and
  the path after `parameters` is the JSON-Schema node. Usually an MCP server's tool — **capture the
  request body** rather than reasoning about which tools should be there.
- **An `ARRAY` must carry `items`; a typeless node needs nothing.** Re-probe per shape rather than reading
  `content.proto` ([[2026-09-04-the-server-not-the-proto-says-which-schema-fields-are-required]]).
- **`prefixItems` is invisible here** — a 2020-12 tuple arrives as a bare array and 400s.
- **A 429 on this wire is not proof of exhausted quota** — retry small before concluding.

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

- **The volatile system tail must sit BEHIND every message breakpoint, not in the `system` array**
  ([[2026-09-03-the-volatile-tail-must-sit-behind-every-message-breakpoint]]) — still true, still the
  right design; just not what Claude Code 2.1.26x exercises.
- **A trailing `role:"system"` turn 400s on Sonnet & Haiku** — only Opus 5/4.8 + Fable/Mythos 5 accept
  it; gate on `modelSupportsMidConversationSystem`, never send it blind.
- **A turn's bytes must be identical as tail AND as history**, or the prefix cache busts every turn.
- **The 1M-context Claude-5 models have a HIGH minimum cacheable prefix** — verify cache fixes with a
  big-enough prefix.
- **Healthy growth is `read(n+1) = read(n) + creation(n)`, exactly.** On a non-Fable model anything less
  is a real stall, and a STALE line beside it is noise, not an explanation.

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
  running before trusting an empty log.** (Held bug, best next cut.)
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
- **Prove a wire by driving it** — throwaway probes under gitignored `out/`; delete after. A zero-cost
  recording backend (`ANTHROPIC_BASE_URL` at a 30-line node server answering a scripted SSE turn) captures
  Claude Code's exact request shape in under a minute.
- **Usage payloads carry account identifiers under unpredictable keys — redact on the VALUE**
  ([[loadcodeassist-answers-with-the-account-email-inside-it]]).
- **The Anthropic usage endpoint carries a multi-minute 429 penalty** — budget ≤3 reads.

Release:

- **An npm version can never be republished.** The tag is the trigger; no undo.
- **The tag must equal `packages/tui/package.json` exactly** — `release.yml` verifies.
- **`git push --follow-tags` does NOT push a lightweight tag.** Create with `git tag <v> <sha>` and push
  it explicitly; confirm with `git ls-remote --tags`.
- **The registry lags the publish step by about a minute** — a read straight after "✓ Publish to npm"
  can still say the old version. Re-read; don't conclude the publish failed. Platform packages publish
  per the job log yet `npm view` 404s them — the shim's release-download fallback is the normal path.
- **A fix release is not verified until the OLD version FAILS the same check**
  ([[verifying-a-fix-release-needs-the-previous-version-as-a-control]]).
- **A vsix is evidence only when checked in the BUNDLE**; **verify npm past the registry read** (scratch
  install, execute the bins).
- **Best evidence is a SWAP** — a cut that removes nothing previously shipped cannot produce one; say so
  ([[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]).
- **Every release entry carries `### Surfaces`, derived from `git log <last-tag>..main -- <face-path>`**
  ([[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]).
- **Labels are the only real gate**; a closed-by-PR issue keeps its `ready-for-agent` label.
- **PowerShell splits a `git commit -m` here-string on embedded double quotes** — the message becomes
  pathspecs, the commit fails, and the NEXT `-m` commit sweeps everything staged. Write the message to a
  gitignored file and `-F` it; check `git show --stat` per commit before pushing.

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
  gate is **`bun run test`** (vitest, now 1047) — bare `bun test` runs Bun's runner, bogus failures.
  `packages/tui/tests/` is the **bun runner** (28), run explicitly. No root `typecheck` script.
- Prefer the scoped **`packages/tui:verify`** skill for tui/core CLI-surface work.
- A store that does not parse is never overwritten (#182, ADR-0004); `status.json` and `bridge.log` are
  the documented exceptions.
- The `wisp-slot` version lives in TWO files — 1.7.4 in both.
- `.context/` commits go to main, never a ticket branch.
- No PR CI — only `release.yml` on tag `v*`; the local gate *is* the gate.
- **`Start-Sleep` is blocked in this harness** — re-read a tool call later instead.

Reference clones (both outside the repo, re-clonable): `D:\scratch\CLIProxyAPI` (shallow, `c9417c8`,
2026-07-28 — its `gemini_schema.go` has the itemless-array gap) and `D:\scratch\traycer` (shallow,
2026-08-14).

## Related

- [[active-work]]
- [[overview]]
- [[decisions]]
- [[gotchas]]
- [[flows]]
- [[2026-09-04-the-fable-cache-rebill-is-the-backend-classify-dont-chase]]
- [[2026-09-04-the-fable-cache-rebill-is-the-backend-not-wisp]]
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
- [[2026-07-30-a-classified-verdict-rides-on-the-error-not-its-message]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
- [[the-anthropic-door-does-not-use-the-executor-records]]
