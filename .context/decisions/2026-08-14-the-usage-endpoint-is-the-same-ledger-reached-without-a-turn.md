---
type: decision
project: wisp
date: 2026-08-14
tags: [context, decision, quota, providers, anthropic, codex, status, recon]
---

# The usage endpoint is the same ledger as the turn headers, reached without a turn

## Decision

**Build an active quota lane — but not in 2.0.43.** #204's recon drove both account usage endpoints with
Wisp's own stored OAuth credentials and both answered `200`. The verdict is **build**, filed as #207 and
deliberately **not** `ready-for-agent`: #201 states the passive header side-channel stays the source of
truth for this release, and three scoping calls (cadence, precedence, opt-in) are the user's.

The two endpoints, both driven with credentials already in `~/.wisp/auth.json`, no extra scope or consent:

- **Anthropic** — `GET https://api.anthropic.com/api/oauth/usage`, `Authorization: Bearer <stored token>`
  plus `anthropic-beta: oauth-2025-04-20`. Call shape lifted from the Claude CLI bundle itself
  (`fetchUtilization: GET /api/oauth/usage`, `refreshOAuth`).
- **Codex** — `GET https://chatgpt.com/backend-api/wham/usage`, `Authorization: Bearer <stored token>` plus
  `chatgpt-account-id: <stored account id>`. From `codex.exe`'s backend client, which carries `/backend-api`
  as base beside two candidate paths. **`/backend-api/api/codex/usage` is a 404** — do not carry it forward.

## Why

**They report the same ledger, verified without spending read budget.** The readings were cross-checked
against `~/.wisp/status.json`, which the Bridge writes *from turn headers*, and they agree exactly:
Anthropic 5h `42%` / 7d `71%` with resets matching to the second, Codex 7d `100%` with
`reset_at 1787198654`. Same account, same numbers, different door.

**That agreement is what retires the ceiling question.** [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
is the standing trap for any new quota source, and the obvious way to clear it — watch a counter move — costs
reads against an endpoint with a multi-minute 429 penalty. It was cheaper and stronger to check the new
source against a source already known to move. Two spaced Anthropic reads did return identical integer
percentages, which alone proves nothing (integer granularity over ten minutes of light use); the microsecond
drift on `resets_at` between them shows the response is recomputed per call rather than cached.

**Codex `secondary_window: null` independently re-confirms the Plus one-window rule** that
`parseCodexQuota` already encodes via `x-codex-secondary-window-minutes: 0`.

**The build reason is not richer fields, it is reachability with zero turns spent.** Headers only arrive on a
response, so a freshly-opened session has stale or absent meters until the user sends something. That is the
structural hole, and #203's expired-window rendering exists precisely because of it. The extra fields are a
bonus: model-scoped weekly windows (`limits[].kind: "weekly_scoped"`, `scope.model.display_name`), which
window actually binds (`is_active`), `severity`, extra-usage credits, spend caps, `plan_type`, and Codex's
authoritative `limit_reached` / `rate_limit_reached_type`.

**Not in this release, because the passive lane is still the declared truth.** Adopting a second source
means deciding what happens when the two disagree. They agreed here, so "freshest wins" is probably enough
— but that is a decision, not a default, and #201 already scoped this release around the header path.

## Reversibility

Nothing was built; the probes were throwaway and are deleted. Re-open the *timing* question freely — the
endpoints are verified and #207 carries the constraints. Re-open the *verdict* only if a probe starts
returning `401` on stored credentials (meaning the endpoint requires a scope the OAuth flow does not grant)
or if the readings stop agreeing with the header meters.

## Related

- [[decisions]]
- [[quota-recon]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
- [[2026-07-30-a-quota-window-belongs-to-the-account-a-context-reading-to-the-conversation]]
- [[a-cancelled-response-body-cannot-test-whether-a-counter-decrements]]
- [[the-usage-payload-names-most-of-its-buckets-in-unstable-codenames]]
- [[a-new-quota-source-is-cheapest-to-validate-against-one-already-trusted]]
- [[loadcodeassist-answers-with-the-account-email-inside-it]]
