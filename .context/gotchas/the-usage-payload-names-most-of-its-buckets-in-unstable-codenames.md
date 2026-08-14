---
type: gotcha
project: wisp
date: 2026-08-14
tags: [context, gotcha, quota, anthropic, status]
---

# The usage payload names most of its buckets in unstable codenames

`https://api.anthropic.com/api/oauth/usage` returns two readable top-level windows — `five_hour` and
`seven_day` — and then a drift field of named buckets that are almost all `null`:

```
seven_day_oauth_apps, seven_day_opus, seven_day_sonnet, seven_day_cowork, seven_day_omelette,
tangelo, iguana_necktie, omelette_promotional, nimbus_quill, cinder_cove, amber_ladder
```

Some are plan-dependent (`seven_day_opus`), some are unreleased-feature codenames that will be renamed or
removed without warning. **Parse `limits[]` instead** — the same payload carries a normalized array where
each entry has `kind`, `group`, `percent`, `severity`, `resets_at`, `scope`, `is_active`. Everything worth
rendering is there in a stable shape, including the model-scoped weekly window that has no top-level key at
all (`kind: "weekly_scoped"`, `scope.model.display_name`).

**Why it bites:** matching on keywords against the named buckets is exactly the mistake the header recon
nearly made, and `status.ts` already carries the rule in a comment — `ANTHROPIC_WINDOW` matches on *shape*
(`^anthropic-ratelimit-unified-(\d+[mhd])-utilization$`) rather than on names, specifically so the family's
non-window members (`overage-utilization`, `fallback-percentage`, `representative-claim`) cannot be
mistaken for meters. Same family of bug, new payload. A codename bucket that goes non-null for one release
would put a meter on screen named `tangelo`.

**Two more traps in the same payload:**

- **Units differ from the header path.** This endpoint reports an **integer percent** and **ISO-8601**
  `resets_at`; the Anthropic headers report a **0..1 fraction** and `status.json` stores **epoch seconds**,
  which #203's `expired()` predicate depends on. Normalize at the boundary or the two sources land 100×
  apart — the exact failure `parseAnthropicQuota`'s normalizing comment already warns about.
- **It carries account identifiers, including in response headers.** The Anthropic response head returns an
  org uuid and a workspace id; the Codex payload (`/backend-api/wham/usage`) returns `email`, `user_id` and
  `account_id` under predictable keys. Redact on **values** before anything is logged or persisted
  ([[loadcodeassist-answers-with-the-account-email-inside-it]]).

## Related

- [[gotchas]]
- [[2026-08-14-the-usage-endpoint-is-the-same-ledger-reached-without-a-turn]]
- [[2026-08-05-a-duplicated-resolver-is-fixtured-with-what-its-caller-sends-not-what-its-source-names]]
- [[loadcodeassist-answers-with-the-account-email-inside-it]]
