---
type: gotcha
project: wisp
updated: 2026-07-29
tags: [context, gotchas]
---

# Widening a client stream-event union breaks `else` narrowing — and Vitest won't catch it

Every consumer of `CodexStreamEvent` was written against a two-member union and takes the shortcut `if (ev.type === 'text') … else <assume toolCall>`. Adding a third member (#165's `{ type: 'usage' }`) makes that `else` unsound at **six** sites: four in `bridgeServer.ts` (`handleCodexChat` + `handleXaiChat`, streaming and non-streaming arms each) and two in `chatProvider.ts` (the Codex and Grok LM-provider arms).

**`bun run test` stays fully green through this.** Vitest transpiles without typechecking, so the only thing that catches it is `bun run compile` (`tsc -p ./`). A ticket whose gate is "tests pass" will sail straight past a broken build.

Two rules follow:

- **Run `bun run compile`, not just `bun run test`,** before calling any union-touching change done.
- **Test the tool branch explicitly** (`else if (ev.type === 'toolCall')`), never `else`. `XaiStreamEvent` is an alias of `CodexStreamEvent`, so one widening hits both backends' consumers at once.

This is the same shape as the Anthropic encoder's `push()` fallthrough inventing a bogus `tool_use` block for unrecognised events — [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]] avoids that one by reusing the existing usage member. The encoder's version fails silently at runtime; this one fails loudly at compile time. Prefer the loud kind.

## Related

- [[gotchas]] — index
- [[2026-07-29-cliproxyapi-harvest-scoped-minimum-record-usage-first]]
