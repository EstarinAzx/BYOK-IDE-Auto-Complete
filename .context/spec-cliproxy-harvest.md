# Spec — CLIProxyAPI harvest: provider usage, Codex error classification, transient retry, ProviderExecutor record, Kimi

## Problem Statement

A user runs Claude Code through the Bridge with a family route bound to a Codex Target. Three things go wrong, and they compound:

1. **The context meter reads zero.** Every turn served by a non-Anthropic Provider reports no token usage at all. Confirmed against real transcripts: a Bridge session served by the Anthropic Provider records `input_tokens: 2, cache_creation_input_tokens: 65366, cache_read_input_tokens: 51864`, while a Bridge session with real assistant content and `stop_reason: tool_use` records `input_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0`. The user cannot see what a turn cost, and Claude Code cannot size the conversation it is holding.

2. **The conversation then overflows and the user gets a wall of 502s.** Claude Code decides when to auto-compact from the token usage the last response reported. Told every Codex turn costs nothing, it never compacts, the history grows unbounded, and eventually the Codex backend rejects the request on its own context window. Wisp relays that rejection as `502 provider request failed`. All fifteen recorded occurrences sit above 56k, clustered 217k–245k — the shape of a conversation growing unchecked, not of a flaky backend.

3. **The 502 is the wrong instruction.** A 502 tells Claude Code "the server broke, try again", so it retries a request that cannot succeed. The real conditions behind it — the context window was exceeded, a thinking signature was rejected, a previous response id went missing, the credential expired — are all distinguishable from the error body, and three of the four are things the client could act on if it were told.

Today the only remedy is operational: `/compact` before Codex turns, keep images off big conversations, or run Codex work in a fresh Slot. That is discipline standing in for a missing feature.

Separately, the user wants to add Kimi and Antigravity Providers, and the Bridge's per-Provider request handlers are copy-pasted — three near-identical bodies with five duplicated 502 sites between them. Adding two more Providers means two more copies.

## Solution

Harvest the parts of CLIProxyAPI that solve these, adapted to Wisp's much smaller surface.

**Every Provider reports what its turn cost.** The Codex and Grok clients read the token usage the Responses API already sends on its terminal event and emit it on the Bridge's existing usage channel; the API-key path asks for usage on its stream and does the same. The Anthropic door already knows how to fold that into the frames Claude Code reads, so the context meter starts working for every Provider rather than one.

**A failed Codex turn says what actually failed.** The error body is classified into four known conditions and answered with the matching HTTP status — an exceeded context window comes back as a 400 telling Claude Code to compact, an expired credential as a 401, and only genuinely unknown failures stay 502.

**A transient failure is retried instead of surfaced.** A stream that dies before completion, or an upstream 500/502/503/504, gets a bounded retry rather than an immediate error; a Provider that keeps failing goes on a short cooldown so family-matched requests fall back to a healthy Target. Waits are jittered so concurrent requests do not stampede the first Provider to recover.

**Adding a Provider stops meaning adding a handler.** The three per-Provider Bridge handlers collapse into one, driven by a small record per Provider. Kimi lands as one more record.

## User Stories

1. As a Claude Code user on a Codex-bound family route, I want each turn to report its real token usage, so that the context meter reflects the conversation I actually have.
2. As a Claude Code user, I want the input tokens reported to exclude the cached portion, so that the number matches what the Provider is billing me for.
3. As a Claude Code user, I want cached input tokens reported separately, so that I can see prompt caching working rather than infer it.
4. As a Claude Code user, I want reasoning tokens counted inside the output total, so that a high-effort turn does not appear artificially cheap.
5. As a Claude Code user on a Codex Target, I want auto-compaction to trigger at the right point, so that my conversation never silently grows past the window.
6. As a Claude Code user, I want a turn that exceeds the context window to come back as a client error naming that cause, so that the client compacts instead of retrying.
7. As a Claude Code user, I want an expired or revoked credential to come back as an authentication error, so that I am told to sign in again rather than shown a generic gateway failure.
8. As a Claude Code user, I want a rejected thinking signature to be named as such, so that the failure is diagnosable rather than mysterious.
9. As a Claude Code user, I want a missing previous response id to be named as such, so that I know the turn can be retried fresh.
10. As a Claude Code user, I want genuinely unknown upstream failures to stay a gateway error, so that the new classification never hides a real outage behind a wrong status.
11. As a Wisp operator, I want the Bridge log to name the classified condition, so that I can tell the four cases apart without reading raw bodies.
12. As a Claude Code user, I want a stream that dies before completing to be retried once rather than surfaced, so that a dropped socket on a long reasoning turn does not cost me the turn.
13. As a Claude Code user, I want the retry to be bounded, so that a persistently failing Provider fails fast instead of hanging.
14. As a Claude Code user, I want a Provider that returns repeated transient errors to be cooled down briefly, so that family-matched requests fall back to a healthy Target.
15. As a Claude Code user, I want a transient cooldown to be short, so that a Provider that recovers is used again quickly.
16. As a Claude Code user, I want a transient cooldown never to be confused with a usage-limit cooldown, so that a brief blip does not sideline a Provider for days.
17. As a Wisp operator, I want cooldown waits jittered, so that concurrent requests do not all wake and hit the first recovered Provider at once.
18. As a Wisp operator, I want a Provider capacity rejection treated as its own condition, so that "model is at capacity" does not start a multi-day cooldown meant for exhausted quota.
19. As a Wisp operator, I want the reset horizon read from the absolute reset timestamp when the Provider sends one, so that the cooldown ends when the window actually resets.
20. As a Wisp operator, I want the relative reset seconds used as a fallback, so that a Provider sending only that form is still handled.
21. As a Wisp maintainer, I want one Bridge request handler instead of three, so that a fix to error handling lands once rather than three times.
22. As a Wisp maintainer, I want each Provider described by a small record, so that its stream and its error classification sit together.
23. As a Wisp maintainer, I want adding a Provider to mean adding a record, so that new Providers cost roughly what a catalog entry costs.
24. As a Wisp maintainer, I want the refactor to leave Bridge behaviour unchanged, so that the existing test suite is the proof it worked.
25. As a Kimi Code subscriber, I want to sign in to Kimi from Wisp, so that I can use my subscription instead of buying separate API credit.
26. As a Kimi Code subscriber, I want the sign-in to use the device flow, so that I authorize in a browser by code without Wisp running a callback listener.
27. As a Kimi Code subscriber, I want to see the pending user code and verification URL, so that I know where to go and what to type.
28. As a Kimi Code subscriber, I want my token refreshed before it expires, so that a long session does not break mid-turn.
29. As a Kimi Code subscriber, I want my credentials stored in the Wisp home auth file with owner-only permissions, so that they are handled like every other Provider's.
30. As a Kimi Code subscriber, I want Kimi models selectable as a Target in the Routing map, so that I can bind a family route to Kimi.
31. As a Kimi Code subscriber, I want Kimi to appear in the native chat picker, so that I can use it without the Bridge.
32. As a Kimi Code subscriber, I want Kimi turns to report usage like every other Provider, so that the context meter works there too.
33. As a Kimi Code subscriber, I want to sign out of Kimi, so that I can revoke Wisp's access.
34. As a Wisp user, I want none of this to change how the Anthropic Provider behaves, so that my working setup is not disturbed.
35. As a Wisp user, I want cache-health advisories to keep working, so that the existing diagnosis channel is not broken by the usage changes.
36. As a Wisp user, I want the reviewer sub-call usage channel to stay separate from base usage, so that the context window maths stays correct.

## Implementation Decisions

**Usage rides the existing Bridge stream event union.** The union already carries a usage member and the Anthropic door's encoder already folds it into the frames Claude Code reads. Nothing new is added to the union — the Codex, Grok and API-key streams simply start emitting the member that the Anthropic client already emits. This matters because the door encoder's fallthrough invents a bogus tool-use block for events it does not recognise, so reusing the existing member avoids that trap entirely.

**Usage is normalized to the Anthropic shape at the client, not the door.** The Bridge's usage type is Anthropic-shaped: uncached input, cache-write input, cache-read input, output. The Responses API reports the opposite convention — cached tokens are a *subset* of the input total, and reasoning tokens a *subset* of the output total. So each client converts on the way out: cache-read takes the cached-tokens detail, uncached input is the input total minus that, cache-write is zero (the Responses protocol has no cache-write concept), and output passes through with reasoning already included. CLIProxyAPI draws the same distinction explicitly, normalizing subset-style protocols into a non-overlapping breakdown before accounting; the conversion direction here is taken from that.

**The API-key path must opt in to usage.** Chat-completions streams omit usage unless the request asks for it, so that path sets the stream option that adds a final usage chunk and maps prompt/completion tokens plus the cached-tokens detail into the same shape.

**Codex error classification is a pure function in the Codex module.** It takes the HTTP status and the raw body and returns a status, a stable code, an error type and a message. Four conditions are recognised — context too large, invalid thinking signature, previous response not found, and auth unavailable — matched on upstream error code, error type and message substrings, because the Codex backend expresses the same condition several ways. Anything unmatched returns nothing and the caller keeps its current behaviour. This mirrors the existing pure usage-limit parser in the Routing map module, and lives in the pure layer so it is unit-testable without a socket.

**Classification maps to real HTTP statuses at the Bridge.** Context too large and invalid signature become client errors; auth unavailable becomes an authentication error; unrecognised failures stay a gateway error. The Bridge logs the classified code so the four cases are distinguishable in operation.

**Transient handling extends the existing cooldown store rather than adding one.** The store already tracks per-Provider usage-limit cooldowns and already drives family-route fallback. It gains a second, deliberately short channel for transient upstream failures, kept distinct from the usage-limit channel so a brief blip can never trigger a multi-day sideline. Capacity rejections are recognised as their own condition and treated as transient rather than as exhausted quota.

**Retry is bounded and applies only to request-scoped failures.** A stream that ends before its terminal frame with nothing delivered is retryable; one that delivered partial content is not, and keeps its existing behaviour of surfacing what arrived with an end-of-stream marker. Classified client errors are never retried. CLIProxyAPI models exactly this distinction as a request-scoped error flag, so that a dropped stream retries the request without penalising the credential.

**Cooldown waits are jittered.** A small random fraction of the wait, capped, is added so concurrent waiters do not wake in lockstep. Taken directly from CLIProxyAPI.

**The ProviderExecutor seam is a plain record, deliberately minimal.** One record per Provider carrying its identifier, its stream function returning the Bridge's stream events, and its error classifier. The three near-identical Bridge chat handlers collapse into one driven by that record. Explicitly rejected: a class hierarchy, changes to the Provider kind union, changes to the Provider catalog, and CLIProxyAPI's fuller registry-plus-translator-matrix architecture — that shape earns its keep across many dialects, and Wisp has two.

**Kimi is a new Provider kind using the device authorization flow.** Simpler than the OAuth Providers already shipped: no loopback redirect catcher and no PKCE, because the user authorizes out of band with a code. The flow requests a device code, polls the token endpoint at the interval the server specifies until authorized or the window closes, and stores the resulting bundle. Tokens refresh ahead of expiry on the same schedule as the other Providers. Credentials live in the Wisp home auth file with owner-only permissions, per the standing decision that no key or token goes in editor settings. On the wire Kimi is OpenAI-compatible, so it reuses the API-key request path rather than getting a bespoke client.

**Ordering is fixed and each step is independently shippable.** Usage first, because it is small, it is the suspected root cause of the 502s, and it is owed regardless. Classification second. Transient retry and cooldown third. The record refactor fourth — after usage and classification, so its shape is known rather than guessed. Kimi last, landing on the record.

## Testing Decisions

A good test here exercises externally observable behaviour: given this wire input, the Bridge emits these frames, or given this error body, this classification comes out. It does not assert on internal call order, private helpers, or the shape of intermediate objects. The pure core is where nearly all of this belongs — it is vendor-free and needs no socket, which is why the existing suite runs without an editor host.

**Modules under test.** The Codex module gains classification and usage-mapping tests. The Routing map module gains transient-cooldown and jitter tests. The Anthropic door module gains tests that a usage event from a non-Anthropic Provider reaches the closing frames correctly. The Bridge server module gains tests that a classified error produces the right status.

**Prior art.** The existing Codex tests cover pure request-shaping and event reduction; the Routing map tests already cover the usage-limit cooldown store, including its parse-and-horizon behaviour, and the new transient channel should be tested the same way. The Anthropic door tests already assert on emitted frame sequences, which is the right altitude for the usage assertions. Fake clocks are already used for cooldown tests — jitter should be tested by injecting the random source rather than by sampling.

**Specific cases worth naming.** Usage mapping must be tested where cached tokens equal the whole input (uncached must not go negative). Classification must be tested for each of the four conditions in each wire form the backend uses, and for a body matching none of them. The transient channel must be tested for the case that would be worst in production: a transient failure must not extend a usage-limit cooldown, and a usage-limit failure must not be shortened to a transient one.

**The record refactor is proved by the existing suite.** It is a pure restructuring with no behaviour change, so the bar is that the current tests pass untouched. Any test that needs editing to accommodate it is a signal the refactor changed behaviour.

## Out of Scope

- **Antigravity.** Wanted, but its own spec — the reference implementation carries a reasoning-replay cache, signature handling, schema sanitization, a version probe and a large credits subsystem with a four-way rejection taxonomy. Folding it in here would swamp everything else.
- **Local token counting.** The Bridge deliberately 404s the count-tokens endpoint today. Once usage flows, Claude Code sizes context from response usage and the endpoint may not be needed; building it means taking on a tokenizer dependency to solve a problem the first item may erase. Revisit after usage ships and only if something still reads it.
- **Bridge-side pre-trim.** Fitting an oversized conversation to the window before sending. Lossy, needs a drop policy, and if the diagnosis here is right the conversation should never reach that size. Stays a floating plan.
- **The multi-credential model.** CLIProxyAPI round-robins many accounts per Provider with per-credential cooldown and failover. Wisp has one credential per Provider; the cooldown work here stays at Provider granularity.
- **Codex over WebSockets.** The reference implementation has a substantial WebSocket transport for Codex. No evidence Wisp needs it.
- **Usage display surfaces.** This spec makes usage *correct on the wire*. Any panel, status bar or TUI rendering of accumulated usage is separate.
- **Changing which model name the door echoes.** A known open question, deliberately untouched — Claude Code may validate that the name it sent comes back.

## Further Notes

The reference implementation is cloned at `D:\scratch\CLIProxyAPI` (Go, v7). It is a much larger product — many credentials per Provider, five dialects, a plugin host, a management API — so most of it is not applicable. The parts worth reading are its Codex terminal-error module (classification, retry-after parsing, the request-scoped error idea), its usage accounting package (the subset-versus-independent token semantics), and its cooldown module (the transient-status branch and the jitter helper).

The diagnosis chain behind item 1 is worth preserving: only the Anthropic client emits usage; the door falls back to zeros when no usage arrived; transcripts confirm both the healthy Anthropic case and the all-zero non-Anthropic case. The final inferential step — that zeros are why auto-compaction never fires — has not been observed directly. The cheapest confirmation is to ship usage and watch whether the 502 cluster disappears; if it does not, the tighter-OAuth-cap hypothesis is still live and the next 502's exact error text remains the thing to capture.

The existing gotcha note calling the 502 "the provider's limit, not a bridge bug" stays true as far as it goes — the Bridge does relay verbatim. What it missed is that the Bridge is also why the conversation got big enough to be rejected.
