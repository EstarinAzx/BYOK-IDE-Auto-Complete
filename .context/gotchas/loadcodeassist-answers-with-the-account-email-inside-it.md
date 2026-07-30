---
type: gotcha
project: wisp
date: 2026-07-30
tags: [context, gotcha, antigravity, credentials, privacy]
---

# loadCodeAssist answers with the account email inside it

`POST https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist` — the call `antigravityAuth.ts:58` makes
for the Cloud Code project id — returns a body containing the signed-in user's **email address**, embedded in a
URL rather than in a field anyone would think to redact:

```
"upgradeSubscriptionUri": "https://accounts.google.com/AccountChooser?Email=<user>%40gmail.com&continue=…"
```

It is also **percent-encoded** (`%40`, not `@`), so a redactor keyed on `@` walks straight past it, and the key
name (`upgradeSubscriptionUri`) matches no `email`/`id`/`project` pattern. A field-name allowlist misses it
twice.

Bit during #200's recon: the first dump redacted by key name (`/id$|email|project|name|token/`) and printed the
address in full. The response also carries `cloudaicompanionProject`, `currentTier.id`, `paidTier.id` and
`allowedTiers[].id` — all account-identifying, all of which **must not reach this public repo**
([[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]).

**Rule for anything captured off this endpoint: redact on the value as well as the key** — match `@`, `%40`,
`gmail`, and any `wrk_`/`prj_`-style prefix, and drop the prose blocks (`privacyNotice`, `noticeText`,
`description`, `upgradeSubscription*`) entirely. They carry no technical signal and are where the identifying
strings hide.

Same class of leak on the opencode wire: a `401 CreditsError` body names a billing page containing the
**workspace id** (`https://opencode.ai/workspace/wrk_…/billing`). Quoting an upstream error verbatim into a
ticket or a note publishes it.

## Related

- [[gotchas]]
- [[quota-recon]]
- [[2026-07-29-a-public-repo-is-a-publishing-decision-not-a-commit]]
- [[2026-07-30-an-advertised-ceiling-that-never-decrements-is-not-a-meter]]
