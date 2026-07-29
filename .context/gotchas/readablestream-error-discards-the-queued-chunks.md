---
type: gotcha
project: wisp
updated: 2026-07-29
tags: [context, gotchas]
---

# `ReadableStream` `controller.error()` discards the queued chunks

Testing "the stream delivered some content and *then* broke" — the case #168 must **never** retry —
the obvious fixture is wrong:

```ts
// WRONG — the delta never reaches the consumer
new ReadableStream({
  start(c) {
    c.enqueue(encode('event: response.output_text.delta\ndata: {"delta":"half a "}\n\n'));
    c.error(new Error('socket hang up'));
  },
});
```

`controller.error()` **empties the queue**. Both statements run in one tick before anything is read,
so the reader sees only the error and the "partial" delivery never happened. The fixture silently
models the *pre-stream* failure instead — exactly the case that IS retried — so the test asserts the
opposite of what it reads.

Drive it from `pull()` instead, so the chunk is genuinely consumed before the socket drops:

```ts
// RIGHT — first pull delivers, second pull breaks
let sent = false;
new ReadableStream({
  pull(c) {
    if (!sent) { sent = true; c.enqueue(encode('…delta…')); return; }
    c.error(new Error('socket hang up'));
  },
});
```

**The tell:** the request comes back `502` when the test expected `200` + the partial text. That is
the door reporting a *pre-stream* failure, not a mid-stream one — i.e. the fixture's fault, not the
retry logic's. Check `headersSent` reasoning before touching the implementation.

Same trap applies to any Bridge test distinguishing pre-stream from mid-stream behaviour — the two
arms of `failProviderRequest` fork on exactly this.

## Related

- [[gotchas]] — index
- [[2026-07-29-retry-wraps-priming-cooldown-channels-are-separate-maps]] — the ticket that hit it
- [[a-door-commits-its-200-head-before-the-upstream-request-has-run]] — the other half of the pre/mid-stream fork
