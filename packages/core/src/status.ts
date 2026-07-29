// ---------------- status.ts — Wisp: the statusline snapshot (context reading + quota meters) ---------------- //

/*
 * Depends on:
 *   - ./catalog — the Provider row type ONLY (import type, erased at runtime), same one-way rule as codex.ts.
 *   - ./shared — BridgeUsage, the real token counts every Provider now reports (#165 + #169).
 *   - ./codex / ./anthropic / ./xai — the kind guards + the OFFLINE model-window tables.
 *
 * Data shapes:
 *   - QuotaMeter: one utilization window, normalized to a 0..100 percent whatever the wire said.
 *   - WispStatus: what the Bridge drops in ~/.wisp/status.json after a bridged turn, and the statusline
 *     script reads back. Every field past updatedAt/providerId/model is OPTIONAL on purpose — a missing
 *     field renders as a missing field, never as a zero (#171: a fabricated reading is worse than a blank).
 *
 * The two upstreams report utilization in different shapes and different UNITS (Anthropic a 0..1 fraction
 * over named windows, Codex an integer percent over primary/secondary whose size only *-window-minutes
 * reveals). Both are normalized here so the statusline renders one vocabulary, and neither parser guesses:
 * a header that isn't there produces no meter at all.
 */

import type { Provider } from './catalog';
import { isCodexProvider, codexModelCaps } from './codex';
import { isAnthropicProvider, anthropicModelCaps } from './anthropic';
import { isXaiProvider, xaiModelCaps } from './xai';
import type { BridgeUsage } from './shared';

// ----------------------------- Shapes ----------------------------- //

// One quota window as the statusline renders it. percent is 0..100 on BOTH Providers (see the parsers);
// resetAt is epoch SECONDS, absent when the upstream didn't say.
export type QuotaMeter = { label: string; percent: number; resetAt?: number };

// The snapshot written after a bridged turn. contextTokens/contextWindow/contextPercent travel together —
// all three or none — so a reader can show the raw counts or the percentage without recomputing either.
export type WispStatus = {
  updatedAt: number;      // epoch MS — the reader ages the snapshot out rather than showing a stale turn
  providerId: string;
  model: string;          // the RESOLVED Target model, which is what the statusline names
  contextTokens?: number;
  contextWindow?: number;
  contextPercent?: number;
  meters?: QuotaMeter[];
};

// ----------------------------- Window labels ----------------------------- //

// A window's size in minutes → the short label the statusline shows. undefined for 0: Codex reports
// `window-minutes: 0` for a window its plan does not use, and an unsized window has nothing to name.
export const quotaWindowLabel = (minutes: number): string | undefined => {
  if (!Number.isFinite(minutes) || minutes <= 0) return undefined;
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
};

// The inverse, for ordering Anthropic's already-named windows shortest-first.
const labelMinutes = (label: string): number => {
  const m = /^(\d+)([mhd])$/.exec(label);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const n = Number(m[1]);
  return m[2] === 'm' ? n : m[2] === 'h' ? n * 60 : n * 1440;
};

const num = (raw: string | null): number | undefined => {
  if (raw === null || raw.trim() === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

// ----------------------------- Codex: x-codex-* ----------------------------- //

// Read the Codex Responses response's utilization headers. Two named slots (primary/secondary) whose SIZE
// only *-window-minutes reveals — primary is NOT a synonym for weekly, so the label is derived, never
// assumed. used-percent is already an integer percent and passes through untouched.
//
// A slot contributes nothing unless it has BOTH a reading and a size: `secondary-window-minutes: 0` means
// the plan doesn't use that window, and rendering it as a 0% meter would invent a limit that isn't there.
export const parseCodexQuota = (headers: Headers): QuotaMeter[] =>
  (['primary', 'secondary'] as const)
    .flatMap((slot) => {
      const percent = num(headers.get(`x-codex-${slot}-used-percent`));
      const minutes = num(headers.get(`x-codex-${slot}-window-minutes`));
      const label = minutes === undefined ? undefined : quotaWindowLabel(minutes);
      if (percent === undefined || label === undefined) return [];
      const resetAt = num(headers.get(`x-codex-${slot}-reset-at`));
      return [{ minutes: minutes as number, meter: { label, percent, ...(resetAt !== undefined ? { resetAt } : {}) } }];
    })
    .sort((a, b) => a.minutes - b.minutes)
    .map((e) => e.meter);

// ----------------------------- Anthropic: anthropic-ratelimit-unified-* ----------------------------- //

// A unified-* field is a WINDOW only when its middle segment is a duration (5h, 7d). The same family also
// carries `overage-utilization`, `fallback-percentage` and `representative-claim`, which are claims about
// the account rather than time windows — matching them would invent a meter named "overage". Matching on
// SHAPE rather than keywords is also what keeps this from repeating the recon's own miss.
const ANTHROPIC_WINDOW = /^anthropic-ratelimit-unified-(\d+[mhd])-utilization$/;

// Read the Anthropic Messages response's utilization headers. The wire reports a 0..1 FRACTION; Codex
// reports an integer percent. Normalizing here is what stops the two Providers' meters landing 100× apart.
export const parseAnthropicQuota = (headers: Headers): QuotaMeter[] => {
  const meters: QuotaMeter[] = [];
  headers.forEach((value, name) => {
    const label = ANTHROPIC_WINDOW.exec(name)?.[1];
    if (!label) return;
    const fraction = num(value);
    if (fraction === undefined) return;
    const resetAt = num(headers.get(`anthropic-ratelimit-unified-${label}-reset`));
    meters.push({ label, percent: Math.round(fraction * 100), ...(resetAt !== undefined ? { resetAt } : {}) });
  });
  return meters.sort((a, b) => labelMinutes(a.label) - labelMinutes(b.label));
};

// ----------------------------- Context ----------------------------- //

// What the conversation currently occupies: everything the NEXT turn re-sends. Both cache tiers count —
// cached prefix is still prefix, and it is still measured against the window.
export const contextTokens = (usage: BridgeUsage): number =>
  usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens + usage.output_tokens;

// Context fill as a percentage. Deliberately UNCLAMPED (#171): a 122% reading is a conversation already
// past the window and therefore already doomed upstream, and showing it before the request fails is the
// whole point. Clamping to 100 would hide exactly the condition worth seeing.
// No window → undefined, so the caller omits the field rather than dividing by a guess.
export const contextPercent = (tokens: number, window: number | undefined): number | undefined =>
  window === undefined || window <= 0 ? undefined : Math.round((tokens / window) * 100);

// The model's total context window, from the OFFLINE caps tables the three OAuth kinds already carry.
// Keyed Providers get undefined on purpose: their window is only known from models.dev, which the door
// does not fetch per turn, and DEFAULT_MAX_INPUT_TOKENS is a picker-budgeting placeholder — reporting a
// percentage against it would be a confident wrong number where no number is the honest answer.
export const contextWindowFor = (provider: Provider, model: string): number | undefined => {
  if (isCodexProvider(provider)) return codexModelCaps(model).contextInput;
  if (isAnthropicProvider(provider)) return anthropicModelCaps(model).contextInput;
  if (isXaiProvider(provider)) return xaiModelCaps(model).contextInput;
  return undefined;
};

// ----------------------------- The snapshot ----------------------------- //

export type BuildStatusArgs = {
  now: number;                 // injected clock — this module stays pure
  provider: Provider;
  model: string;
  usage?: BridgeUsage;         // absent when the turn reported none (see #165: zeros are the bug)
  meters?: QuotaMeter[];
};

// Assemble the snapshot. Every optional field is spread in only when it has a real value, so a Provider
// that reported no usage / no headers degrades to a SHORTER snapshot — the reader then renders a shorter
// badge. Nothing is synthesized to keep the shape uniform.
export const buildStatus = ({ now, provider, model, usage, meters }: BuildStatusArgs): WispStatus => {
  const tokens = usage ? contextTokens(usage) : undefined;
  const window = contextWindowFor(provider, model);
  const percent = tokens === undefined ? undefined : contextPercent(tokens, window);
  return {
    updatedAt: now,
    providerId: provider.id,
    model,
    ...(tokens !== undefined ? { contextTokens: tokens } : {}),
    ...(tokens !== undefined && window !== undefined ? { contextWindow: window } : {}),
    ...(percent !== undefined ? { contextPercent: percent } : {}),
    ...(meters?.length ? { meters } : {}),
  };
};
