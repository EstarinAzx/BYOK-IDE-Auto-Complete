# Never overwrite a store we could not parse

Both `~/.wisp` stores are read-merge-write: `writeConfig` is
`merge(file, readConfig(), patch)`. The parsers are total — anything unusable
becomes `{}` — so a file we cannot read is not merely ignored, it is **erased**:
the `{}` is merged with the next patch and written back over the real contents.
One settings change destroys every family route; one sign-in destroys every API
key and OAuth bundle. Silently, exit 0. #181 fixed the commonest cause (a UTF-8
BOM); this ADR fixes the mechanism behind it (#182).

**The write now refuses.** If a store file holds non-whitespace content that does
not parse into an object, `merge` throws instead of writing. Reads stay
permissive, so `wisp` still starts and routes on defaults. "Nothing there"
(absent, empty, whitespace) is not that case and stays writable — otherwise the
refusal would brick first run.

The pure layer keeps its total contract. The bit the parsers discard — *was
there content we failed to understand?* — is exposed as its own predicate,
`isUnusableStore`, so the store layer can refuse exactly that case and the
parsers' six callers are untouched.

Considered and rejected:

- **Make `parseWispConfig` / `parseWispAuth` throw.** Six callers, each of which
  would then need its own policy, and it breaks reads as well as writes — a
  corrupt file would stop `wisp` from starting at all.
- **Refuse to start.** Honest but harsh: a corrupt config would make the product
  unusable for someone who only wanted to sign in again.
- **Warn and continue.** `WispHome` has no log sink, and a warning nobody reads
  still ends with the file overwritten. It does not fix the data loss.
- **Back up to `config.json.corrupt`, then write fresh.** Friendlier, and no data
  is lost — but the user still lands on defaults, which is the complaint itself.
  It also invents a naming and cleanup policy. The refusal is the safety
  property; this is ergonomics that can layer on top later if the throw proves
  too harsh in practice.

Consequences: `writeConfig` / `writeAuth` gain a new throw condition, but not a
new *contract* — `writeRaw` already throws on ENOSPC/EPERM, and callers already
live with that (`extension.ts`: `if (next) home.writeAuth(next); // throws →
slots stay put, retried next launch`). No call site changed. The extension's
activation path is unaffected: its config seed is guarded by `!configExists()`,
and a corrupt file exists, while the secrets migration already runs inside a
`try` that logs and continues.

A refused write surfaces as whatever the caller does with a thrown write. On the
TUI's command paths that is currently an unhandled-error dump with a stack trace
— legible, exit 1, and identical to how an ENOSPC has always surfaced there.
Making those paths print a bare one-line error is a separate, cross-cutting
change and was left out of this one.
