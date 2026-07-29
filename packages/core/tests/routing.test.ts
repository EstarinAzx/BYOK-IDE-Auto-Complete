// ---------------- routing.test.ts — the Routing map resolver's full decision table ---------------- //

import { describe, it, expect } from 'vitest';
import {
  resolveRoute, withFamilyRoute, withAlias, withAliasRenamed, withoutAlias, EMPTY_ROUTING_MAP, type RoutingMap,
} from '../src/routing';
import type { Provider } from '../src/catalog';

// Minimal Provider builder — the resolver only reads `id`; the rest is filler.
const p = (id: string): Provider => ({ id, label: id, baseUrl: '', defaultModel: `default-${id}`, apiKeyEnv: '' });

// A small catalog: `active` is the Active Provider in every test; the others are route targets.
const providers = [p('active'), p('codex'), p('go'), p('anthropic')];

// A map with every row kind populated, so precedence tests exercise real competition.
const fullMap: RoutingMap = {
  families: {
    opus: { providerId: 'codex', model: 'gpt-5.6-big' },
    sonnet: { providerId: 'go', model: 'mid-model' },
    haiku: { providerId: 'go', model: 'cheap-model' },
    fable: { providerId: 'anthropic', model: 'claude-fable-5' },
  },
  aliases: [
    { name: 'sol', target: { providerId: 'codex', model: 'gpt-5.6-sol' } },
    // An alias deliberately named like a Provider id — the Provider id must win.
    { name: 'go', target: { providerId: 'codex', model: 'shadowed' } },
    // An alias deliberately named as an exact versioned claude id — it must beat its own family row.
    { name: 'claude-opus-4-8', target: { providerId: 'go', model: 'alias-opus' } },
  ],
};

describe('resolveRoute — lookup order', () => {
  // 1. A requested model naming a Provider id routes to that Provider, unpinned.
  it('resolves a Provider id to that Provider with no pinned model', () => {
    const r = resolveRoute(fullMap, providers, 'active', 'codex');
    expect(r).toEqual({ provider: providers[1], matched: 'provider-id' });
  });

  // 2. Provider id beats an identically-named alias.
  it('Provider id beats an alias of the same name', () => {
    const r = resolveRoute(fullMap, providers, 'active', 'go');
    expect(r).toEqual({ provider: providers[2], matched: 'provider-id' });
  });

  // 3. An exact alias name routes to its Target: Provider + pinned model.
  it('resolves an alias to its Target with the pinned model', () => {
    const r = resolveRoute(fullMap, providers, 'active', 'sol');
    expect(r).toEqual({ provider: providers[1], pinnedModel: 'gpt-5.6-sol', matched: 'alias' });
  });

  // 4. An alias whose name is an exact claude id beats the family row that id would fuzzy-match.
  it('exact-id alias beats its family row', () => {
    const r = resolveRoute(fullMap, providers, 'active', 'claude-opus-4-8');
    expect(r).toEqual({ provider: providers[2], pinnedModel: 'alias-opus', matched: 'alias' });
  });

  // 5. Family fuzzy: any versioned/dated claude-* id of a family hits that family row.
  it.each([
    ['claude-opus-4-9', 'codex', 'gpt-5.6-big'],
    ['claude-haiku-4-5-20251001', 'go', 'cheap-model'],
    ['claude-3-5-sonnet-20241022', 'go', 'mid-model'],
    ['claude-fable-5', 'anthropic', 'claude-fable-5'],
  ])('family fuzzy-matches %s', (requested, providerId, model) => {
    const r = resolveRoute(fullMap, providers, 'active', requested);
    expect(r).toEqual({ provider: providers.find((x) => x.id === providerId), pinnedModel: model, matched: 'family' });
  });

  // 6. An unmapped family row falls back to the Active Provider, unpinned.
  it('unset family row falls back to the Active Provider', () => {
    const map: RoutingMap = { ...fullMap, families: { ...fullMap.families, haiku: undefined } };
    const r = resolveRoute(map, providers, 'active', 'claude-haiku-4-5');
    expect(r).toEqual({ provider: providers[0], matched: 'active' });
  });

  // 7. A non-matching name (Copilot's resolved model name, anything invented) keeps the Active fallback.
  it('unknown model name falls back to the Active Provider', () => {
    const r = resolveRoute(fullMap, providers, 'active', 'gpt-4o');
    expect(r).toEqual({ provider: providers[0], matched: 'active' });
  });

  // 8. Family words only fire on claude-* ids — a bare "opus-magnum" is not a family match.
  it('family match requires the claude- prefix', () => {
    const r = resolveRoute(fullMap, providers, 'active', 'opus-magnum');
    expect(r).toEqual({ provider: providers[0], matched: 'active' });
  });

  // 9. The empty map routes everything to the Active Provider (today's behavior, unchanged).
  it('empty map falls back to the Active Provider for every name', () => {
    const r = resolveRoute(EMPTY_ROUTING_MAP, providers, 'active', 'claude-opus-4-8');
    expect(r).toEqual({ provider: providers[0], matched: 'active' });
  });
});

describe('resolveRoute — fail-loud edges', () => {
  // A Target naming a Provider that is not in the catalog resolves to nothing — the door 404s loud,
  // never silently falls back.
  it('returns undefined for a Target with a dangling providerId', () => {
    const map: RoutingMap = { families: {}, aliases: [{ name: 'ghost', target: { providerId: 'gone', model: 'x' } }] };
    expect(resolveRoute(map, providers, 'active', 'ghost')).toBeUndefined();
  });

  // No Active Provider match either → undefined (the doors' existing 404 handles it).
  it('returns undefined when the Active fallback id is unknown', () => {
    expect(resolveRoute(EMPTY_ROUTING_MAP, providers, 'nope', 'anything')).toBeUndefined();
  });
});

describe('edit operations (#65)', () => {
  const target = { providerId: 'go', model: 'cheap-model' };

  it('withFamilyRoute sets a family Target', () => {
    const next = withFamilyRoute(EMPTY_ROUTING_MAP, providers, 'haiku', target);
    expect(next?.families.haiku).toEqual(target);
  });

  it('withFamilyRoute clears a family with an undefined Target', () => {
    const next = withFamilyRoute(fullMap, providers, 'haiku', undefined);
    expect(next?.families.haiku).toBeUndefined();
    expect(next?.families.opus).toEqual(fullMap.families.opus); // siblings untouched
  });

  it('withFamilyRoute refuses a Target with a dangling providerId', () => {
    expect(withFamilyRoute(EMPTY_ROUTING_MAP, providers, 'opus', { providerId: 'gone', model: 'x' })).toBeUndefined();
  });

  it('withAlias adds a new alias', () => {
    const next = withAlias(EMPTY_ROUTING_MAP, providers, 'fast', target);
    expect(next?.aliases).toEqual([{ name: 'fast', target }]);
  });

  it('withAlias retargets an existing alias without duplicating it', () => {
    const first = withAlias(EMPTY_ROUTING_MAP, providers, 'fast', target)!;
    const next = withAlias(first, providers, 'fast', { providerId: 'codex', model: 'gpt-5.6' });
    expect(next?.aliases).toEqual([{ name: 'fast', target: { providerId: 'codex', model: 'gpt-5.6' } }]);
  });

  // The acceptance rule: a name colliding with a Provider id is refused (it would be unreachable).
  it('withAlias refuses a name that shadows a Provider id', () => {
    expect(withAlias(EMPTY_ROUTING_MAP, providers, 'codex', target)).toBeUndefined();
  });

  it('withAlias refuses an empty name and a dangling Target', () => {
    expect(withAlias(EMPTY_ROUTING_MAP, providers, '', target)).toBeUndefined();
    expect(withAlias(EMPTY_ROUTING_MAP, providers, 'fast', { providerId: 'gone', model: 'x' })).toBeUndefined();
  });

  it('withAliasRenamed keeps the Target and the row position', () => {
    const next = withAliasRenamed(fullMap, providers, 'sol', 'luna');
    expect(next?.aliases.map((a) => a.name)).toEqual(['luna', 'go', 'claude-opus-4-8']);
    expect(next?.aliases[0].target).toEqual(fullMap.aliases[0].target);
  });

  // Same shadow rule as withAlias — plus a collision with ANOTHER alias is refused.
  it('withAliasRenamed refuses Provider-id, taken, empty, and unknown-old names', () => {
    expect(withAliasRenamed(fullMap, providers, 'sol', 'codex')).toBeUndefined();
    expect(withAliasRenamed(fullMap, providers, 'sol', 'go')).toBeUndefined();
    expect(withAliasRenamed(fullMap, providers, 'sol', '')).toBeUndefined();
    expect(withAliasRenamed(fullMap, providers, 'ghost', 'luna')).toBeUndefined();
  });

  it('withoutAlias removes by name; unknown names are a no-op', () => {
    const next = withoutAlias(fullMap, 'sol');
    expect(next.aliases.map((a) => a.name)).toEqual(['go', 'claude-opus-4-8']);
    expect(withoutAlias(EMPTY_ROUTING_MAP, 'ghost').aliases).toEqual([]);
  });

  // Purity: edits return fresh maps and never mutate the input.
  it('edits leave the input map untouched', () => {
    const before = JSON.parse(JSON.stringify(fullMap));
    withFamilyRoute(fullMap, providers, 'haiku', undefined);
    withAlias(fullMap, providers, 'fast', target);
    withAliasRenamed(fullMap, providers, 'sol', 'luna');
    withoutAlias(fullMap, 'sol');
    expect(fullMap).toEqual(before);
  });
});

// ----------------------------- Usage-limit cooldown (#161) ----------------------------- //

import {
  parseUsageLimitReset, createProviderCooldowns, withCooldownFallback, DEFAULT_COOLDOWN_SECONDS,
} from '../src/routing';

// The live-captured codex 429 body (2026-07-23) — the exact string the thrown error carries.
const CODEX_429 = 'Codex API error 429: {"error":{"type":"usage_limit_reached","message":"The usage limit has been reached","plan_type":"plus","resets_at":1785328524,"eligible_promo":null,"resets_in_seconds":551032}}';

describe('parseUsageLimitReset', () => {
  it('extracts resets_in_seconds from a usage-limit 429', () => {
    expect(parseUsageLimitReset(CODEX_429)).toBe(551032);
  });

  // A transient 429 (rate limit, not plan limit) must NOT start a multi-day cooldown.
  it('ignores a 429 that is not usage_limit_reached', () => {
    expect(parseUsageLimitReset('Codex API error 429: {"error":{"type":"rate_limit_error"}}')).toBeUndefined();
  });

  it('ignores non-429 errors mentioning usage limits', () => {
    expect(parseUsageLimitReset('Codex API error 500: usage_limit_reached backend hiccup')).toBeUndefined();
  });

  it('defaults when resets_in_seconds is missing', () => {
    expect(parseUsageLimitReset('API error 429: {"error":{"type":"usage_limit_reached"}}')).toBe(DEFAULT_COOLDOWN_SECONDS);
  });
});

describe('createProviderCooldowns', () => {
  it('cools a provider until the reset horizon, then heals', () => {
    let now = 1_000_000;
    const cd = createProviderCooldowns(() => now);
    expect(cd.noteUsageLimit('codex', CODEX_429)).toBe(551032);
    expect(cd.cooling('codex')).toBe(true);
    expect(cd.coolingUntil('codex')).toBe(1_000_000 + 551032 * 1000);
    expect(cd.cooling('anthropic')).toBe(false);
    now += 551032 * 1000 + 1;
    expect(cd.cooling('codex')).toBe(false);
    expect(cd.coolingUntil('codex')).toBeUndefined();
  });

  it('records nothing for an unrecognized error', () => {
    const cd = createProviderCooldowns(() => 0);
    expect(cd.noteUsageLimit('codex', 'Codex API error 502: bad gateway')).toBeUndefined();
    expect(cd.cooling('codex')).toBe(false);
  });
});

describe('withCooldownFallback', () => {
  const isAnthropic = (pr: Provider) => pr.id === 'anthropic';
  const cooling = (id: string) => id === 'codex';
  // The live shape: family fable -> codex, codex usage-limited.
  const familyMatch = { provider: providers[1], pinnedModel: 'gpt-5.6-big', matched: 'family' as const };

  it('re-aims a family match off a cooling provider to anthropic with the requested claude id', () => {
    const r = withCooldownFallback(familyMatch, 'claude-fable-5', providers, cooling, isAnthropic);
    expect(r).toEqual({ provider: providers[3], pinnedModel: 'claude-fable-5', matched: 'family' });
  });

  it('leaves a family match alone when its provider is healthy', () => {
    const healthy = withCooldownFallback(familyMatch, 'claude-fable-5', providers, () => false, isAnthropic);
    expect(healthy).toBe(familyMatch);
  });

  // Explicit addressing stays honest: provider-id and alias matches never re-aim.
  it('never re-aims provider-id or alias matches', () => {
    const byId = { provider: providers[1], matched: 'provider-id' as const };
    const byAlias = { provider: providers[1], pinnedModel: 'gpt-5.6-sol', matched: 'alias' as const };
    expect(withCooldownFallback(byId, 'codex', providers, cooling, isAnthropic)).toBe(byId);
    expect(withCooldownFallback(byAlias, 'sol', providers, cooling, isAnthropic)).toBe(byAlias);
  });

  it('returns the original match when anthropic is absent, is itself the target, or is cooling too', () => {
    const noAnthropic = providers.filter((pr) => pr.id !== 'anthropic');
    expect(withCooldownFallback(familyMatch, 'claude-fable-5', noAnthropic, cooling, isAnthropic)).toBe(familyMatch);
    const anthropicMatch = { provider: providers[3], pinnedModel: 'claude-fable-5', matched: 'family' as const };
    expect(withCooldownFallback(anthropicMatch, 'claude-fable-5', providers, (id) => id === 'anthropic', isAnthropic)).toBe(anthropicMatch);
    expect(withCooldownFallback(familyMatch, 'claude-fable-5', providers, () => true, isAnthropic)).toBe(familyMatch);
  });

  it('passes undefined through', () => {
    expect(withCooldownFallback(undefined, 'claude-fable-5', providers, cooling, isAnthropic)).toBeUndefined();
  });
});

// ----------------------------- Transient failures (#168) ----------------------------- //

import {
  isTransientProviderError, jittered, retryDelayMs, createProviderCooldowns as makeCooldowns,
  TRANSIENT_COOLDOWN_SECONDS, TRANSIENT_FAILURES_BEFORE_COOLDOWN, TRANSIENT_WINDOW_SECONDS,
  MAX_PROVIDER_ATTEMPTS, RETRY_BASE_DELAY_MS, JITTER_FRACTION,
} from '../src/routing';

// A capacity rejection — the ticket's named case: transient, NOT exhausted quota.
const AT_CAPACITY = 'Codex API error 503: {"error":{"message":"The model is at capacity. Please try again."}}';

describe('isTransientProviderError', () => {
  it('reads upstream 5xx as transient', () => {
    for (const s of [500, 502, 503, 504])
      expect(isTransientProviderError(`Codex API error ${s}: {"error":{"message":"bad gateway"}}`)).toBe(true);
  });

  it('reads a capacity rejection as transient, not exhausted quota', () => {
    expect(isTransientProviderError(AT_CAPACITY)).toBe(true);
    expect(parseUsageLimitReset(AT_CAPACITY)).toBeUndefined();
  });

  it('reads a dropped socket as transient', () => {
    for (const m of ['socket hang up', 'fetch failed', 'read ECONNRESET', 'connect ETIMEDOUT 1.2.3.4:443'])
      expect(isTransientProviderError(m)).toBe(true);
  });

  it('reads a stream that ended before completion as transient', () => {
    expect(isTransientProviderError('Codex stream ended before completion')).toBe(true);
  });

  // The contamination guard, stated as a predicate: a plan-window 429 is NOT a blip.
  it('never reads a usage-limit 429 as transient', () => {
    expect(isTransientProviderError(CODEX_429)).toBe(false);
  });

  // …but a plain rate-limit 429 is one, and gets the short channel.
  it('reads a non-usage-limit 429 as transient', () => {
    expect(isTransientProviderError('Codex API error 429: {"error":{"type":"rate_limit_error"}}')).toBe(true);
  });

  it('never reads a client error as transient', () => {
    expect(isTransientProviderError('Codex API error 400: {"error":{"code":"context_length_exceeded"}}')).toBe(false);
    expect(isTransientProviderError('Codex API error 401: {"error":{"type":"authentication_error"}}')).toBe(false);
  });
});

describe('jittered', () => {
  it('adds nothing at random()=0 and the full capped fraction at random()=1', () => {
    expect(jittered(1000, () => 0)).toBe(1000);
    expect(jittered(1000, () => 1)).toBe(1000 * (1 + JITTER_FRACTION));
  });

  it('stays inside the cap for any random source', () => {
    for (const r of [-5, 0.5, 42]) {
      const ms = jittered(1000, () => r);
      expect(ms).toBeGreaterThanOrEqual(1000);
      expect(ms).toBeLessThanOrEqual(1000 * (1 + JITTER_FRACTION));
    }
  });
});

describe('retryDelayMs', () => {
  it('backs off exponentially per attempt', () => {
    expect(retryDelayMs(1, () => 0)).toBe(RETRY_BASE_DELAY_MS);
    expect(retryDelayMs(2, () => 0)).toBe(RETRY_BASE_DELAY_MS * 2);
  });

  it('jitters off the injected source, never the clock', () => {
    expect(retryDelayMs(1, () => 1)).toBe(RETRY_BASE_DELAY_MS * (1 + JITTER_FRACTION));
  });

  it('bounds the attempts a request may make', () => {
    expect(MAX_PROVIDER_ATTEMPTS).toBeGreaterThan(1);
  });
});

describe('createProviderCooldowns — the transient channel (#168)', () => {
  // Fail `n` times in a row at the same instant.
  const failTimes = (cd: ReturnType<typeof makeCooldowns>, n: number, message = AT_CAPACITY) => {
    let last: number | undefined;
    for (let i = 0; i < n; i++) last = cd.noteTransient('codex', message);
    return last;
  };

  it('does not cool a provider for a single blip', () => {
    const cd = makeCooldowns(() => 0, () => 0);
    expect(cd.noteTransient('codex', AT_CAPACITY)).toBeUndefined();
    expect(cd.cooling('codex')).toBe(false);
  });

  it('cools briefly once transient failures repeat inside the window', () => {
    const cd = makeCooldowns(() => 1_000_000, () => 0);
    expect(failTimes(cd, TRANSIENT_FAILURES_BEFORE_COOLDOWN)).toBe(TRANSIENT_COOLDOWN_SECONDS);
    expect(cd.cooling('codex')).toBe(true);
    expect(cd.coolingUntil('codex')).toBe(1_000_000 + TRANSIENT_COOLDOWN_SECONDS * 1000);
  });

  it('heals when the short cooldown expires', () => {
    let now = 0;
    const cd = makeCooldowns(() => now, () => 0);
    failTimes(cd, TRANSIENT_FAILURES_BEFORE_COOLDOWN);
    now += TRANSIENT_COOLDOWN_SECONDS * 1000 + 1;
    expect(cd.cooling('codex')).toBe(false);
  });

  // Stale failures must not accumulate into a cooldown days later.
  it('forgets failures older than the window', () => {
    let now = 0;
    const cd = makeCooldowns(() => now, () => 0);
    for (let i = 0; i < TRANSIENT_FAILURES_BEFORE_COOLDOWN * 3; i++) {
      expect(cd.noteTransient('codex', AT_CAPACITY)).toBeUndefined();
      now += TRANSIENT_WINDOW_SECONDS * 1000 + 1;
    }
    expect(cd.cooling('codex')).toBe(false);
  });

  it('records nothing for a failure that is not transient', () => {
    const cd = makeCooldowns(() => 0, () => 0);
    expect(cd.noteTransient('codex', 'Codex API error 400: context_length_exceeded')).toBeUndefined();
    expect(cd.cooling('codex')).toBe(false);
  });

  it('jitters the cooldown off the injected random source', () => {
    const cd = makeCooldowns(() => 0, () => 1);
    failTimes(cd, TRANSIENT_FAILURES_BEFORE_COOLDOWN);
    expect(cd.coolingUntil('codex')).toBe(TRANSIENT_COOLDOWN_SECONDS * 1000 * (1 + JITTER_FRACTION));
  });

  it('keeps the two channels on separate providers', () => {
    const cd = makeCooldowns(() => 0, () => 0);
    failTimes(cd, TRANSIENT_FAILURES_BEFORE_COOLDOWN);
    expect(cd.cooling('codex')).toBe(true);
    expect(cd.cooling('anthropic')).toBe(false);
  });

  // ---- The two cross-contamination cases the ticket names ---- //

  // A blip must never sideline a Provider for days.
  it('a transient failure never creates or extends a usage-limit cooldown', () => {
    let now = 0;
    const cd = makeCooldowns(() => now, () => 0);
    failTimes(cd, TRANSIENT_FAILURES_BEFORE_COOLDOWN * 4);
    expect(cd.coolingUntil('codex')).toBe(TRANSIENT_COOLDOWN_SECONDS * 1000);
    // Past the short horizon the provider is usable again — nothing wrote a multi-day entry.
    now = TRANSIENT_COOLDOWN_SECONDS * 1000 + 1;
    expect(cd.cooling('codex')).toBe(false);
  });

  // A real multi-day quota exhaustion must never be shortened to seconds.
  it('a usage-limit cooldown is never shortened by transient failures', () => {
    let now = 0;
    const cd = makeCooldowns(() => now, () => 0);
    expect(cd.noteUsageLimit('codex', CODEX_429)).toBe(551032);
    failTimes(cd, TRANSIENT_FAILURES_BEFORE_COOLDOWN * 2);
    expect(cd.coolingUntil('codex')).toBe(551032 * 1000);
    // Well past any transient horizon, the plan window still holds.
    now = TRANSIENT_COOLDOWN_SECONDS * 1000 * 100;
    expect(cd.cooling('codex')).toBe(true);
    expect(cd.coolingUntil('codex')).toBe(551032 * 1000);
  });

  // …and the reverse order: a plan-window 429 arriving while the short channel is hot wins.
  it('a usage-limit failure overrides a live transient cooldown', () => {
    let now = 0;
    const cd = makeCooldowns(() => now, () => 0);
    failTimes(cd, TRANSIENT_FAILURES_BEFORE_COOLDOWN);
    cd.noteUsageLimit('codex', CODEX_429);
    now = TRANSIENT_COOLDOWN_SECONDS * 1000 + 1;
    expect(cd.cooling('codex')).toBe(true);
    expect(cd.coolingUntil('codex')).toBe(551032 * 1000);
  });

  // The #161 machinery must keep working off the widened `cooling` predicate.
  it('family routes still fall back to a healthy Target while a provider cools transiently', () => {
    const cd = makeCooldowns(() => 0, () => 0);
    failTimes(cd, TRANSIENT_FAILURES_BEFORE_COOLDOWN);
    const familyMatch = { provider: providers[1], pinnedModel: 'gpt-5.6-big', matched: 'family' as const };
    const r = withCooldownFallback(familyMatch, 'claude-fable-5', providers, cd.cooling, (pr) => pr.id === 'anthropic');
    expect(r).toEqual({ provider: providers[3], pinnedModel: 'claude-fable-5', matched: 'family' });
  });
});
