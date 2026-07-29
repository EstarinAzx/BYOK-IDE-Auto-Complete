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

**The decisive live check RAN, and it passed.** A bridged Codex session (`sonnet` → `codex/gpt-5.6-sol`) on
2.0.38 reports **non-zero usage on 7/7 turns**, with the Responses-wire signature (`cacheW` always 0 while
`cacheR` grows) proving the numbers come from the Codex mapping and not from Anthropic usage leaking in.
**#165's last criterion is met and #163's diagnosis is confirmed** — the 502s were a usage-reporting bug, not
a window bug, and the tighter-OAuth-cap hypothesis is not needed. **#171's writer half is verified too** —
`status.json` carried real numbers with the arithmetic and the fraction→percent normalization correct.

**#163 stays open on purpose:** the mechanism is confirmed, the *outcome* is not. Proving a 15-occurrence
cluster stopped is a matter of living on this build, not of one more session.

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
- **Verified live 2026-07-29 on 2.0.38** (user ran the session; evidence recorded on the tickets):
  - **#165 ✅** — 7/7 Codex-served turns report non-zero usage. `cacheW=0` throughout with `cacheR` growing =
    the Responses-wire fingerprint, so the numbers are genuinely the Codex mapping. Read from the **Claude
    Code transcript** (per-session, durable), folded by `message.id`.
  - **#171 ✅ (writer half)** — `status.json` carried `contextTokens 211214 / 1000000 → 21%` and meters
    `5h 55% · 7d 27%`, i.e. Anthropic **fractions** correctly normalized to 0..100. The *reader* half is
    still unshipped (#180), so **no `ctx …%` badge appears yet** — judge by the file, not the badge.
  - **#169 ✅** — two keyed turns (`glm`, `deepseek`, both → **OpenCode Go**) reported non-zero usage:
    `in=37729 out=4 cacheR=384` and `in=38758 out=44`. `cacheW=0` on both and `glm`'s cached tokens landing
    in the cache-read tier = `chatCompletionsUsage` working. Both turns completed normally, so **no 400 on
    `stream_options`** from that backend. ⚠ Both aliases resolve to the **same Provider row** — one backend
    verified, not nine.
  - **#163 → diagnosis confirmed, ticket left open.** Closing it needs a stretch of use with no refusal in
    the 217k–245k band, not another check.
- **User action still pending:**
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
| **163** | The 502 observation | **Diagnosis confirmed live** (#165's usage now flows). Stays open until a stretch of use shows no refusal in the 217k–245k band — absence of a 15-occurrence cluster can't be proven in one session. |
| **69** | copilot-wisp launcher | Ungroomed. |

## Pick up here

**No agent work is queued.** The big live check is **done and passed** (#165, #171). What is left is small:
one bridged turn on a **keyed** Provider for #169 (a `glm` or `deepseek` alias), and a fresh Codex sign-in
for #172. Then triage #180 and #181 — both are `ready-for-human` only to stop the relay auto-grabbing them,
and #181 in particular is a small, safe, agent-sized fix the moment you flip its label.

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
- **Should the snapshot be per-session rather than global?** **Now has evidence — it bites.** `status.json` is
  one file per machine, and while verifying #165 from a *second* bridged session every read came back
  `anthropic/claude-opus-5` because the reading session's own turn had overwritten it microseconds earlier.
  Two bridged sessions clobber each other **continuously, not occasionally**. The model-match guard hides
  cross-family clobbering from the *badge* but does not stop the *write*, so the file only ever describes the
  most recent turn on the machine. Fine for the statusline's real purpose (one session, its own badge); useless
  for anything that wants to **observe** a session. [[status-json-is-global-so-it-cannot-observe-another-session]].
- **Which Codex ids does the ChatGPT-account path actually accept?** Only `gpt-5.6-sol` and `gpt-5.4` probed
  200; `gpt-5.3-codex` and bare `gpt-5.6` probed 400. The rule behind the split is unknown, so the test
  whitelists rather than pattern-matches.
- **Does any keyed backend reject `stream_options`?** **Partly answered — OpenCode Go accepts it** (#169
  verified live 2026-07-29, two turns, no 400). That is the default Provider and the most-used path. Still
  unexercised: **OpenAI, Groq, Mistral, OpenRouter, Ollama, Ollama Cloud, KiloCode, Cline, Custom**. A
  rejection would be a **400 naming `stream_options`** on every turn for that row — loud, not silent — and
  the fix is a per-row opt-out flag, not removing the opt-in for everyone.
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
- [[status-json-is-global-so-it-cannot-observe-another-session]]
