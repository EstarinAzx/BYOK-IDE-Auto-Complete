---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (relay leg 9 → then a live verification + fix session with the user)._
_At commit: `ab2235b` on main, pushed. **Agent queue empty.**_

## Current focus

**Spec #164 (the CLIProxyAPI harvest) is complete, shipped to all three faces, and every live check passed.**
Nine tickets landed across nine relay legs; then, with the user present, the whole batch was verified against
real bridged sessions, one real bug was found and fixed, and the two non-npm faces were cut.

**What is released right now:**

| Face | Version | Carries |
|---|---|---|
| npm `wisp-router` | **2.0.38** | the harvest — but **NOT #181's data-loss fix** (landed after the cut) → **#183** |
| `wisp` vsix | **1.10.0** | everything, including #181. Installed locally as `esarinazx.wisp@1.10.0` |
| `wisp-slot` plugin | **1.6.0** | #171's statusline reader. Pushed — the user must `/plugin update` |

**The single most important open item is #183** — cut npm 2.0.39. Until then the face with the most users
still has a bug that erases `config.json` / `auth.json`.

## State

- **In flight:** nothing. Working tree clean on main. **Relay chain stopped** (`stop: true`), queue dry.
- **Live verification — all green, on the published 2.0.38:**
  - **#165 ✅** — 7/7 Codex-served turns reported non-zero usage. `cacheW=0` throughout while `cacheR` grew =
    the Responses-wire fingerprint, so the numbers are genuinely the Codex mapping. Read from the Claude Code
    **transcript** (per-session, durable), folded by `message.id`.
  - **#169 ✅** — 2/2 keyed turns (`glm`, `deepseek` → **OpenCode Go**) reported usage; no 400 on
    `stream_options`. ⚠ Both aliases hit the **same Provider row** — one backend verified, not nine.
  - **#171 ✅ (writer)** — `status.json` carried `211214/1000000 → 21%` and meters `5h 55% · 7d 27%`, i.e.
    Anthropic **fractions** correctly normalized to 0..100.
  - **#172 ✅** — `/test` in a throwaway `WISP_HOME` holding only `{"provider":"codex"}` printed
    `/test: Codex (gpt-5.6-sol)` and streamed. Self-verifying: the real machine pins `gpt-5.6-terra`.
  - **#163 → diagnosis confirmed, ticket open.** The 502s were a usage-reporting bug, not a window bug.
    Closing needs a stretch of use with no refusal in the 217k–245k band.
- **Fixed this session:**
  - **#181 ✅ `4ec1a81`** — a UTF-8 BOM made `parseObject` return `{}`, and since both stores are
    **read-merge-write**, the next patch was written back **over the real file**. Measured: a config with two
    families + an alias became `{"effort":"low"}`; `auth.json` lost every key and OAuth bundle after one
    sign-in. One-line BOM strip; 783/783 (+4, including a read-merge-write regression per store).
  - **#180 ✅ `ab2235b`** — vsix 1.9.0 → **1.10.0** (packaged + installed) and `wisp-slot` 1.5.0 → **1.6.0**.
- **User action pending:**
  - **Reload VS Code**, confirm **Kimi** in the picker / native chat and its panel sign-in state.
  - **`/plugin update wisp-slot`** — the install is a **cache snapshot** pinned at `b45c43c4` (2026-07-25),
    not a live pointer at the checkout, so the `ctx …%` badge will not appear until it updates.
  - **#167's last third** — a **Grok** turn (`wisp` → `/test grok`). Codex and Anthropic are covered.
  - **#170's two criteria** — needs a Kimi Code subscription; the sign-in doubles as the unverified-constants
    check.

## Queue

Spec #164: all nine shipped (#165 `1971541`, #166 `07969d2`, #167 `c697733`, #168 `89f94c5`, #169 `7b8d73d`,
#170 `d656686`, #171 `3e0125e`, #172 `49761d8`, #173 `55daebb`/`v2.0.38`).

**Open — no `ready-for-agent` ticket exists:**

| # | Ticket | Note |
|---|---|---|
| **183** | **Cut npm 2.0.39 — carry #181 to npm** | **The priority.** npm users still have the data-loss bug. Mechanically identical to #173. |
| **182** | A genuinely unparseable store still silently resets | The remaining half of #181 — same read-merge-write mechanism, rarer trigger. Needs a design call; the promising shape is refusing to **write** over contents that did not parse. |
| **163** | The 502 observation | Diagnosis confirmed. Open pending a stretch of clean use. |
| **174** | Antigravity Provider | Placeholder, ungroomed. |
| **69** | copilot-wisp launcher | Ungroomed. |

## Pick up here

**#183.** It is a release cut with established mechanics and it closes a real user-facing hole. Everything
else can wait.

Do **not** restart the relay chain expecting work — with no `ready-for-agent` ticket it will pick nothing,
write `queue empty`, and stop.

## Skills for next session

- `/preset pick-up` — session door.
- `packages/tui:verify` — sandboxed CLI verification for TUI command surfaces.
- `/relay N=1 /preset ticket-loop` — only after something is labelled `ready-for-agent`.

## Open questions

- **Do the 502s actually stop?** #163. Watch for refusals in the 217k–245k band. Compaction should now fire,
  so that band may simply stop being reached — that is the fix working, not evidence going missing.
- **Tolerate or fail loud on a genuinely corrupt store?** #182. Today Wisp does neither — it discards and
  overwrites. The shape worth exploring is refusing to *write*, not making the pure parsers throw.
- **Does `auth.json` share every config failure mode?** Same read path and same read-merge-write shape;
  the BOM case is now proven and fixed for both, the corrupt case is not.
- **Does any keyed backend reject `stream_options`?** **OpenCode Go accepts it** (#169, verified). Still
  unexercised: OpenAI, Groq, Mistral, OpenRouter, Ollama, Ollama Cloud, KiloCode, Cline, Custom. A rejection
  is a **400 naming `stream_options`** — loud, not silent — and the fix is a per-row opt-out flag.
- **Should `status.json` be per-session rather than global?** **It bites** — a bridged reader's own turn
  overwrites it, so it cannot observe another session.
  [[status-json-is-global-so-it-cannot-observe-another-session]].
- **Is the 30-minute staleness window right?** Picked cold (#171). Now finally observable, once the plugin is
  updated.
- **Which Codex ids does the ChatGPT-account path accept?** `gpt-5.6-sol` and `gpt-5.4` probed 200;
  `gpt-5.3-codex` and bare `gpt-5.6` probed 400. The rule behind the split is unknown, so the test
  whitelists rather than pattern-matches.
- **Are the #168 retry constants right in production?** Picked cold, never tuned against a real outage.
- **Should the two doors' provider dispatch ever fully merge?** Left open on purpose (#167).

## Related

- [[overview]]
- [[pick-up]]
- [[decisions]]
- [[gotchas]]
- [[2026-07-29-a-release-cut-names-its-surfaces-npm-is-one-of-three]]
- [[a-bom-in-wisp-config-silently-empties-the-whole-config]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
