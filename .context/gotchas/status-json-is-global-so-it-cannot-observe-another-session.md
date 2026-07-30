---
type: gotcha
project: wisp
updated: 2026-07-30
tags: [context, gotcha, statusline, bridge]
---

# `~/.wisp/status.json` is global — you cannot use it to observe another session

**The trap.** `status.json` is **one file per machine**, overwritten after every bridged turn on the
Anthropic door. If you are yourself running in a bridged Claude Code session, **your own turns overwrite it**
— including the tool call you just made to read it. So an attempt to inspect some *other* session's snapshot
returns your own, microseconds old, looking entirely plausible.

Seen live 2026-07-29 while verifying #165. The user ran a Codex session; every read came back:

```json
{ "providerId": "anthropic", "model": "claude-opus-5", ... }
```

with a mtime one second old. That is not a stale file and not a bug — it is the reader's own turn. Two
bridged sessions on one machine clobber each other **continuously, not occasionally**.

**Why the model-match guard doesn't save you.** `wisp-statusline.js` ignores a snapshot whose model does not
match the session's resolved Target, which hides cross-family clobbering *from the badge*. It does nothing
about the **write**. The file is only ever a reliable description of *the most recent turn on the machine*,
whoever made it.

**It also DISPLACES a session's own reading, which is a rendering bug, not just an observation one.**
Discovered 2026-07-30: the guard above suppresses the wrong reading but does not go find the right one. A
`sonnet → codex` session sat next to an `opus → anthropic` session that turns constantly, so the top level
was anthropic's continuously — and the codex reading, correctly ledgered by `mergeStatus`, was never read
back. The block rendered anthropic's `5h`/`7d` pair as its only quota row, in a codex session. The reader now
looks in **both** places keyed on `providerId`
([[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]). So: the global slot's
consequence is not only "you can't watch another session" — it is **"your own reading may not be where you
look for it"**, and any new consumer of `status.json` must check the ledger too.

**What to use instead.** For verifying that a session reported usage, read the **Claude Code transcript** —
per-session, durable, and it carries the real numbers:

```
~/.claude/projects/<encoded-cwd>/<session-uuid>.jsonl
```

Fold rows by `message.id` first — transcripts emit **one row per content block**, repeating `usage`, so a
naive count multiplies every turn ([[cc-transcript-rows-are-blocks-not-messages]]).

**Do not "fix" this reflexively.** For the statusline's actual job — one interactive session rendering its
own badge — a global file is correct and cheap. The limitation only matters for *observation*: verification,
tooling, or a second face. Tracked as an open question in [[active-work]], deliberately unsolved.

## Related

- [[gotchas]]
- [[cc-transcript-rows-are-blocks-not-messages]]
- [[2026-07-29-quota-is-a-side-channel-not-a-bridge-stream-event]]
- [[2026-07-30-the-statusline-finds-its-quota-by-provider-in-either-of-two-places]]
- [[the-statusline-duplicates-resolveroute-and-drifts]]
- [[active-work]]
