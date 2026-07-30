---
type: gotcha
project: wisp
date: 2026-07-30
tags: [context, gotcha, verification, bridge, sandbox]
---

# A sandboxed live check needs a copied auth.json, and dies by port — not by pkill

Driving a real turn is mandatory before calling a Provider ticket done ([[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]] and its converse), and the machine is usually already serving a **real** Bridge on `127.0.0.1:41184` that the current session depends on. So the check runs in a sandbox:

1. `mktemp -d` for a throwaway `WISP_HOME`.
2. **Copy** `~/.wisp/auth.json` in — never read the real one in place. Token refresh writes back, and a refresh landing in the real store mid-session is a credential mutation you did not intend.
3. Write a sandbox `config.json` (⚠ **no BOM** — see [[a-bom-in-wisp-config-silently-empties-the-whole-config]]).
4. Start the host on a **spare port**, never 41184.

The sandbox then absorbs everything the check produces: refreshed tokens, its own bridge secret, and the #171 `status.json` snapshot — which matters because that file is global and would otherwise clobber the live one ([[status-json-is-global-so-it-cannot-observe-another-session]]).

**The trap is the teardown.** `pkill -f "index.tsx serve"` did **not** kill the sandbox host — the pattern does not match how the process actually presents. Worse, a broad pattern risks killing the real Bridge instead, which silently breaks the session you are working in.

Find the sandbox host **by its port**, stop that pid, then **confirm 41184 is still alive** before moving on. A teardown is not done until the real Bridge has been re-verified.

## Related

- [[gotchas]]
- [[a-live-negative-on-this-wire-is-usually-the-fixture-or-the-model]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
