---
type: decision
project: wisp
updated: 2026-09-02
tags: [context, decisions, anthropic, release]
---

# The advertised claude-cli version is a per-model floor, not decoration

**Decision:** `CLAUDE_CODE_VERSION` tracks the **shipping** `claude-cli`, and a new Claude family
landing in the live picker is the trigger to re-check it. Bumped 2.1.219 → **2.1.258** and shipped as
`wisp-router@2.0.46` + vsix 1.13.1. The TUI's one-tap bind table moved to `claude-fable-5-1` in the
same commit, because it is the **second pin that goes stale on the same event**.

**Why:** the subscription Messages backend enforces the advertised version as a **per-model minimum**
and says so in the body: `400 invalid_request_error`, `"error_code": "claude_code_version_too_old"`,
naming the floor it wants. `claude-fable-5-1` released 2026-09-01 demanding **2.1.251** while Wisp had
claimed 2.1.219 since 2026-07-25, so every turn on the new model surfaced as a 502. The pin had been
read as cosmetic client-recognition trivia — one more string in the fingerprint alongside the betas
and the Stainless headers — and it is not: it is a gate with a moving threshold that Anthropic raises
per model, without touching anything Wisp can observe from its own code.

Three things this establishes, none of which were obvious from the failure:

- **Model discovery was never at fault, and its correctness is what exposed this.** `anthropicModelsFrom`
  pulls the dropdown live from models.dev with deliberately no family whitelist — the same "a brand-new
  family must appear, never be filtered out" stance as
  [[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]. It worked perfectly: the model was
  selectable on release day. A **live picker in front of a pinned client fingerprint** means the picker
  will keep offering models the fingerprint cannot reach, and the gap widens silently between releases.
- **The version alone was the floor — proven, not assumed.** The open risk was a new model gated behind
  a new `anthropic-beta` token *as well as* a version, which would have made the bump a different 400.
  The probe drove both versions with the beta list **unchanged** (still the 2.1.216 capture) and got
  400 → 200 on that single variable. No beta was implicated.
- **The bump cannot break an accepted request, and there is evidence rather than a comment saying so.**
  `claude-opus-5` answered 200 at the *old* version in the same probe run; the `cc_version` hash is
  unvalidated (#148), and `CLAUDE_CODE_VERSION` feeds the User-Agent and the body attribution block as
  one constant so the two can never disagree.

Deliberately **not** done: `ANTHROPIC_MODELS` (the offline fallback list) still knows only
`claude-fable-5`. It is unreachable while models.dev answers — which is exactly why the new row reached
the picker — so adding it would be fixing a path that did not fail. Also **not** built: any automatic
version discovery. There is no endpoint that reports the floor before you trip it; the 400 names it
when you do, which is a cheaper oracle than anything Wisp could poll.

**Reversibility:** easy — one constant, one table entry, both covered by tests that pin the exact
strings.

## Related

- [[decisions]] — index
- [[a-live-picker-in-front-of-a-pinned-client-fingerprint-drifts-apart]]
- [[2026-08-14-antigravity-model-list-is-live-static-is-fallback]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[a-bundled-dependency-is-not-a-face-but-every-face-carries-it]]
- [[a-marker-grep-proves-nothing-without-a-marker-present-in-both]]
