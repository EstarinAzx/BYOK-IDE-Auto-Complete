---
type: decision
project: wisp
updated: 2026-07-29
tags: [context, decisions]
---

# Antigravity is a narrow port, and it never mints opaque tool ids

## Decision

Port Antigravity from `router-for-me/CLIProxyAPI` into Wisp as a **sixth Provider kind** at roughly
1,200–1,500 TS lines against the reference's **5,643 non-test Go lines**. Spec [#185], tickets #186–#192.

Eight calls, each closing a path:

- **First-party narrow port. Rejected: wrapping a locally-run CLIProxyAPI** as a plain `openai-chat` row
  pointed at localhost. That costs near-zero wire code — it would fall through `keyedExecutor` exactly like
  Kimi — but it makes the user install and run a Go binary, which contradicts the self-contained three-face
  delivery story.
- **Both Bridge doors. VS Code picker deferred.** The Anthropic door is what `claude-wisp` drives, so an
  OpenAI-door-only slice would ship a Provider the user's own workflow cannot reach.
- **All 13 models**, keeping every model-family fork. The image row is **listed but refused** in `open()` —
  `BridgeStreamEvent` is text-only, so there is no image-output channel on either door.
- **Mirror the reference's headers, pin the client version as a constant.** Rejected: porting the 3-hourly
  poll of Google's Electron auto-updater manifest — a hardcoded version is a mode the reference already
  treats as correct, and a background timer with an outbound dependency does not belong in a process meant to
  be a listener with no daemon.
- **429: port the classifier's parsing, none of its state.** Below the instant-retry threshold decline to
  classify (existing bounded retry handles it); at or above, or on explicit quota exhaustion, return a
  classified error carrying status **429** and seed a cooldown from the server's own horizon. This makes
  Antigravity the first record to answer a rate limit honestly — every record today returns `undefined`, so
  every rate limit leaves as a 502.
- **Auth follows the four-manager house convention and ADDS PKCE S256** the reference lacks. With a public
  client secret, PKCE is the only real protection for the loopback code.
- **Auth spike is ticket one, and it is `ready-for-human`.** Nothing else starts until a real token, a real
  project id, and one 200 come back.
- **Out: the credits/quota subsystem (795) and reasoning-replay (1,980).**

## The binding rule

**The port never mints opaque provider-side tool ids. The upstream's own `functionCall.id` passes through
untouched.**

This is not a style preference — it is the single condition under which omitting reasoning-replay is safe.
Roughly two-thirds of that 1,980-line subsystem exists to service ids that are **content-hash lookup keys
into a replay ledger**, not real identifiers. Mint them without building the ledger and every one is a
dangling pointer into state that was never kept.

A future change that "improves" id handling by generating stable synthetic ids breaks the spec's foundation
silently — nothing fails at compile time, and the damage shows up as mangled tool history several turns later.

## Why

#174 sat ungroomed for weeks because nobody had established which of the reference's 5,643 lines are
load-bearing. The grill found its framing wrong in three places:

- **Credits is not the deciding question** #174 claimed. It is default-off multi-credential pool machinery —
  its own config comment describes it as a last-resort fallback across exhausted credentials. Wisp has no
  multi-credential notion anywhere: the auth store, the deps seam, and cooldown keying are all singular. Worse,
  porting its cooldown ledger with one credential is **actively harmful** — the reference consults the ledger
  *before sending*, so a single benched credential synthesises a 429 against itself.
- **Reasoning-replay is the big lump** — 1,980 lines against credits' 795 — and it is optional, proven by the
  reference itself, which gates it off entirely for Claude models on the same Provider.
- **Gate 1 was already cleared.** #167 shipped, so the ProviderExecutor record exists. But the record is
  thinner than "just add a record" suggests: it is four fields inside a closure, not an exported plugin seam.
  Antigravity is a **third wire** — Gemini `generateContent` inside a bespoke Cloud Code envelope — so it also
  needs a third stream mapper, a fourth tool builder, a `BridgeDeps` widening, and its own branch in the
  Anthropic door's chain, which deliberately refuses the record.

**Ordering is the other half of the decision.** #170 shipped complete, correct, and blocked on a missing
subscription. Antigravity has the same shape plus two extra unknowns the reference cannot answer — whether
PKCE works against this client id, and whether a pinned client version is accepted. All three are cheapest to
learn before there is code to throw away.

## Accepted regression

Across turns where a client mutates history, the model **re-reasons instead of resuming its thought chain**,
because an unsigned leading function call falls back to Google's documented synthetic-history bypass sentinel.
Extra latency and tokens; not an error, not a broken conversation. Well-behaved clients already round-trip
signatures in band, so this only bites when the client actually drops or edits blocks.

## Four pieces port regardless

Single-turn correctness, currently entangled with replay in the reference and must be hoisted out:
request signature sanitization · function-call pairing validation · repair of an unsigned leading function
call · normalization of parallel function-response ordering and role.

## Reversibility

**Easy per ticket, harder as a whole.** Every ticket is independently revertable and nothing changes a stored
schema shared with another Provider — except #190, which widens the cooldown trigger in `routing.ts`, a file
every Provider shares. That one must preserve the two-channel separation
([[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]]).

The two omitted subsystems are recorded, not discarded: both have a paragraph in #185 saying what would revive
them, and reasoning-replay's revival order is written down (ledger core first, SSE accumulator second, fuzzy
re-anchoring last and only on observed drift).

## Related

- [[decisions]]
- [[active-work]]
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]] — the spec that scoped Antigravity out, and why
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]] — the separation #190 must not collapse
- [[2026-07-29-codex-failures-classified-unmatched-stays-502]] — the classify hook Antigravity becomes the second user of
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]] — why the Anthropic door needs its own branch
- [[widening-a-client-stream-event-union-breaks-else-narrowing-vitest]] — the hazard if anyone tries to add an image event
