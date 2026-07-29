---
type: gotchas-index
project: wisp
updated: 2026-07-29
tags: [context, gotchas]
---

# Gotchas

Non-obvious traps. One file per trap in `gotchas/`. A flat list.

- [[status-json-is-global-so-it-cannot-observe-another-session]] — `~/.wisp/status.json` is **one file per machine**, rewritten after every bridged turn on the Anthropic door. If *you* are running bridged, your own tool call overwrites it, so reading it to inspect **another** session returns your own snapshot, one second old and entirely plausible-looking. Cost a step while verifying #165. The statusline's model-match guard hides cross-family clobbering from the badge but does **not** stop the write. To verify a session actually reported usage, read the per-session **Claude Code transcript** instead — folding rows by `message.id`
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]] — a UTF-8 BOM at the start of `~/.wisp/config.json` makes Wisp discard the **entire** config (provider, models, effort, the whole Routing map) with **exit 0 and no stderr**: `JSON.parse` throws, `parseObject` swallows it, `parseWispConfig` returns `{}` *above* every field guard. Bites agents because PowerShell 5.1's `Out-File -Encoding utf8` writes a BOM **by default**, so a sandbox `WISP_HOME` seeded from PowerShell reads as empty and looks exactly like a broken feature — it cost a verification pass during the 2.0.38 cut. Check `head -c 3 config.json | xxd` for `efbbbf` before suspecting code. Filed **#181**, pre-existing
- [[harvest-tickets-carry-body-text-blockers-not-native-links]] — the harvest tickets' `## Blocked by` is **prose in the issue body**; the native GitHub dependency links are not set, so GraphQL `blockedBy` returns an **empty list even for a genuinely blocked ticket** (#173 reported empty while three of its four blockers were open). An unattended leg that trusts it will start a ticket whose dependencies have not shipped. Read the body section and cross-check the queue table in [[active-work]]; empty `blockedBy` is *no information*, not *no blockers*
- [[readablestream-error-discards-the-queued-chunks]] — `controller.error()` **empties the queue**, so enqueue-then-error in one tick does NOT model a partial delivery: the reader sees only the error, and a test meant to prove "already delivered ⇒ never retried" silently tests the opposite case. Drive it from `pull()` instead. Tell: `expected 502 to be 200` on a partial-stream test
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]] — provider streams are async generators, so calling one does NO IO: the doors wrote `writeHead(200)` before the request had fired, making every pre-stream failure a **200 with an empty body** and the 502 branch dead code. `primeStream` (#166) pulls the first event ahead of the head. Tell in a test: `expected 200 to be 502`. **Fixed everywhere by #167** (priming is uniform across all four records) — and that uniformity is what made #168's retry boundary expressible
- [[cc-transcript-rows-are-blocks-not-messages]] — a transcript row is one content BLOCK, not one message: `message.id` / `stop_reason` / `usage` repeat on every row of the same message. Fold by `message.id` first or the file lies three ways — every message looks single-block, `usage` sums N×, and a text-only row appears to violate its own `stop_reason`. Produced a whole false bug report on 2026-07-25
- [[claude-code-can-refuse-a-turn-before-the-bridge-ever-sees-it]] — `Context limit reached` in a bridged session can be a LOCAL Claude Code block that never hit the wire; prove it from CC's own transcript (`~/.claude/projects/<slug>/*.jsonl`) — a ms-scale gap between tool_result and the `<synthetic>` error means no round trip. 2.1.220 also inflates the `/context` Messages row past its own honest headline
- [[advisor-toggle-forks-the-cache-prefix-two-variants]] — advisor mode forks the cached prefix into two variants: Claude Code's auxiliary fork queries (auto-memory extraction, compact, …) replay the conversation WITHOUT the advisor tool (class-gated injection); first fork re-writes ~whole prefix uncached, then each variant re-bills the other's history deltas. Not a user toggle, not a wisp bug. Tickets #158/#159/#160 (all resolved)
- [[buildanthropicmessagesbody-must-not-mutate-caller-rawcontent]] — `buildAnthropicMessagesBody` must replay a *copy* of `rawContent` (strip any inbound `cache_control`); mutating the caller's array lets multi-build flows (advisor base→reviewer→continuation) stack markers past Anthropic's cap of 4 → "Found 5". Regression in `anthropic.test.ts`
- [[anthropic-cache-ttl-flip-busts-the-prefix-mid-session]] — deriving the Anthropic cache TTL from `convo.length` flips 5m→1h between turn 1 and turn 2 of the same session; a TTL change rewrites `cache_control` and busts the server-side prefix cache (2× re-bill on turn 2 of every session). Fix TTL per call path, never from turn count
- [[codex-502-input-exceeds-context-window-is-the-providers-limit-not-the-bridge]] — codex `502 … input exceeds the context window` is a passthrough of the codex window (400K gpt-5.x / 200K o-series), not a bridge bug; bridge forwards untrimmed, `/compact` before codex turns
- [[live-verify-the-bridge-from-source-isolated-wisp-home-on-a-spare-port]] — test bridge changes with `WISP_HOME=<tmp>` + `serve` on a spare port (41185), never kill 41184; `x-api-key` = top-level `bridgeSecret` in auth.json, not `.anthropic.bridgeSecret`
- [[select-mouse-leans-on-opentui-privates]] — SELECT_MOUSE (scrollbar drag/wheel/row click) reads opentui privates, pinned 0.4.3; new selects must spread it, upgrades must re-run `bun test` in packages/tui
- [[slot-skill-has-two-copies-personal-vs-plugin]] — Slot skill is plugin-only now (personal copy retired 2026-07-17); repo edits to `plugins/slot/**` need `claude plugin update wisp-slot` (versioned cache) — except the statusline badge, which the wrapper runs from the checkout
- [[accidental-tui-open-rewrites-all-family-routes]] — An agent's accidental `wisp` TUI open can silently rewrite ALL family routes (quick-setup); snapshots taken after preserve the damage
- [[powershell-profile-env-masks-session-env]] — PowerShell profile sets ANTHROPIC_BASE_URL, so PowerShell env checks claim every session is bridged; use Bash to read real process env
- [[bridged-family-routes-bound-to-anthropic-burn-max-quota]] — Family routes bound to `anthropic` bill the Claude Max plan — background haiku chores burn it even in "GPT sessions"; rebind haiku off `anthropic` first
- [[claude-code-advisor-is-endpoint-gated-past-the-bridge]] — **RESOLVED, shipped 2.0.21:** Advisor works through Wisp (door plays the server-tool role); never was endpoint-gated (a wisp session is `firstParty`). One live prereq: `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL=1` (launcher sets it) or a claude-wisp-* base model reports "advisor tool not there" → [[2026-07-19-wisp-native-advisor-via-door-server-tool]]
- [[opentui-rows-garble-on-small-terminals-without-wrapmode-none-and]] — opentui: rows garble on small terminals without `wrapMode="none"` (wrap overlay) + `flexShrink={0}` (yoga row-shrink)
- [[ts7-drops-types-auto-include-when-types-unset]] — TS 7 drops `@types/*` auto-include when `types` is unset (node/DOM globals vanish; set `types:["node"]`)
- [[opentui-selects-are-invisible-without-an-explicit-height-and-bare]] — opentui: selects are invisible without an explicit height, and bare exit strands the terminal
- [[no-fill-in-middle-fim-on-the-zen-endpoint]] — No fill-in-middle (FIM) on the Zen endpoint
- [[webview-csp-tailwind-v4]] — Webview CSP × Tailwind v4
- [[two-typescript-configs-must-stay-separate]] — Two TypeScript configs must stay separate
- [[vite-asset-names-must-be-deterministic]] — Vite asset names must be deterministic
- [[config-writes-must-target-the-defining-scope-not-always-global]] — Config writes must target the defining scope, not always Global
- [[server-error-bodies-can-leak-the-key-sanitize-before-posting-to-the]] — Server error bodies can leak the key — sanitize before posting to the webview
- [[key-is-write-only-across-the-webview-boundary]] — Key is write-only across the webview boundary
- [[model-ids-are-bare-on-zen-go-v1-the-opencode-prefix-is-rejected]] — Model ids are BARE on `zen/go/v1` — the `opencode/` prefix is rejected
- [[a-shared-credential-provider-must-set-keyid-or-its-hidden-from-the]] — A shared-credential Provider must set `keyId` or it's hidden from the chat picker
- [[served-models-are-reasoning-models-strip-think-and-dont-cap-tokens]] — Served models are reasoning models — strip `<think>` and DON'T cap tokens
- [[output-channel-logs-persist-on-disk-read-them-to-debug-a-users-error]] — Output-channel logs persist on disk — read them to debug a user's error
- [[packaging-ships-node-modules-bundling-is-optional-size-only]] — Packaging ships node_modules — bundling is optional (size only)
- [[ollama-cloud-base-url-is-v1-not-api-v1]] — Ollama Cloud base URL is `/v1`, NOT `/api/v1`
- [[the-provider-selector-is-a-key-redirect-vector-keep-it-out-of]] — The Provider selector is a key-redirect vector — keep it out of workspace reach
- [[vs-code-wisp-settings-are-dead-knobs-except-maxtokens-temperature]] — VS Code `wisp.*` settings are dead knobs (except maxTokens/temperature)
- [[cline-tos-and-why-copilot-cursor-were-dropped]] — Cline ToS, and why Copilot/Cursor were dropped
- [[unit-testable-logic-must-live-vscode-free-in-catalog-ts-not-in]] — Unit-testable logic must live vscode-free in `catalog.ts`, not in `extension.ts`
- [[dont-make-the-inquire-edit-span-the-whole-file-the-model-mangles]] — Don't make the Inquire edit span the whole file — the model mangles untouched code
- [[edit-blocks-are-flaky-with-reasoning-models-the-failure-is-safe-and]] — Edit blocks are flaky with reasoning models — the failure is SAFE, and retry usually works
- [[codex-bearer-is-the-access-token-not-the-exchanged-api-key]] — Codex: bearer is the access_token, NOT the exchanged API key
- [[codex-reasoning-models-require-a-reasoning-object-and-gpt-5-codex-is]] — Codex reasoning models REQUIRE a `reasoning` object — and `gpt-5-codex` is a dead id
- [[codex-sign-out-must-write-a-tombstone-not-delete-the-slot]] — Codex sign-out must write a tombstone, not delete the slot
- [[the-chat-ctrl-i-picker-hard-filters-on-toolcalling-a-text-only-model]] — The chat/Ctrl+I picker hard-filters on `toolCalling` — a text-only model is INVISIBLE
- [[codex-responses-requires-a-non-empty-instructions-default-it-for]] — Codex `/responses` requires a non-empty `instructions` — default it for native chat
- [[codex-responses-input-assistant-content-is-output-text-user-system-is]] — Codex Responses input: assistant content is `output_text`, user/system is `input_text`
- [[codex-caps-come-from-codexmodelcaps-not-models-dev-and-it-is-vision]] — Codex caps come from `codexModelCaps`, not models.dev — and it IS vision-capable
- [[codex-tools-must-be-strict-and-a-replayed-function-call-needs-only]] — Codex tools must be STRICT, and a replayed `function_call` needs only `call_id` (not `id`)
- [[two-wisp-extensions-at-once-already-registered-warnings-a-stale-panel]] — Two Wisp extensions at once → "already registered" warnings + a stale panel (F5 vs installed VSIX)
- [[anthropic-oauth-a-valid-token-still-429s-without-the-claude-code]] — Anthropic OAuth: a valid token still 429s without the Claude Code client fingerprint
- [[seteffort-and-any-globalstate-write-fires-no-config-event-re-push-the]] — `setEffort` (and any globalState write) fires no config event — re-push the panel yourself
- [[effort-levels-are-not-one-ladder-xhigh-and-max-are-independent-per]] — Effort levels are NOT one ladder — `xhigh` and `max` are independent per-model capabilities
- [[testing-the-bridge-from-powershell-curl-exe-mangles-inline-json-use]] — Testing the Bridge from PowerShell: `curl.exe` mangles inline JSON — use `Invoke-RestMethod`
- [[bridge-copilot-env-vars-reach-only-terminals-opened-after-start-38]] — Bridge `COPILOT_*` env vars reach only terminals opened AFTER Start (#38)
- [[the-standalone-gui-copilot-app-does-not-route-through-the-bridge-b]] — The standalone GUI Copilot app does NOT route through the Bridge (#b)
- [[copilot-cli-label-is-a-launch-snapshot-running-terminals-follow-the]] — Copilot CLI label is a launch snapshot; running terminals follow the ACTIVE Provider (#b)
- [[ctrl-r-in-the-extension-dev-host-runs-the-stale-build-recompile-first]] — `Ctrl+R` in the Extension Dev Host runs the STALE build — recompile first (#46)
- [[the-bridge-anthropic-door-forwards-codex-tools-non-strict-external]] — The Bridge Anthropic door forwards Codex tools non-strict — external schemas can't be strict-coerced (#46)
- [[model-cant-see-the-image-over-the-bridge-read-images-n-in-the-log]] — "Model can't see the image" over the Bridge — read `images=N` in the log BEFORE touching code (#51+)
- [[npm-spam-filter-a-green-publish-can-vanish-minutes-later]] — npm spam filter: a green publish can vanish minutes later
- [[github-runners-macos-13-is-a-zombie-label-opentui-selects-is]] — GitHub runners: macos-13 is a zombie label; opentui select's ▶ is ambiguous-width
- [[both-oauth-providers-ship-quota-headers-codex-rejects-gpt-5-3-codex]] — Both OAuth Providers ship quota headers (units differ) — and the Codex OAuth path rejects `gpt-5.3-codex` (#171)
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]] — Widening a client stream-event union breaks `else` narrowing at 6 sites — `tsc` catches it, Vitest does not (#165)
- [[a-shared-bearer-rule-or-the-oauth-row-401s-on-half-the-paths]] — The TUI had THREE copies of "resolve this Provider's key"; an OAuth-credentialed row 401s on the ones you miss (#170)

## Related

- [[overview]]
