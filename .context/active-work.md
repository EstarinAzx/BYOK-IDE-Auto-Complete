---
type: active-work
project: wisp
updated: 2026-09-06
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-09-06. Source/release commit `6d39522` on main, tag `v2.1.1`.
Released and installed: **wisp-router 2.1.1** and **VS Code extension 1.13.5**.
wisp-slot stays 1.7.4. This baton is committed separately on main after release verification._

## Current focus

**The Codex discovery change is shipped, verified, and installed. Nothing remains in flight.**

Astra was excluded by the old model-name filter. Wisp now reads the authenticated account catalogue,
including future visible names and variants, and uses its reasoning/image/context metadata throughout
both faces and both Bridge dialects. Discovery refreshes on use after 15 minutes, has a saved
account-specific fallback, and exposes explicit refresh and manual entry. It discovers the required
Codex client version from OpenAI package metadata instead of installing Codex or pinning a version.

Claude Code max remains Responses max when supported. Ultra adds Codex multi-agent orchestration;
sending it as an ordinary Responses effort returned 400. Summary none similarly becomes omission.
See [[2026-09-06-codex-discovery-is-account-metadata-ultra-is-orchestration]] for the design and evidence.

## Release and verification

- **Release:** [v2.1.1](https://github.com/EstarinAzx/Wisp-Router/releases/tag/v2.1.1).
  Source `6d39522` and the annotated tag were pushed to origin; the tag resolves to that source commit.
- **Workflow:** [34010930438](https://github.com/EstarinAzx/Wisp-Router/actions/runs/34010930438),
  all five jobs green: Windows x64, Linux x64, macOS arm64/x64, and publish.
- **npm:** both the version endpoint and latest report 2.1.1. Scratch-installed the published package
  under gitignored `out/verify-wisp-2.1.1/` and executed its real binary, not just its package manifest.
  The optional Windows platform package was delivered normally on this cut.
- **Previous-version control:** published 2.1.1 lists Astra; installed 2.1.0 does not. Sol appears in
  both. The new catalogue lists seven visible account models. Published Windows asset and npm platform
  binary match SHA-256 `9b6301d35359641d7dc59643654b7ae03abf715786962b6f05a547c6f55ea2cc`.
- **VSIX:** workflow automatically attached 1.13.5 (the previously unproven packaging step is proven).
  Downloaded VSIX digest matches GitHub:
  `18f67a1640315a092aad9561b7ce881a836745e9f7af72c71f587e0815d3a3d3`.
  Its bundle has live package-version discovery; 1.13.4 lacks it. Both contain the Responses account
  header as the shared control.
- **Local gate:** 1,063/1,063 core tests across 23 files; 30/30 TUI tests across 5 files; core/TUI/
  extension typechecks and both package builds. No dependency changes. Both Bridge doors preserve max
  and a synthetic future advertised effort in real-listener tests.
- **Live behavior:** Astra text, tool-call response, and max requests completed through codexStream.
  The tool probe did not execute a tool. Ultra and literal reasoning summary none were rejected, then
  translated appropriately. Only normal Wisp auth was used; no account identifiers or credentials
  entered the repository. The tool environment used exported public Windows CA roots for TLS trust;
  verification was never disabled and no global trust/environment setting was changed.
- **UI:** real OpenTUI keyboard tests cover unfamiliar model/effort values and refresh/manual actions.
  Compiled extension panel tested in a browser harness for refresh and manual routing persistence.
  The browser host was mocked; this was not a live VS Code native-chat turn.
- **Installed:** global npm reports wisp-router 2.1.1; VS Code reports esarinazx.wisp@1.13.5.
  The installed global `wisp models codex --refresh` returns Astra. Reload VS Code to activate its new
  extension host; reopen any pre-existing terminal UI to use the new binary.

## Bridge and workspace state

**No Bridge listener on port 41184 at the cut.** Nothing was restarted. The next Wisp host uses 2.1.1.
The two pre-existing user changes, `.context/flows.md` and `.context/Untitled.canvas`, remain outside
our commits. Release probes, downloaded packages, and build artifacts remain gitignored under out/.

## Pick up here

The ready-for-agent queue is empty by query; check it again at pickup. The held bugs and durable
landmines are in [[pick-up]]. No held issue was implemented, filed, or relabeled in this session.
Open but deliberately not ready: #207 (three scoping calls), #69, #163.

Carried forward: the TUI-hosted Bridge log gap; Antigravity routing sign-in warning; toolChoice and
max_tokens gaps; advisor accounting; media-only tool results; statusline resolver drift; per-message
control hints; large-body 429s. Their exact scope and constraints remain in [[pick-up]].
The Fable cache re-bill decision from 2.1.0 remains unchanged: require a same-session Opus control
before reopening it. Other user-owned follow-ups (secret-scanning alert dismissal, access-secret
rotation, Kimi subscription, stale branch cleanup) remain held as listed there.

## Related

- [[pick-up]]
- [[overview]]
- [[decisions]]
- [[2026-09-06-codex-discovery-is-account-metadata-ultra-is-orchestration]]
- [[2026-09-04-the-fable-cache-rebill-is-the-backend-classify-dont-chase]]
- [[an-upgraded-package-does-not-touch-the-process-already-running]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
