---
type: decision
project: wisp
date: 2026-07-29
tags: [context, decision, release, surfaces]
---

# A release cut names its surfaces — npm is one of three faces, not "the" release

## Decision

**SHIPPED `55daebb` / tag `v2.0.38` (#173).** Every Wisp release entry now ends with a **`### Surfaces`**
section stating, per change, which of the three faces actually carries it — and explicitly naming any bump
that is *owed but not cut*, with its reasoning. The 2.0.38 entry is the first.

The three faces, and why an npm publish reaches only one:

| Face | Ships via | Gets core changes how |
|---|---|---|
| `wisp-router` (npm) | tag `v*` → `.github/workflows/release.yml` | the TUI hosts the Bridge — directly |
| `wisp` (vsix) | `vsce package` in `packages/vscode` | **bundles its own copy of `@wisp/core`** — only on a rebuild |
| `wisp-slot` (Claude Code plugin) | plugin marketplace | out-of-process scripts under `plugins/slot/` — only on a plugin bump |

Concretely for this cut: npm got all eight harvested tickets; the **vsix bump was ruled owed and
deliberately not cut** (four tickets changed extension-face code), and the **`wisp-slot` bump was ruled owed
too** (#171's *reader* half lives in `statusline/wisp-statusline.js`). Both are tracked as #180.

Also decided: #180 is labelled **`ready-for-human`, not `ready-for-agent`** — see *Why* below.

## Why

The prompt was #173's own acceptance criterion, which demanded "an explicit decision recorded on whether a
matching vsix bump is owed, with its reasoning" and warned *do not assume npm alone is enough just because
it is the ticket title*. Answering it once is worth generalising, because the failure mode is silent and
recurring:

- **The vsix bundles its own engine.** `packages/vscode` esbuilds `@wisp/core` into `dist/extension.js`. So a
  core fix reaches an extension user on **zero** npm releases and exactly one vsix rebuild. #172 is the sharp
  case — an extension user keeps sending `gpt-5.3-codex`, which the ChatGPT-account path answers `400` to,
  no matter how current their npm install is.
- **The plugin is a third registry entirely.** #171 shipped a *writer* (the Bridge writing
  `~/.wisp/status.json`) and a *reader* (`wisp-statusline.js`) in one commit, but only the writer travels on
  npm. `3e0125e` changed the script without touching `plugins/slot/.claude-plugin/plugin.json`, so plugin
  **1.5.0 now means two different things** — with and without the `ctx …%` badge. A user sees no badge and
  has no version difference to explain it.
- **"Which surface" is invisible from the diff.** `packages/core/src/**` looks like one place. It is three
  delivery paths with three cadences, and nothing in the tree says so. Writing it into the release notes puts
  the answer where the person asking ("why don't I have this?") is already looking.

**Why #180 is `ready-for-human`.** It would be two further *outward-facing publishes*, and #173 authorized
exactly one, by name. It also carries a criterion no unattended leg can satisfy — installing the packaged
`.vsix` in a real VS Code host. And spec #164 declared #173 its final leg, so auto-grabbing work discovered
at cut time would be the agent widening its own scope. The agent-doable remainder (bumps, changelogs,
`bun run package`, the gate) is real, and the ticket says to flip the label if that pre-staging is wanted.

## Reversibility

**Cheap and additive.** `### Surfaces` is a changelog convention, not code — dropping it costs nothing and
breaks nothing. The npm publish itself is the hard-to-reverse half (npm unpublish is heavily restricted, and
`2.0.38` can never be reused), but that was the ticket.

The one thing to *keep*: the rule that a bump ruled "owed" is filed as a ticket in the same pass. An owed bump
recorded only in prose is an owed bump that evaporates — which is precisely how `wisp-slot` 1.5.0 came to
mean two things.

## Related

- [[decisions]]
- [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]] — the #171 split whose reader/writer halves ride different registries
- [[2026-07-29-a-model-list-is-not-an-accepted-list-whitelist-the-probed-ids]] — #172, the change most visibly stranded without a vsix bump
- [[active-work]]
