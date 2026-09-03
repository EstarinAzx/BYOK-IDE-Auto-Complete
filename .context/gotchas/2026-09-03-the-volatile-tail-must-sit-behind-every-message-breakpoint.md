---
type: gotcha
project: wisp
date: 2026-09-03
tags: [context, gotcha, anthropic, cache, bridge, cost]
---

# The volatile system tail must sit behind every message breakpoint

Render order on the Anthropic Messages wire is **tools → system → messages**. A prompt-cache breakpoint
caches the whole prefix up to and including its block, in that order. So **anything in the `system` array
is inside the cached prefix of every message-level breakpoint.**

#139 split the client's system into stable + volatile and placed the volatile `<system-reminder>` tail as
an unmarked block *after* the stable marker — which protected the tools+system prefix but left the
volatile block ahead of every message marker. When Claude Code's reminder changed each turn (todo counts,
tick timestamps), every message breakpoint missed and the **whole conversation history re-billed as
`cache_creation`** — O(n²) spend, invisible because the stable-prefix read looked healthy.

**Field + wire signature (Haiku, 4 growing turns, changing reminder):**

```
volatile in system (pre-#363):   read 7610 FROZEN   creation 3877 → 5793 → 7680
volatile behind the breakpoints: read 9568 → 13367  creation ~1900 FLAT
```

Read frozen on the stable prefix + creation growing every turn = a churning block ahead of the message
markers. The user's original Fable report was the same shape at scale (read frozen ~89868, creation
growing).

**Fix (#363, 2.0.47):** the volatile tail rides as a **trailing `role:"system"` turn** — behind every
message breakpoint, and freshly appended each turn so it is never persisted into history (history stays
byte-stable and reads back). Two traps that shaped the fix:

- **A trailing `role:"system"` turn 400s on Sonnet & Haiku** (`role 'system' is not supported on this
  model`; Haiku wire-confirmed). Only Opus 5/4.8 + the Fable/Mythos 5 families take the
  mid-conversation-system beta. Gate on `modelSupportsMidConversationSystem`; on the others keep the old
  system-array placement (no worse than before, no new 400).
- **A turn's bytes must be identical as tail AND as history.** Appending the reminder into the last *user*
  turn re-bills once per turn (the turn loses the reminder when it becomes history). The trailing-system
  turn avoids that — it is a separate synthetic turn, so real turns never carry a reminder.

**Also learned:** the 1M-context Claude-5 models have a **high minimum cacheable prefix** — a ~22k probe
never cached on Sonnet 5 / Opus 5 while a ~90k real session did (Haiku caches at ~11k). Don't read "small
probe shows no cache" as a bug; verify cache work with a big prefix, or cheaply on Haiku.

## Related

- [[gotchas]]
- [[2026-07-20-system-split-at-client-marker]]
- [[2026-07-21-positioned-mid-conversation-system-matters]]
- [[active-work]]
- [[pick-up]]
