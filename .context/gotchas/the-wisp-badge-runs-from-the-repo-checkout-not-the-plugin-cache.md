---
type: gotcha
project: wisp
updated: 2026-07-30
tags: [context, gotcha, statusline, plugin, wisp-slot]
---

# The wisp badge runs from the repo checkout, not the plugin cache

**The trap.** Diagnosing the `ctx …%` statusline badge by inspecting the installed `wisp-slot` plugin cache
is reading the wrong file. On this machine the statusline wrapper points the wisp badge at the **repo
checkout**, on purpose:

```powershell
# ~/.claude/hooks/statusline-wrapper.ps1
# Wisp badge — node script from the Wisp repo checkout (stable path; the plugin
# cache path is per-version). Prints nothing when the session isn't bridged.
$Wisp = "D:\.claude\claude projects\autocomplete_extension\plugins\slot\statusline\wisp-statusline.js"
```

So the badge tracks whatever is checked out, and a stale `~/.claude/plugins/cache/wisp-router/wisp-slot/<v>/`
is **irrelevant to it**. `/plugin update wisp-slot` changes the cache; it does not change what the statusline
executes.

**How it bit.** During the 2026-07-29 harvest verification, the plugin cache was found pinned at 1.5.0
(commit `b45c43c4`), whose `wisp-statusline.js` has **zero** references to `status.json` / `contextPercent` /
`meters`. That observation was correct. The conclusion drawn from it — "the `ctx …%` badge will not appear
until the user runs `/plugin update`" — was **wrong**, and rode in the handoff note as a blocker for a whole
session. The repo copy had carried the reader since #171 landed (`3e0125e`), so the badge was working the
entire time.

**Verified after the update:** repo script and cached 1.6.0 are byte-identical (`diff -q` → no output), and
the repo script rendered a live badge:

```bash
echo '{"model":{"id":"claude-opus-5","display_name":"Opus 5"}}' \
  | ANTHROPIC_BASE_URL=http://127.0.0.1:8787 node plugins/slot/statusline/wisp-statusline.js
# [WISP opus→claude-opus-5 ctx 17% 5h 63% 7d 27%]
```

**How to check it properly.** Read `~/.claude/hooks/statusline-wrapper.ps1` first to find which file the
badge actually runs, then test that file directly with the command above. The script exits 0 silently unless
**both** `ANTHROPIC_BASE_URL` is set and `$WISP_HOME` exists — so an unbridged shell renders nothing, which
looks identical to a broken badge.

**What the plugin cache version *does* govern:** everything else `wisp-slot` ships through the marketplace —
the `slot` skill, hooks, commands — and the badge on any machine that does *not* have this custom wrapper.
So keeping the plugin current still matters; it just is not the badge's input here.

**Confirmed again 2026-07-30, in the mirror image.** The badge became a multi-row **block** (`wisp-slot`
1.7.0) and the user saw it on their very next repaint, while the install record still read **1.6.0** and the
cached copy still held the old badge (`Wisp badge for a composed statusline`, zero hits on the new markers).
Same mechanism, opposite direction: last time the cache made a working badge look broken, this time it would
have made a shipped redesign look un-shipped. The version record disagreeing with the checkout is the normal
state here, not a symptom.

**The wrapper is outside the repo, so a shape change needs an edit no commit contains.** Going badge → block
required `statusline-wrapper.ps1` to stop appending a space and start capturing the output to prefix a
newline only when non-empty:

```powershell
$WispBlock = ($StatuslineJson | & "C:\Program Files\nodejs\node.exe" $Wisp) -join "`n"
if ($WispBlock) { [Console]::Write("`n" + $WispBlock) }
```

Without the emptiness test an unbridged session costs a blank statusline row. The script deliberately emits
**no leading newline** of its own — the composing statusline owns layout — so any future change to how the
block starts is a two-file change, one of which is untracked.

## Related

- [[gotchas]]
- [[an-empty-quota-ledger-is-usually-correct-not-broken]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
- [[active-work]]
