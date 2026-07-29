---
type: decision
project: wisp
updated: 2026-07-29
tags: [context, decision]
---

# An OAuth-credentialed Provider that talks the KEYED wire resolves its bearer at the `keyFor` seam — SHIPPED `d656686` (#170)

**Decision.** Kimi is the first Provider that **signs in with OAuth but talks the ordinary OpenAI-chat
wire**. It lands as a catalog row with `kind: 'kimi-oauth'` used **only as a UI marker**, and its OAuth
access token is resolved as the request **bearer** inside each face's `keyFor`. No new executor, no new
client module, no new branch in any request path.

## The question the ticket actually posed

`.context/pick-up.md` framed it right: *does the keyed record cover a Provider whose credential is an OAuth
token rather than an API key?* The answer is **no, not unchanged** — `clientFor` builds its client from
`keyFor`, which reads `auth.json`'s `keys` map, and a token is not in that map. A signed-in Kimi would have
been answered `400 provider 'kimi' has no API key configured`.

But the gap is **one seam wide**, not one executor wide. `keyFor` is the single function that answers *what
do we send as this row's bearer*. Teaching it about Kimi carries the row through, unchanged, in four places
at once:

- the Bridge's **keyed executor** (`clientFor` → `new OpenAI({ apiKey: bearer })`),
- the **chat picker's** usability check — `keyed` is literally `!!(await deps.keyFor(p))` for any row that
  isn't one of the three OAuth kinds (`bridgeServer.ts:189`),
- the **Bridge model list**, which reads the same `keyed` map,
- **Inquire**, via `resolveApiKey` → `keyForProvider`.

That is why "a record, not a handler" held, and why usage reporting from #169 is **inherited rather than
rebuilt** — Kimi's turns go through `mapKeyedStream` like every other OpenAI-compatible row.

## Why `kind: 'kimi-oauth'` exists at all, given nothing dispatches on it

The pick-up note guessed Kimi should take **no** `kind`, so it would fall through everywhere. It does fall
through everywhere either way: every existing kind check is an `=== 'specific-string'` comparison
(`isCodexProvider` and friends), and the keyed executor's `matches: () => true` fallback claims anything the
three OAuth kinds don't. So a new kind string costs **nothing** on the request paths.

What it buys is the **UI distinction that actually matters**: this row takes a *sign-in*, not a *key*. With
no kind, the TUI would have offered `/key kimi` a masked field whose value `keyFor` never reads, the side
panel would have rendered an API-key input, and the routing CLI would have warned about a missing API key.
The marker is about **how the credential is obtained**, not about which wire carries the turn — and those
two axes had never been separate before, because until now every OAuth Provider also had a bespoke client.

## Consequences

- **The bearer rule must be shared, not copied.** The TUI had *three* copies of "resolve this Provider's
  key" (`bridge.ts` keyFor, `modelFetch.ts`, `testScreen.tsx`). The first implementation pass fixed one, and
  a signed-in user would have got a silent 401 from `/model kimi` and `/test kimi`. All three now route
  through one `bearerFor` in `store.ts` — see [[a-shared-bearer-rule-or-the-oauth-row-401s-on-half-the-paths]].
- **Refresh has to be single-flight.** Putting `bearer()` on the key seam means a single Bridge request calls
  it once *per catalog row*, and the refresh token is single-use.
- **Sign-in lives in one face.** `~/.wisp/auth.json` is shared, so signing in from `wisp` lights up the VS
  Code picker. The panel shows status and points at the terminal rather than offering a button that cannot
  run a device flow — the device leg needs to *display* a code, which the webview has no affordance for.
- **The next Provider of this shape is now cheap**: a catalog row, an auth manager, one `bearerFor` arm.

## Alternative rejected

Giving Kimi its own `ProviderExecutor` record. It would have duplicated the keyed record's request shaping
verbatim — the *only* difference is where the bearer comes from, and that is a credential question, not a
request-shaping one. #167 exists precisely so that a backend which shapes its request identically doesn't get
its own record.

## Related

- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
- [[2026-07-29-chat-completions-usage-is-a-sibling-mapper-not-a-shared-one]]
- [[a-shared-bearer-rule-or-the-oauth-row-401s-on-half-the-paths]]
- [[active-work]]
