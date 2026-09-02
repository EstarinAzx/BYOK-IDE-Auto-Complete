---
type: gotcha
project: wisp
updated: 2026-09-02
tags: [context, gotchas, anthropic, release]
---

# A live picker in front of a pinned client fingerprint drifts apart

Wisp's Anthropic dropdown is **live** (models.dev, no family whitelist, so a brand-new family appears
by itself) while the client fingerprint it speaks with is **hardcoded**. Those two facts are each
correct and together they guarantee a window where the picker offers a model the fingerprint cannot
reach. The failure wears a misleading face: `502 provider request failed` wrapping
`400 invalid_request_error` — `"Claude Code 2.1.219 does not support this model; version 2.1.251 or
newer is required. Run 'claude update' …"`, `error_code: claude_code_version_too_old`.

**The version in that message is not the user's Claude Code.** It is `CLAUDE_CODE_VERSION` in
`packages/core/src/anthropicClient.ts` — the string Wisp *claims* to be. The message's own remedy
("run `claude update`") is therefore advice for the wrong machine, and following it changes nothing:
the reporting user's CLI was already 2.1.258 while Wisp said 2.1.219. Read the number as a **Wisp
constant**, never as the local install, and check it before touching anything else.

**A Claude release makes TWO hardcoded pins stale on the same day**, in different packages, and only
one of them announces itself:

- `CLAUDE_CODE_VERSION` (`packages/core`) — announces itself loudly, as the 400 above.
- `CLAUDE_FAMILY_MODELS` (`packages/tui/src/routingScreens.tsx`) — the one-tap "Bind Claude
  subscription models" mapping, which is **silent**. Its `fable` entry still said `claude-fable-5`
  after `claude-fable-5-1` shipped, so pressing the button *downgraded* a working hand-set route with
  no error and no output. Sibling trap to
  [[accidental-tui-open-rewrites-all-family-routes]] — same button, same blast radius, different
  cause. `withFamilyRoute` validates the **providerId only**, never the model, so a stale table can
  never be refused on the way in.

Both now carry comments naming each other. The rule: when a Claude family gains a release, check the
pin **and** the bind table, and do not trust "it appears in the picker" as evidence that a model works
— the picker is fed by a source that knows nothing about the fingerprint.

Method rider: the floor is only discoverable by **tripping it**. No endpoint reports it in advance,
but the 400 names the exact minimum, which makes one throwaway probe a complete oracle. Drive the new
model at the old version and the new one with everything else held constant, and keep a model that
already worked at the **old** version in the run — that control is what separates "the wire rejected
this" from "my probe was malformed"
([[a-marker-grep-proves-nothing-without-a-marker-present-in-both]] is the artifact-side twin of the
same discipline).

## Related

- [[gotchas]] — index
- [[2026-09-02-the-advertised-claude-cli-version-is-a-per-model-floor]]
- [[accidental-tui-open-rewrites-all-family-routes]]
- [[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]
- [[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]
