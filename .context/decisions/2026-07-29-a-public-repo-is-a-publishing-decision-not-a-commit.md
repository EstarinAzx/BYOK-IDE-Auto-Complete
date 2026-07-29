---
type: decision
project: wisp
date: 2026-07-29
tags: [context, decision, security, credentials]
---

# A public repo is a publishing decision, not a commit

**Context.** #188 needs Antigravity's Google OAuth client id and secret to run the sign-in flow. The
reference (CLIProxyAPI) ships both openly in `internal/auth/antigravity/constants.go`, and this repo already
hardcodes the Anthropic and xAI client ids. During the build the maintainer discovered a comment on #188
carrying those values plus their Cloud Code project id, deleted it, and asked for care.

**Decision.** Hardcode the client id + secret — **but only because the maintainer chose it when asked.** The
agent had already written them into `packages/core/src/antigravityAuth.ts` on reference-parity reasoning
without asking. That was the mistake, not the eventual answer.

## Why this is not a rule you can derive

The technical facts point one way and the judgement points another, and the judgement wins:

- An **installed-app client secret cannot be kept confidential** — it must reach the user's machine for the
  flow to work at all. RFC 8252 says so outright, and it is precisely why PKCE S256 is built into this
  Provider rather than trusting the secret.
- A **client id is public by construction** — it appears in the browser address bar during every sign-in.
- So the real risk is **not** account compromise (that needs the maintainer's Google login). It is that a
  widely-copied secret gets the upstream OAuth client **revoked**, breaking every user at once.

That last risk is a product risk with a human owner. An agent cannot weigh "how likely is Google to revoke
this" — so it must ask rather than infer from what the reference did.

## The rules this settles

1. **Account-identifying values never enter this repo.** The Cloud Code project id is read live from
   `loadCodeAssist`; tests use `example-project-1`. Same for emails and any per-account id.
2. **Tokens never enter this repo, ever** — no judgement call, no exception. Verified: zero access/refresh
   token matches across all of git history.
3. **Anything credential-shaped in a file bound for a public repo is a question, not a default.** Reference
   parity is evidence, not permission.
4. **An unattended agent does not merge a PR carrying such a value.** #188 was left `ready-for-human` at
   PR #193 for exactly this reason, even though its gate was green — then merged (`ba8dab3`) once the
   maintainer had the facts and said so.

## How it actually resolved

GitHub secret scanning had **already fired** on the deleted #188 comment — two open alerts, `Google OAuth
Client ID` and `Google OAuth Client Secret`, and deleting the comment did not close them. That reframed the
question, because it supplied the deciding fact:

> Removing the secret from this repo would **not** reduce the revocation risk — the same secret is public in
> CLIProxyAPI regardless. It would only quiet the scanner.

So hardcoding costs a standing alert, not security, while the env-var alternative would charge every future
`wisp-router` user a setup step for tidiness alone. Merged as-is; the alerts are dismissed as "won't fix",
which is an accurate classification here rather than a cover-up.

**The transferable bit:** "is this exploitable?" and "will this trip a scanner?" are different questions, and
the second one firing does not answer the first. Check whether removal actually reduces exposure before
paying for it — if the value is public elsewhere, removal buys quiet, not safety.

## What was NOT done, and why

**No history rewrite.** The project id sits in `.context/` at commit `4421e61` on a public repo. A
`filter-repo` + force-push would remove it from this repo's history but not from forks, mirrors, or anything
already scraped — and it breaks every clone. For an identifier that authorises nothing on its own, the cost
exceeds the benefit. Scrubbed going forward instead.

**The genuinely sensitive artefact is off-repo:** `D:\scratch\antigravity-spike\out\tokens.json` holds live
access + refresh tokens. The durable fix for any suspected leak is revoking the grant at
`myaccount.google.com/permissions` and signing in again — that invalidates every token ever issued, which no
amount of repo surgery can do.

## Related

- [[active-work]]
- [[2026-07-29-antigravity-narrow-port-never-mint-opaque-tool-ids]]
- [[2026-07-29-never-overwrite-a-store-we-could-not-parse]]
