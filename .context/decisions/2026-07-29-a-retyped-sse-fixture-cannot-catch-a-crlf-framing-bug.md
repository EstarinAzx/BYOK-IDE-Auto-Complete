---
type: decision
project: wisp
updated: 2026-07-29
tags: [context, decision]
---

# A retyped SSE fixture cannot catch a CRLF framing bug — SHIPPED `c6f644a` (#189)

**The failure.** #189's first live Antigravity turn returned an **empty answer**: HTTP 200, a clean
`finish_reason: stop`, no text, no error, nothing in the Bridge log — against a suite that was **971/971
green**, including 18 tests driving the client over what were believed to be captured wire bytes.

**The cause.** The Antigravity upstream frames its SSE with **`\r\n\r\n`**. The shared `sseBlocks` splitter
(`codexClient.ts`, reused by Anthropic and now Antigravity) split on the literal `'\n\n'`. That sequence
**never occurs** in a CRLF stream — the `\r` sits between the two `\n` — so nothing ever split. The entire
response accumulated into a single buffer, flushed as ONE block at end-of-stream, and
`JSON.parse` of two concatenated JSON documents threw. `parseDataFrame` swallows a parse failure by design
(one bad frame must not lose a turn), so **every frame was silently dropped**.

The result is the worst shape a bug can take: **indistinguishable from a model that chose to say nothing**.
No status, no log line, no exception.

**Why the tests were green.** The fixture was built by **reading the capture file and retyping its bytes into
a test literal**. That normalised CRLF to LF. The fixture therefore tested a wire the upstream never sends,
and did so convincingly — it carried a real tool call, a real signature blob, real usage numbers. Every
*content* assertion in it was faithful. Only the **framing** was wrong, and framing was the one thing not
asserted.

**The rule.** *When the framing is part of the contract, copy the bytes — do not retype them.* A hand-authored
fixture silently normalises whitespace, line endings and trailing newlines. Those are exactly the properties a
parser depends on and a content assertion cannot see. If a fixture is derived from a real capture, either read
the file at test time or make the separator an explicit, named constant in the test so it is visible and
reviewable (`const FRAME = '\r\n\r\n'`) — never an incidental `.join('\n')`.

**The fix.** `SSE_BLOCK_SEPARATOR = /\r?\n\r?\n/`. It matches `'\n\n'` identically, so Codex and Anthropic are
untouched; SSE permits CRLF, LF and CR line endings, so the previous literal was simply wrong about the format
rather than tuned for one provider. Two named regression tests pin both endings.

**Control (this is the load-bearing half).** Reverting the separator to `'\n\n'` fails **5** tests, including
`expected [] to deeply equal ['TURN','_OK']` — the exact empty-answer symptom seen live. Before the fixture was
reframed to CRLF, the same revert failed **nothing**.

**The wider lesson about the gate.** #189's gate was green and its unit coverage was genuinely good — six
deliberate-break controls, a contract asserted against the real predicate rather than a copy. None of that
reached this bug, because every one of those checks ran *downstream* of the framing. **Live verification was
not ceremony here; it was the only thing that could have caught it.** Ship-gating a Provider on "tests pass"
alone would have shipped a Provider that silently answers nothing.

## Related

- [[active-work]]
- [[pick-up]]
- [[2026-07-29-two-doors-share-the-error-answer-not-the-request]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[the-schema-cleaner-is-safe-because-of-its-walker-not-only-its-scope]]
