---
type: decision
project: wisp
updated: 2026-09-07
tags: [context, decisions, codex, caching]
---

# Codex cache continuity needs conversation identity and ordered notes

**Decision:** Use Claude Code's validated metadata session UUID for Codex requests. Keep independent sessions separate, and keep per-request random IDs when the client provides no valid identity. Preserve late system notes in order as developer input only for Codex; the shared Responses builder leaves xAI's mapping unchanged.

**Why:** The user's native Codex sessions reused markedly more cached input than bridged sessions. A local Claude capture confirmed a late control note changes Wisp's opening instructions under the old builder. Live synthetic controls recovered 3,200 cached tokens by holding session identity stable and keeping the note in position. The actual Bridge comparison also preserved 3,200 cached tokens through repeats and late notes after the fix.

The first fixed late-note continuation still missed cache, and the original implementation occasionally hit. Backend cache availability varies; this fixes avoidable disruptions, not every miss or a guaranteed percentage of weekly usage. Actual historical quota attribution remains unknown.

**Reversibility:** Easy, but keep the regression tests. Literal system-role Responses input returned 400; developer-role input succeeded. Do not replace the missing-ID fallback with a global ID or infer identity from identical prompt text.

Released as **wisp-router 2.1.2** and **VS Code 1.13.6**, source `f4bd855`. The fixes were reviewed independently and passed 1,066 core tests, 30 terminal tests, typechecks, extension build, and an actual Bridge live comparison. UI controls and wisp-slot were unchanged.

The native bearer for the same account was used for live probes after the saved Wisp bearer returned 401. No auth file was changed. Local evidence lives in Traycer epic `d8afb63a-86bd-489a-a016-159ce553aa89`, artifact `wisp-codex-usage-inspection` (root-cause, review, and implementation children).

## Related

- [[decisions]]
- [[active-work]]
- [[release-follow-ups]]
- [[2026-09-06-codex-discovery-is-account-metadata-ultra-is-orchestration]]
