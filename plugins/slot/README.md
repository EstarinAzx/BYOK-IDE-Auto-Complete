# wisp-slot

Claude Code plugin for sessions bridged through the [Wisp](https://github.com/EstarinAzx/Wisp-Router) Bridge.

## What it ships

- **`slot` skill** — the safe rebind→spawn→restore procedure for running a subagent on any Wisp Target through a temporarily rebound Claude family route. It drives `wisp snapshot` / `wisp snapshot revert` (wisp-router 2.0.24+): snapshot the family row, bind, spawn, hold, revert. Supports **parallel Slots**: one family per distinct Target, up to 4 at once (`haiku`/`sonnet`/`opus`/`fable`), each with its own snapshot and independent revert.
- **SessionStart hook** — a bridged session announces it: routing awareness ("family names resolve through the Wisp Routing map"), a live family-route snapshot, the headless CLI cheat sheet (`wisp routing` / `wisp providers` / `wisp models <provider>`), and a warning listing any held row Snapshots in the Wisp store (`~/.wisp/config.json`). Sessions not bridged through Wisp get nothing.
- **Statusline block** (opt-in wiring, see below) — a multi-row panel: the route row (family → Target, context fill, Provider), a bar per quota window with its reset time, and a dimmed row per other Provider the quota ledger remembers. Refreshed live, so a mid-session Slot rebind is visible. `!SNAP` appears while a Snapshot is held (`!SNAP×N` for N concurrent snapshots). Degrades row by row when resolution fails; absent when not bridged.
  - **The readings need a matching Wisp** (1.6.0, #171). `ctx` is the turn's real token usage against the model's window; `5h`/`7d` are the account's quota utilization. The Bridge writes them to `~/.wisp/status.json` after each bridged turn and this script reads them back — so they need **`wisp-router` ≥ 2.0.38** (or a vsix ≥ 1.10.0 hosting the Bridge). The remembered-Provider rows need **≥ 2.0.42**, which is when the Bridge started keeping a ledger instead of overwriting it. On an older Wisp the block simply shows fewer rows rather than breaking.
  - **Nothing is synthesized.** A Provider reporting no usage or no quota headers yields fewer rows, and API-key Providers get **no `ctx` reading at all** — their context window is only known from models.dev, which the Bridge does not fetch per turn, so a percentage would be a confident wrong number. `ctx` is also deliberately **unclamped**: `ctx 122%` means a conversation already past its window and doomed upstream, which is worth seeing *before* the request fails.
  - A snapshot older than 30 minutes, or one whose model does not match this session's resolved Target, loses its `ctx` reading — that number would describe a different conversation. Its **quota** rows survive as remembered ones, stamped with their age: a window belongs to the account, not to the conversation. Entries stop showing after 24 hours.

Bridged detection = `ANTHROPIC_BASE_URL` set **and** the Wisp home directory exists (`WISP_HOME` env override honored, default `~/.wisp`).

## Install

```
/plugin marketplace add EstarinAzx/Wisp-Router
/plugin install wisp-slot@wisp-router
```

The hook activates on its own. The status block needs one wiring step:

## Statusline wiring

Claude Code has a single `statusLine` command; the block is a script yours calls. It reads the statusline stdin JSON, so pass stdin through.

It prints a **multi-row block**, not an inline badge:

```
wisp │ fable → claude-fable-5 │ ctx 38% │ anthropic
  5h  ●○○○○○○○○○   11%  ↻ 2:46pm
  7d  ●●●●●●●●●○   85%  ↻ Sun 1:46pm
  codex  7d 7% · 5h 0%   3h ago
```

Row 1 is the route: the Claude family, the Wisp Target it is bound to, this conversation's context fill, and the Provider serving it. Below it, one bar per quota window the active Provider reported — percentage plus when it refills. The dimmed tail rows are other Providers the ledger remembers, stamped with how old the reading is; they are limits you are not spending right now, never presented as current.

So it goes **last** in your statusline and opens its own line. The script emits no leading newline — the composing statusline owns that — and prints nothing at all when the session isn't bridged, so test before adding the break.

POSIX shell statusline:

```sh
input=$(cat)
# ... your existing segments ...
wisp=$(echo "$input" | node "$HOME/.claude/plugins/marketplaces/wisp-router/plugins/slot/statusline/wisp-statusline.js")
[ -n "$wisp" ] && printf '\n%s' "$wisp"
```

PowerShell statusline:

```powershell
$input_json = [Console]::In.ReadToEnd()
# ... your existing segments ...
$wisp = ($input_json | node "$HOME\.claude\plugins\marketplaces\wisp-router\plugins\slot\statusline\wisp-statusline.js") -join "`n"
if ($wisp) { [Console]::Write("`n" + $wisp) }
```

Adjust the path if your marketplace install location differs. No statusline configured yet? Point `statusLine.command` in `~/.claude/settings.json` straight at the node call — the block stands alone, no leading newline needed.
