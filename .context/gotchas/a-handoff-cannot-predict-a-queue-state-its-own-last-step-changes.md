---
type: gotcha
project: wisp
updated: 2026-07-30
tags: [context, gotcha, relay, handoff, tracker]
---

# A handoff cannot predict a queue state its own last step changes

**The trap.** A relay leg writes its handoff *before* the next leg runs, so every claim about "what the queue
will look like afterwards" is a prediction. When the leg's own instructions end with an action that **mutates
the queue**, that prediction is written from a state that will no longer exist by the time anyone reads it.

Concretely on leg 6 → leg 7. The handoff and `pick-up.md` both closed with:

> 8. **Label #197 `ready-for-agent`** — last act.
> Then the queue is dry again → `stop: true`, no leg 8.

Step 8 **arms a ticket**. The queue is therefore *not* dry — it contains exactly the ticket step 8 just added.
The instruction and its stated reason contradict each other, and both were written by the same leg in the same
pass, so there is no later authority to appeal to.

**Why it is easy to miss.** Each half reads as obviously correct on its own. "Label the follow-up last, because
labels are the only real gate" is right. "The spec is delivered, so stop" is right. Only the *ordering* is
wrong: the stop condition was evaluated against the pre-step-8 world.

**The rule.** When a leg's final step changes what the frontier query returns, state the stop decision as an
**instruction with its reason**, never as a **prediction of queue state**:

```markdown
# wrong — a prediction the last step falsifies
Then the queue is dry again → stop: true, no leg 8.

# right — an instruction that survives its own side effects
#197 will be armed by step 8, so the queue will NOT be dry.
Stop anyway: the extension face needs a human (the vsix is packaged, not installed).
Point the baton at #197 so re-arming is one command.
```

**How leg 7 resolved it.** Honored the explicit stop over the inference, because the reason for stopping
survives even though the premise did not — the vsix is **packaged, not installed** and not on the marketplace,
so the extension release has a human step regardless of what the label says. The baton was pointed at #197
rather than `queue empty`, so the state is honest and restarting costs one command. Guessing "the instruction
is stale, drain the queue" would have spawned an unattended full-permission leg on authorization that was
scoped to *"leg 7 publishes 2.0.41"* and nothing further.

**The general shape.** An explicit instruction and its stated justification can come apart. Prefer the one
whose *reason* still holds; when neither is clearly right, take the path that is cheapest to reverse — stalling
costs one command, an unwanted autonomous leg costs a review.

## Related

- [[gotchas]]
- [[active-work]]
- [[2026-07-30-a-surfaces-section-is-checked-against-the-code-not-copied-from-the-ticket]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
