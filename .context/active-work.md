---
type: active-work
project: wisp
updated: 2026-07-29
tags: [context, active-work]
---

# Active Work

_Last updated: 2026-07-29 by Opus 5 (release session: #183, the npm cut)._
_At commit: `819900b` on main, pushed, tag `v2.0.39`. **Agent queue empty.**_

## Current focus

**Nothing is in flight, and for the first time in this arc no face is missing a shipped fix.** Spec #164 (the
CLIProxyAPI harvest) closed last session; this session cut **npm `wisp-router` 2.0.39** (#183), which carried
#181's data-loss fix to the last face that lacked it.

**What is released right now:**

| Face | Version | Carries |
|---|---|---|
| npm `wisp-router` | **2.0.39** | the harvest **and** #181. Nothing owed |
| `wisp` vsix | **1.10.0** | everything, including #181. Installed locally as `esarinazx.wisp@1.10.0` |
| `wisp-slot` plugin | **1.6.0** | #171's statusline reader. Pushed — the user must `/plugin update` |

No release debt. The next piece of work is a **choice**, not a queue item — see *Queue*.

## State

- **In flight:** nothing. Working tree clean on main. **Relay chain stopped** (`stop: true`), queue dry.
- **#183 ✅ `819900b` / `v2.0.39`** — release green on all four native runners + publish; `latest` is 2.0.39.
  Gate before the cut: **783/783 tests, `bun run compile` clean in both packages.**
  - **Verified past the registry read, with a control.** The same BOM'd `config.json` plus one unrelated
    `wisp routing set haiku codex/gpt-5.6-sol`, run against the *published* tarballs: **2.0.38 erased**
    `provider`, `effort` and the pre-existing `opus` route; **2.0.39 kept all three**. The control failing is
    the load-bearing half — a plain *read* check is green on both, because pre-fix the read returned `{}` with
    exit 0. [[verifying-a-fix-release-needs-the-previous-version-as-a-control]].
- **Live verification of the harvest — all green** (done last session against published 2.0.38):
  - **#165 ✅** — 7/7 Codex-served turns reported non-zero usage; `cacheW=0` while `cacheR` grew = the
    Responses-wire fingerprint. Read from the per-session Claude Code **transcript**, folded by `message.id`.
  - **#169 ✅** — 2/2 keyed turns (`glm`, `deepseek` → **OpenCode Go**) reported usage; no 400 on
    `stream_options`. ⚠ Both aliases hit the **same Provider row** — one backend verified, not nine.
  - **#171 ✅ writer AND reader — the badge is confirmed live.** The writer put
    `163855/1000000 → 16%` + meters `5h 63% · 7d 27%` in `status.json`; the reader rendered
    `[WISP opus→claude-opus-5 ctx 17% 5h 63% 7d 27%]`. **Correction to last session's diagnosis:** the badge
    was never gated on `/plugin update`. `~/.claude/hooks/statusline-wrapper.ps1` runs the **repo checkout**
    copy of `wisp-statusline.js` on purpose, so the stale 1.5.0 plugin cache never fed it — it had the reader
    from `3e0125e` onward. [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]].
  - **#167 ✅ complete** — the last third is covered: a **Grok** turn streamed a reply (user-confirmed
    2026-07-29). All three OAuth kinds have now driven a turn through the unified `ProviderExecutor` records.
  - **#172 ✅** — `/test` in a throwaway `WISP_HOME` printed `/test: Codex (gpt-5.6-sol)` and streamed.
  - **#163 → diagnosis confirmed, ticket open.** The 502s were a usage-reporting bug, not a window bug.
- **User action pending — down to one:**
  - **#170's two criteria** — needs a **Kimi Code subscription**; the sign-in doubles as the
    unverified-constants check (auth host, client id, endpoints were never verified offline and fail loud at
    sign-in with the server's own words). Nothing else is waiting on the user.
  - _Done 2026-07-29:_ `/plugin update wisp-slot` (cache now 1.6.0, byte-identical to the repo copy) and the
    Grok turn. The VS Code reload / Kimi picker check is folded into #170 above — it cannot be finished
    without the subscription anyway.

## Queue

Spec #164: all nine shipped (#165 `1971541`, #166 `07969d2`, #167 `c697733`, #168 `89f94c5`, #169 `7b8d73d`,
#170 `d656686`, #171 `3e0125e`, #172 `49761d8`, #173 `55daebb`/`v2.0.38`), plus the follow-ups #181 `4ec1a81`,
#180 `ab2235b` and #183 `819900b`/`v2.0.39`.

**Open — no `ready-for-agent` ticket exists. Nothing is urgent; pick by appetite:**

| # | Ticket | Note |
|---|---|---|
| **182** | A genuinely unparseable store still silently resets | The remaining half of #181 — same read-merge-write mechanism, rarer trigger. **Needs a design call before code**; the promising shape is refusing to **write** over contents that did not parse. The best-understood item here. |
| **163** | The 502 observation | Diagnosis confirmed. Open pending a stretch of clean use in the 217k–245k band. Closing it is *waiting*, not working. |
| **174** | Antigravity Provider | Placeholder, ungroomed. Needs `/preset init` or a grill before it is a ticket. |
| **69** | copilot-wisp launcher | Ungroomed. |

## Pick up here

**No forced move.** The release debt that drove the last three sessions is paid.

Best default is **#182** — it is the only open item with a known mechanism and a real user cost, and it is a
*design* question first (fail loud vs. refuse-to-write), so it wants a grill or a short spec before code, not
a ticket-loop. Everything else is either waiting on time (#163) or ungroomed (#174, #69).

Do **not** restart the relay chain expecting work — with no `ready-for-agent` ticket it will pick nothing,
write `queue empty`, and stop.

## Skills for next session

- `/preset pick-up` — session door.
- `packages/tui:verify` — sandboxed CLI verification for TUI command surfaces (isolated `WISP_HOME`).
- `grill-me` / `/preset init` — the right shape for #182's design call and for grooming #174.
- `/relay N=1 /preset ticket-loop` — only after something is labelled `ready-for-agent`.

## Open questions

- **Tolerate or fail loud on a genuinely corrupt store?** #182, and now the top open question. Today Wisp
  does neither — it discards and overwrites. The shape worth exploring is refusing to *write*, not making the
  pure parsers throw (six callers depend on the current total contract).
- **Do the 502s actually stop?** #163. Watch for refusals in the 217k–245k band. Compaction should now fire,
  so that band may simply stop being reached — that is the fix working, not evidence going missing.
- **Does `auth.json` share every config failure mode?** Same read path and same read-merge-write shape; the
  BOM case is now proven and fixed for both, the corrupt case is not.
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
- [[verifying-a-fix-release-needs-the-previous-version-as-a-control]]
- [[the-wisp-badge-runs-from-the-repo-checkout-not-the-plugin-cache]]
- [[status-json-is-global-so-it-cannot-observe-another-session]]
