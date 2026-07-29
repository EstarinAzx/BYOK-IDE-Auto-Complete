---
type: gotcha
project: wisp
updated: 2026-07-29
tags: [context, gotcha, config, windows]
---

# A BOM in `~/.wisp/config.json` silently empties the whole config

**The trap.** A UTF-8 BOM at the start of `config.json` makes Wisp discard the **entire** config — Active
Provider, per-provider models, effort and the whole Routing map — with **exit 0 and nothing on stderr**.
The user silently gets defaults.

Proven against the pure parser:

```
bun -e '
import { parseWispConfig } from "./packages/core/src/home.ts";
const good = JSON.stringify({ provider: "codex", effort: "high",
  routing: { families: { opus: { providerId: "codex", model: "gpt-5.6-sol" } }, aliases: [] } });
console.log("no BOM :", JSON.stringify(parseWispConfig(good)));
console.log("with BOM:", JSON.stringify(parseWispConfig("﻿" + good)));
'

no BOM : {"provider":"codex","effort":"high","routing":{...}}
with BOM: {}
```

**Mechanism.** `WispHome.readConfig` (`homeStore.ts:75`) → `parseWispConfig` (`home.ts:106`) →
`parseObject(raw)`. `JSON.parse` rejects the BOM, `parseObject` swallows the throw and returns undefined, and
`parseWispConfig` returns `{}`. The field-level guards never run — this fails *above* them. The same read
path serves `auth.json`, so a BOM there probably reads as signed-out; unverified.

**Why it bites an agent specifically.** Writing a BOM is the *default* on ordinary Windows paths —
PowerShell 5.1's `Out-File -Encoding utf8` and `Set-Content -Encoding utf8` both emit one. So the natural way
to seed a sandbox `WISP_HOME` from PowerShell produces a config the binary reads as empty, and the command
still exits 0 with plausible-looking output:

```
{ "families": {}, "aliases": [] }
```

That is indistinguishable from "the feature is broken". It cost a verification pass during the 2.0.38 cut
(#173), where an installed-binary check looked like a regression and was not.

**How to avoid it.** Seed sandbox configs from Bash `printf` / `Set-Content -Encoding utf8NoBOM` (PS 7+),
or check first:

```
head -c 3 "$WISP_HOME/config.json" | xxd     # efbbbf means BOM
```

If a routing map "isn't taking", check the BOM **before** suspecting the code. Note `packages/tui/package.json`
*does* carry a BOM and parses fine — Bun's own JSON loader tolerates it, so BOM-tolerance elsewhere in the
repo is not evidence this path tolerates it.

**Status — FIXED in `4ec1a81` (#181), on main, not yet released.** `parseObject` strips a leading BOM before
parsing. Ships on npm in the next `wisp-router` cut; reaches the vsix only via #180.

**The severity was worse than first written, and the reason is worth keeping.** Both stores are
**read-merge-write** (`writeConfig` = `merge(file, readConfig(), patch)`), so the `{}` was not merely *used*
in place of the config — it was **merged with the next patch and written back over the real file**. Measured
pre-fix: a config with two family routes and an alias became `{"effort":"low"}` on disk after one settings
change; `auth.json` became `{"anthropic":{…}}` after one sign-in, erasing every API key and OAuth bundle.
So the user story was not "my routes didn't apply" but "my routes and credentials were deleted, silently, one
change later".

**Still open as #182:** a *genuinely* unparseable store (truncated write, real typo) still degrades to `{}`
and can still be overwritten the same way — same mechanism, rarer trigger. The promising shape there is to
refuse to **write** over contents that did not parse, rather than to make the pure parsers throw.

## Related

- [[gotchas]]
- [[active-work]]
