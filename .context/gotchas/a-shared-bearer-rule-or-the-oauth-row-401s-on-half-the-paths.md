---
type: gotcha
project: wisp
updated: 2026-07-29
tags: [context, gotcha]
---

# The TUI had THREE copies of "resolve this Provider's key" — an OAuth-credentialed row 401s on the ones you miss

**The trap.** `packages/tui/src` resolved a Provider's bearer in **three independent places**, each with its
own inline copy of the same expression:

```ts
home.readAuth().keys?.[resolveKeyId(p)] || (p.apiKeyEnv ? process.env[p.apiKeyEnv] : undefined)
```

- `bridge.ts` → `keyFor` (the Bridge engine's dep)
- `modelFetch.ts` → the live `GET <base>/models` probe, behind `/model <id>` and `wisp models <id>`
- `testScreen.tsx` → `streamTestReply`, behind `/test`

For every Provider that had existed until #170 this was harmless duplication: an API-key row reads the same
map three times, and the three OAuth rows short-circuit **before** reaching it because each of those paths
branches on `isCodexProvider` / `isAnthropicProvider` / `isXaiProvider` first and calls a bespoke client.

**Kimi (#170) is the first row that is OAuth-credentialed but has NO bespoke client** — it deliberately falls
through those chains to the keyed tail. So all three copies matter at once, and fixing only the one you
happened to be looking at produces a **signed-in user who gets a silent 401** from `/model kimi` and
`/test kimi` while the Bridge works fine. The request goes out with **no `Authorization` header at all**,
because `apiKeyEnv` is `''` and the keys map was never written.

**The fix.** One `bearerFor` in `packages/tui/src/store.ts`; all three sites call it.

```ts
export const bearerFor = async (p: Provider): Promise<string> => {
  if (isKimiProvider(p)) return kimiAuth.bearer();
  const stored = home.readAuth().keys?.[resolveKeyId(p)];
  return stored?.trim() || (p.apiKeyEnv ? process.env[p.apiKeyEnv] : '') || '';
};
```

**How to not get bitten again.** Adding a Provider that is *credentialed one way but requested another*?
Grep for **every** site that reads `keys?.[resolveKeyId(` before writing code — the count is the number of
places you must fix, and it is not one. The same shape exists in `packages/vscode/src/extension.ts`, where it
is already centralised as `keyForProvider` (one site, so the extension only needed one edit).

**A related, quieter version of the same trap:** the *messages* about a missing credential were also
duplicated and all said "API key". `core/src/routingCli.ts` (`missingCredentialWarning`) and two
`showWarningMessage` call sites in `extension.ts` each needed the new kind added, or a Kimi user is told to
run **'Wisp: Set API Key'** — a command that writes to a map `keyForProvider` never reads for that row, so
the key is inert and the user is stuck with no way to tell.

## Related

- [[2026-07-29-oauth-credentialed-but-keyed-on-the-wire-resolves-at-the-keyfor-seam]]
- [[gotchas]]
