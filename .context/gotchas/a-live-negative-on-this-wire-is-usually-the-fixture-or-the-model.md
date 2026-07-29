---
type: gotcha
project: wisp
updated: 2026-07-30
tags: [context, gotcha, antigravity, testing]
---

# A live negative on this wire is usually the fixture or the model, not the door

## The trap

`.context/` rightly insists that a green suite does not prove a Provider works — #189 shipped 971/971 over a
retyped CRLF fixture and answered EMPTY at 200. The **converse** trap is the one #191 hit twice in one run,
and it is more expensive, because a live failure reads as authoritative:

**1. A hand-written base64 PNG is not an image.** The first vision check returned
`Antigravity API error 400: Unable to process input image` — which reads exactly like "this wire refuses
vision", contradicting #186. The payload was correct (`inlineData`, right mimeType, data present); the
**fixture** was a 156-byte base64 blob typed to *look* like a PNG. Re-run against a real file
(`docs/claude-model-picker.png`) and the model describes the screenshot accurately. Use a real image from
`docs/`; never hand-assemble one.

**2. A missing tool call is a model choice, not a wiring failure.** Two runs on `gemini-3.1-pro-low` with the
same prompt gave `stop=end_turn, calls=[]` — and one gave a real `tool_use`. The declarations were on the wire
the whole time (verified by capturing the request body). `gemini-3-flash` called on the first attempt every
time. **Read the sent payload before concluding the tools did not arrive**, and drive a tool round trip on
`gemini-3-flash`, not a `pro-low` row.

## The rule

A live negative has three candidate causes, and the door is the **least** likely: your fixture, the model's
own discretion, then the code. Before believing the wire, capture what actually went out — a two-line
`globalThis.fetch` wrapper around the real client prints the request body without disturbing anything — and
re-run the same check with a known-good input. A 400 that names the *input* (`INVALID_ARGUMENT`, "unable to
process") is pointing at your bytes; a 400 that names the *account or shape* is pointing at the code.

Corollary: **a non-deterministic criterion needs retries in the probe, not a verdict from one sample.** #191's
round-trip probe loops up to three attempts per model and walks a model list — one shot would have recorded
"tool calling does not work" on a wire where it demonstrably does.

## Related

- [[gotchas]]
- [[2026-07-29-a-retyped-sse-fixture-cannot-catch-a-crlf-framing-bug]]
- [[2026-07-30-the-antigravity-arm-is-not-a-copy-of-the-anthropic-arm]]
- [[live-verify-the-bridge-from-source-isolated-wisp-home-on-a-spare-port]]
