---
type: decision
project: wisp
date: 2026-07-30
tags: [context, decision, release, surfaces, antigravity]
---

# A `### Surfaces` section is checked against the code, not copied from the ticket

**Context.** #192 is the release cut for spec #185 (Antigravity). Its whole reason to exist is the rule from
[[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]: **npm is one of three faces**, so every
release entry must name which faces carry the work and file any owed bump as its own ticket.

The ticket's body states the answer outright:

> Antigravity is core plus the TUI face. The extension face gets nothing from this release — that is fine, but
> it must be **stated**, and any owed bump filed as a ticket in the same pass.

Read one way, the ticket has already done the analysis and the job is transcription. That reading is wrong.

**Decision.** The `### Surfaces` section is derived from `git log <last-tag>..main -- <face-path>` and from
reading what the face actually does, **every time** — never from the ticket's own prose, even when the ticket
sounds certain.

## What the check found

`git log v2.0.40..main -- packages/vscode/` returns two commits: **`ba8dab3` (#188)** and **`c6f644a` (#189)**.
The extension face is not a bystander to Antigravity:

- `extension.ts` constructs `AntigravityAuth` and holds it so the Bridge can **refresh** the stored bundle and
  **bootstrap the Cloud Code project** before a turn — the same shape it already uses for Kimi.
- It passes `antigravitySignedIn` / `antigravityCreds` into its own `createBridgeServer` call. **The extension
  hosts the Bridge too.** A user who never installs the npm package still reaches Antigravity through both
  doors, from the editor.
- `sidePanelProvider.ts` and `webview/app.tsx` carry the `antigravity-oauth` kind end to end: the row renders,
  `isAntigravitySignedIn` reports a truthful status off the shared `auth.json`, and the panel points at
  `/signin antigravity` rather than offering a button it cannot run.

The vsix is at **1.10.1** and carries none of it. `@wisp/core` is bundled at build time, so **no npm version
can deliver it**. A bump is owed — filed as **#197**.

Had the section been copied, 2.0.41 would have shipped a changelog stating in writing that a face which gained
a whole Provider gained nothing, and the owed bump would have evaporated. That is the precise failure mode the
rule was written for; the ticket enforcing the rule was itself the thing that got it wrong.

## Why a ticket body is not evidence

A ticket is written **before** the work, from the shape the work is expected to take. #185's plan put
Antigravity in core and the TUI, with "VS Code picker deferred" — and that is still true, in the sense that no
picker row was added. But #188 and #189 each needed the extension to hold a credential manager and feed its own
Bridge, so the face moved anyway, as a side effect of wiring rather than as a planned feature.

That is the general case: **a face gains work when a commit touches it, which is not the same as when a plan
says it should.** The plan describes intent; the log describes what happened. Only one of them is checked
against reality.

## The mechanical form of the check

Before writing `### Surfaces`, for each of the three faces:

```
git log <last-release-tag>..main -- packages/vscode/     # the vsix face
git log <last-release-tag>..main -- packages/tui/        # the npm face
git log <last-release-tag>..main -- plugins/ .claude-plugin/   # the wisp-slot face
```

Empty output is the only thing that licenses "nothing is owed." For this cut, `plugins/` was genuinely empty —
`wisp-slot` stays at 1.6.0, and that claim is evidence-backed rather than assumed.

Note the asymmetry that makes the check cheap and its absence expensive: running it costs three commands, and
skipping it produces a changelog that is confidently, permanently wrong about a published artifact.

## A corollary about the owed ticket's label

#197 is filed **unlabelled**, not `ready-for-agent`. `## Blocked by` is body text on this tracker, not a native
link, so no frontier query can see it — **labels are the only real gate**. Labelling the follow-up at filing
time would have handed the next agent leg a ticket to release the extension face before the npm face it
depends on had even merged.

## Related

- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]] — the rule this decision operationalises
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[2026-07-29-antigravity-narrow-port-never-mint-opaque-tool-ids]] — the spec whose plan said "picker deferred"
