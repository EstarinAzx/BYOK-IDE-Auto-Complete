---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (relay leg 9 — #173 landed; **spec #164 complete**)._
_At commit: `55daebb` on main, pushed, tag `v2.0.38`. **The agent queue is empty.**_

## Current focus

**Nothing in flight. The CLIProxyAPI harvest is shipped and spec #164 is done.** Legs 1–9 landed all nine
tickets — #165 (Responses-wire usage), #166 (error classification), #167 (the ProviderExecutor seam), #168
(retry + transient cooldown), #169 (API-key usage), #170 (the Kimi Provider), #171 (the live statusline),
#172 (the Codex default model) and #173 (the release cut). Every leg gate-green.

**`wisp-router@2.0.38` is live on npm.** Workflow run `30422101844` succeeded on all four platform runners;
verified by a real install into a scratch dir (2 packages — thin shell + platform binary) with both bins
executed.

**The decisive live check is still outstanding, and now nine shipped tickets ride on it.** See *User action
pending*.

## State

- **In flight:** nothing. Working tree clean on main. **Relay chain stopped** — the agent queue is dry.
- **Done this session (relay leg 9):**
  - **#173 landed** — `55daebb` on main, tag `v2.0.38`, direct-commit release convention (no PR, matching
    `b25e862`), ticket closed with every acceptance criterion checked.
  - **Gate before cutting:** 779/779 tests, root `bun run compile` clean, `packages/tui` `bun run compile`
    clean, plus `packages/tui:verify` — renderer-free `routing` / `routing --json` exit 0, and `claude-wisp`
    exits 1 with the Bridge guidance, the same assertion CI's smoke test makes.
  - **Post-publish verification:** installed `wisp-router@2.0.38` from npm into a scratch dir and ran both
    bins — the negative path (Bridge guidance, exit 1) and a positive one (`wisp routing --json` returning a
    seeded map).
  - **The load-bearing call: a release names its surfaces.** npm is one of **three** faces, and the other two
    get nothing from an npm publish. Recorded as
    [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]].
  - **Two bumps ruled owed and deliberately not cut** → **#180** (`ready-for-human`): the **vsix** (four
    tickets changed extension-face code, and the extension bundles its own copy of `@wisp/core`) and the
    **`wisp-slot` plugin** (#171's *reader* half ships through the marketplace; `3e0125e` changed the script
    without bumping `plugin.json`, so **1.5.0 now means two different things**).
  - **A real bug found while verifying** → **#181** (`ready-for-human`): a **BOM in `~/.wisp/config.json`
    silently discards the entire config** — provider, models, effort, the whole Routing map — exit 0, no
    stderr. Pre-existing, not from this cut.
    [[a-bom-in-wisp-config-silently-empties-the-whole-config]].
  - **`overview.md` corrected** — it still said 13 built-ins / four Provider kinds; #170 made it **14 +
    Custom and five kinds**. Counted from `PROVIDERS`, not guessed.
- **User action pending** (all want the **same session** — one Bridge restart covers the first four):
  - **Verify #165 live** — restart the Bridge on this build, bridge a Codex session, read `/context`. This is
    the #163 verdict; see [[pick-up]] for what each outcome means.
  - **Verify #171 live** — same trip: a real turn should leave `~/.wisp/status.json`. ⚠ The `ctx …%` badge
    will **not** appear until the `wisp-slot` plugin is bumped (#180) — the reader half is not shipped yet.
    Judge #171 by the file, not the badge.
  - **Verify #169 live** — a bridged session on the **default** Provider (OpenCode Go) must report non-zero
    tokens in `/context`. Run it through Claude Code / the Anthropic door, not curl against
    `/v1/chat/completions` (the OpenAI door deliberately drops usage events). Watch for a **400 naming
    `stream_options`** rather than silence.
  - **Verify #172 live** — a fresh Codex sign-in that never picks a model completes a turn.
  - **#167's manual criterion** — one turn each through Codex, Anthropic and Grok.
  - **#170's two open criteria** — needs a Kimi Code subscription; the sign-in attempt doubles as the
    unverified-constants check.
  - **Install `packages/vscode/wisp-1.9.0.vsix`** (carried over, still not done — #180 supersedes it with a
    newer bump).

## Queue — agent queue empty

Spec #164 complete. All nine tickets shipped:

| # | Ticket | Landed |
|---|---|---|
| ~~165~~ | ~~Codex and Grok turns report real token usage~~ | `1971541` |
| ~~166~~ | ~~Codex failures classified into real HTTP statuses~~ | `07969d2` |
| ~~167~~ | ~~Collapse three Bridge handlers into one ProviderExecutor record~~ | `c697733` |
| ~~168~~ | ~~Transient failures retried and cooled down~~ | `89f94c5` |
| ~~169~~ | ~~API-key Providers report real token usage~~ | `7b8d73d` |
| ~~170~~ | ~~Kimi Provider via device flow~~ | `d656686` |
| ~~171~~ | ~~Statusline: live context percentage + quota meters~~ | `3e0125e` |
| ~~172~~ | ~~Codex Provider default model rejected by ChatGPT-account path~~ | `49761d8` |
| ~~173~~ | ~~Cut `wisp-router` 2.0.38 — ship the harvest~~ | `55daebb` / `v2.0.38` |

**Open, awaiting a human — no `ready-for-agent` ticket exists:**

| # | Ticket | Why it needs a human |
|---|---|---|
| **180** | Ship the harvest to the vsix + `wisp-slot` plugin | Two more outward-facing publishes #173 never authorized; one criterion (install the `.vsix` in a real host) is unreachable unattended. Flip to `ready-for-agent` to pre-stage the bumps, changelogs and `bun run package`. |
| **181** | BOM in `config.json` silently empties the whole config | Small and agent-doable; the open question filed with it is a design call — tolerate the BOM or **fail loud**? Today it does neither. |
| **163** | The 502 observation | #165+#166 are its candidate fix. **Leave open until the live `/context` check runs.** |
| **69** | copilot-wisp launcher | Ungroomed. |

## Pick up here

**No agent work is queued.** The highest-value next move is a human one: the **live Bridge session** that
settles #163/#165 and covers #169, #171 and #172 in one trip. After that, triage #180 and #181 — both are
`ready-for-human` only to stop the relay auto-grabbing them, and #181 in particular is a small, safe,
agent-sized fix the moment you flip its label.

Do **not** restart the relay chain expecting work: with no `ready-for-agent` ticket it will pick nothing,
write `queue empty`, and stop.

## Skills for next session

- `/preset pick-up` — session door.
- `packages/tui:verify` — sandboxed CLI verification for TUI command surfaces. ⚠ Seed the sandbox config
  from Bash, **not** PowerShell `Out-File -Encoding utf8` — see
  [[a-bom-in-wisp-config-silently-empties-the-whole-config]].
- `/relay N=1 /preset ticket-loop` — only after something is labelled `ready-for-agent`.

## Open questions

- **Does #165 actually kill the 502s?** Still THE decisive test, now carrying nine shipped tickets. If it
  does not, the tighter-OAuth-cap hypothesis is back — and #166 means the next failure arrives as a **400
  naming the cause** rather than an opaque 502, with #168 having retried it three times first.
- **Tolerate a BOM or fail loud on an unparseable config?** Filed with #181. Today Wisp does neither — it
  discards the config and continues silently.
- **Does `auth.json` have the same BOM behaviour?** Same read path, unverified. A wiped `auth.json` would
  read as signed-out.
- **Is the 30-minute staleness window on the statusline snapshot right?** Picked cold (#171). One constant in
  `wisp-statusline.js`; revisiting it needs #180 shipped first.
- **Should the snapshot be per-session rather than global?** `status.json` is one file per machine, so two
  concurrent bridged sessions overwrite each other. The model-match guard hides most of it; two sessions on
  the SAME family still cross. Deliberately unsolved — no evidence it bites yet.
- **Which Codex ids does the ChatGPT-account path actually accept?** Only `gpt-5.6-sol` and `gpt-5.4` probed
  200; `gpt-5.3-codex` and bare `gpt-5.6` probed 400. The rule behind the split is unknown, so the test
  whitelists rather than pattern-matches.
- **Does any keyed backend reject `stream_options`?** New with #169, unverified live. If one does, the fix is
  a per-row opt-out flag, not removing the opt-in.
- **Are the #168 constants right in production?** 3 attempts / 200ms base / 30s cooldown after 3 failed
  requests in 120s, picked cold. Revisit after the first real transient event (grep `#168`).
- **Should the two doors' provider dispatch ever fully merge?** Left open on purpose (#167).

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
