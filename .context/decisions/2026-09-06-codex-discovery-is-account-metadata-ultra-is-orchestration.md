---
type: decision
project: wisp
date: 2026-09-06
tags: [context, codex, discovery, reasoning, release]
---

# Codex discovery is account metadata; Ultra is orchestration

The user asked why Astra was missing, required future model names and variants to appear without
hardcoded name lists, and chose wisp-router 2.1.1 for the change. Source commit: `6d39522`;
the extension carries the same core in 1.13.5. wisp-slot stays 1.7.4.

## Discovery

The old models.dev filter admitted only gpt-5/o3/o4-mini families and dropped suffixes. Astra was
already present upstream but excluded by Wisp. The new `codexModels.ts` reads the authenticated
account catalogue at `/backend-api/codex/models`, preserving every model name and variant. Only
`visibility: list` controls picker inclusion; `supported_in_api: false` does not mean unavailable
through ChatGPT OAuth (Spark is the control).

The request requires `client_version`. Omitting it returned 400; an old version returned an empty
list. Pinning a newer version would reproduce the future-release problem, so Wisp reads the current
version from OpenAI's public npm metadata at `https://registry.npmjs.org/@openai/codex/latest`.
It never installs or executes that package. The saved successful version covers metadata outages.

The last successful catalogue is cached per account and endpoint in `~/.wisp/cache/`, expires on use
after 15 minutes, and can be explicitly refreshed. Failed refreshes preserve that account's snapshot;
a successful empty list replaces it. Signed-out callers and other accounts cannot reuse the snapshot.
Manual entry works even when discovery succeeds. The cache stores only allowlisted model metadata,
never credentials or upstream instructions; there is no baked-in Codex model list.

## Reasoning and capabilities

Effort choices/defaults, image support, and the configured context window come from the same
catalogue. The optional larger `max_context_window` is not assumed to be the active window.
Provider-defined effort strings survive config and both Bridge dialects; each other provider still
validates its own wire vocabulary. Claude Code `max` reaches Astra as `max`; an unsupported request
uses the model's advertised default. Unknown manual models omit unadvertised reasoning fields.

Two live-wire checks established that catalogue metadata is not identical to the Responses schema:

- `default_reasoning_summary: none` must become field omission. Sending literal `none` returned 400.
- `ultra` is Codex's multi-agent runtime mode. Sending literal `reasoning.effort: ultra` returned 400,
  while `max` succeeded. OpenAI's `multi_agent_reasoning_effort` field describes the ordinary effort
  used for Ultra's multi-agent work. Wisp excludes Ultra from its ordinary effort picker; mapping
  Claude Code max to Ultra would not reproduce Codex's orchestration.

These are protocol translations, independent of model names. Do not restore the retired Codex
max-to-xhigh clamp or infer future capabilities from model-name prefixes.

## Evidence and limits

- 1,063 core tests in 23 files; 30 terminal tests in 5 files; core/TUI/extension typechecks and builds.
- Real Bridge listener tests preserve both max and an unfamiliar advertised effort through both doors.
- Live Astra plain text, tool-call response, and max-effort requests completed through `codexStream`.
  The tool-call probe did not execute a tool. Normal Wisp auth refreshed an expired credential;
  probes stayed in gitignored `out/` and no credentials or account identifiers were recorded here.
- The installed 2.1.0 binary omitted Astra; the 2.1.1 binary returned it plus the other six visible
  account models. Existing Sol appeared in both controls.
- The compiled extension panel was checked in a browser harness: refresh updates suggestions,
  manual routing values persist in host messages, and max appears for Astra. This is compiled
  webview QA with a mock host, not a live VS Code native-chat turn.
- Both VSIX bundles retain the shared Responses account header; only 1.13.5 contains the live
  package-version discovery marker. See [[active-work]] for published artifact/install verification.

Official source references inspected: OpenAI Codex `codex-rs/codex-api/src/endpoint/models.rs`,
`codex-rs/protocol/src/openai_models.rs`, and `codex-rs/core/src/session/reasoning_effort.rs`.

## Related

- [[pick-up]]
- [[active-work]]
- [[an-upgraded-package-does-not-touch-the-process-already-running]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
