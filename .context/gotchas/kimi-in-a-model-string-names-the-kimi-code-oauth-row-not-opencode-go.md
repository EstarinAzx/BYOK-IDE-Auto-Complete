---
type: gotcha
project: wisp
updated: 2026-08-03
tags: [context, gotchas]
---

# `kimi` in a model string names the Kimi Code OAuth row — NOT OpenCode Go's kimi-k* models

Two unrelated things wear the name "kimi". The catalog Provider `id: 'kimi'` (`catalog.ts`) is the
**Kimi Code subscription** backend — `api.kimi.com/coding`, `kind: 'kimi-oauth'`, RFC 8628 device
sign-in, **no API key, ever**. The kimi-k2.5/k2.6/k2.7-code/**k3** model ids most people mean are served
by **OpenCode Go** (`opencode-go`, `/zen/go/v1`) against the stored OpenCode key. So a Claude Code model
string `kimi/kimi-k3` resolves on the provider-id rung straight to the OAuth row, and the user's
OpenCode key — sitting in the `opencode-go` slot — is never consulted: `bearerFor`'s kimi arm
(`packages/tui/src/store.ts`) returns `kimiAuth.bearer()` only and never reads the keys map (that is the
#170 keyFor-seam design, [[2026-07-29-oauth-credentialed-but-keyed-on-the-wire-resolves-at-the-keyfor-seam]]).

The trap is armed by the **error wearing the wrong words**: a signed-out `kimi` falls through
`startProviderStream`'s keyed tail and answers `400 provider 'kimi' has no API key configured` — the
correct state is "not signed in" (401), and the key-language sent a user key-hunting in the TUI on
2026-08-03 ("I set the key, it's not expired"). Same message-borrowing class as
[[the-anthropic-door-does-not-use-the-executor-records]], different cause: here the fall-through is
*correct* routing (kimi IS keyed-wire by design), only the null-client message is wrong for OAuth-credentialed rows.

Rules: kimi-k* through the key you own → **`opencode-go/kimi-k3`** (family rebind: `wisp routing set
<family> opencode-go/kimi-k3`). The bare `kimi/...` form is right only with an actual Kimi Code
subscription signed in via `/signin kimi`. Never mint an alias named `kimi` — resolveRoute's provider-id
rung outranks alias-exact, so it can never win. And when any OAuth-kind row answers "has no API key
configured", read it as **"not signed in"** before touching a key slot.

## Related

- [[gotchas]] — index
- [[2026-07-29-oauth-credentialed-but-keyed-on-the-wire-resolves-at-the-keyfor-seam]]
- [[a-shared-bearer-rule-or-the-oauth-row-401s-on-half-the-paths]]
