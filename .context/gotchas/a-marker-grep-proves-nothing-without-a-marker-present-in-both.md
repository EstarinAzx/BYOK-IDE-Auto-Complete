---
type: gotcha
project: wisp
date: 2026-08-14
tags: [context, gotcha, release, verification]
---

# A marker grep proves nothing without a marker present in both

[[verifying-a-fix-release-needs-the-previous-version-as-a-control]] gets you the right *artifacts* — new
and old, side by side. This is the second half: it also needs the right **markers**, and a marker set that
is all-absent-in-old is not enough on its own.

Grepping the 2.0.45 and 2.0.44 binaries for the new code path:

```
=== new ===                  === old ===
  thinkingLevel        4       thinkingLevel        0
  includeThoughts      1       includeThoughts      0
  -tiered              1       -tiered              0
  fetchAvailableModels 1       fetchAvailableModels 1     <-- the one doing the work
```

The first three rows are the finding. **The fourth row is what makes them mean anything.** It is a
**shared control** — a string known to be in *both* binaries (2.0.44's own feature) — and it is the only
thing separating "the marker is genuinely absent from the old build" from "the grep never read the file."

Without it, a column of zeroes is ambiguous, and every failure mode produces that same column: wrong path,
unreadable binary, a shell quoting slip, a `grep -c` on a file that does not exist. All of them look
exactly like a clean pass.

The 2.0.44 cut hit the mirror image of this — `fetchAvailableModels` matched the OLD 1.11.0 vsix bundle too
(a stale comment string), so a *present* marker proved nothing and the `v1internal:` URL literal had to be
found instead. Same lesson from the other side: **a marker only discriminates if you know what it does in
the artifact that should NOT have it.**

The rule: every marker check ships with two kinds of marker.

- **Discriminating** — expected present in new, absent in old. The claim.
- **Control** — expected present in both. The proof the search itself works.

Also note what this check does and does not establish. It proves the published artifact *contains* the code
path; it does not prove the published artifact *drives the wire* correctly. Here the wire behavior was
proven separately from the same commit at source level, so the chain closes — but as two measurements
joined at the commit, not one end-to-end run through the published binary. Say so rather than rounding up.

## Related

- [[gotchas]]
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
- [[2026-08-14-antigravity-effort-reaches-only-the-tiered-rows]]
