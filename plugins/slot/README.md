# wisp-slot

Claude Code plugin for sessions bridged through the [Wisp](https://github.com/EstarinAzx/Wisp-Router) Bridge.

## What it ships

- **`slot` skill** — the safe rebind→spawn→restore procedure for running a subagent on any Wisp Target through a temporarily rebound Claude family route. It drives `wisp snapshot` / `wisp snapshot revert` (wisp-router 2.0.24+): snapshot the family row, bind, spawn, hold, revert. Supports **parallel Slots**: one family per distinct Target, up to 4 at once (`haiku`/`sonnet`/`opus`/`fable`), each with its own snapshot and independent revert.
- **SessionStart hook** — a bridged session announces it: routing awareness ("family names resolve through the Wisp Routing map"), a live family-route snapshot, the headless CLI cheat sheet (`wisp routing` / `wisp providers` / `wisp models <provider>`), and a warning listing any held row Snapshots in the Wisp store (`~/.wisp/config.json`). Sessions not bridged through Wisp get nothing.
- **Statusline badge** (opt-in wiring, see below) — `[WISP fable→gpt-5.6-terra ctx 21% 5h 55% 7d 27%]`: what the session's model *actually* resolves to right now, refreshed live so a mid-session Slot rebind is visible. `!SNAP` appears while a Snapshot is held (`!SNAP×N` for N concurrent snapshots). Falls back to `[WISP]` when resolution fails; absent when not bridged.
  - **The readings need a matching Wisp** (1.6.0, #171). `ctx` is the turn's real token usage against the model's window; `5h`/`7d` are the account's quota utilization. The Bridge writes them to `~/.wisp/status.json` after each bridged turn and this script reads them back — so they need **`wisp-router` ≥ 2.0.38** (or a vsix ≥ 1.10.0 hosting the Bridge). On an older Wisp the badge simply keeps its pre-1.6.0 shape rather than breaking.
  - **Nothing is synthesized.** A Provider reporting no usage or no quota headers yields a shorter badge, and API-key Providers get **no `ctx` reading at all** — their context window is only known from models.dev, which the Bridge does not fetch per turn, so a percentage would be a confident wrong number. `ctx` is also deliberately **unclamped**: `ctx 122%` means a conversation already past its window and doomed upstream, which is worth seeing *before* the request fails.
  - A snapshot older than 30 minutes, or one whose model does not match this session's resolved Target, is ignored — either way the number would describe a different conversation.

Bridged detection = `ANTHROPIC_BASE_URL` set **and** the Wisp home directory exists (`WISP_HOME` env override honored, default `~/.wisp`).

## Install

```
/plugin marketplace add EstarinAzx/Wisp-Router
/plugin install wisp-slot@wisp-router
```

The hook activates on its own. The badge needs one wiring step:

## Statusline wiring

Claude Code has a single `statusLine` command; the badge is a script yours calls. It reads the statusline stdin JSON, so pass stdin through.

POSIX shell statusline:

```sh
input=$(cat)
# ... your existing segments ...
printf '%s ' "$(echo "$input" | node "$HOME/.claude/plugins/marketplaces/wisp-router/plugins/slot/statusline/wisp-statusline.js")"
```

PowerShell statusline:

```powershell
$input_json = [Console]::In.ReadToEnd()
# ... your existing segments ...
$input_json | node "$HOME\.claude\plugins\marketplaces\wisp-router\plugins\slot\statusline\wisp-statusline.js"
[Console]::Write(" ")
```

Adjust the path if your marketplace install location differs. No statusline configured yet? Point `statusLine.command` in `~/.claude/settings.json` straight at the node call.
