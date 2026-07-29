// ---------------- kimi.test.ts — pure Kimi (device-flow OAuth) Provider helpers ---------------- //

import { describe, it, expect } from 'vitest';
import {
  isKimiProvider, isKimiSignedIn,
  tokensToKimiCreds, shouldRefreshKimiToken, parseKimiCreds,
  parseDeviceAuthorization, classifyDevicePoll, nextPollIntervalMs,
  KIMI_DEFAULT_POLL_INTERVAL_MS, KIMI_SLOW_DOWN_STEP_MS,
  PROVIDERS,
  type Provider,
} from '../src/catalog';

// A Kimi catalog row, overridable per-test — mirrors the xai.test.ts provider() helper.
const provider = (over: Partial<Provider> = {}): Provider => ({
  id: 'kimi', label: 'Kimi', baseUrl: 'https://api.kimi.com/coding',
  defaultModel: 'kimi-k2.7-code', apiKeyEnv: '', kind: 'kimi-oauth', ...over,
});

describe('isKimiProvider', () => {
  it('is true for a row whose kind is kimi-oauth', () => {
    expect(isKimiProvider(provider())).toBe(true);
  });

  // Kimi must stay distinct from every other kind — it rides the KEYED request path (no bespoke client),
  // so the three OAuth predicates that DO switch off that path must all read false for it.
  it('is false for absent kind, openai-chat, codex, anthropic-oauth and xai-oauth', () => {
    expect(isKimiProvider(provider({ kind: undefined }))).toBe(false);
    expect(isKimiProvider(provider({ kind: 'openai-chat' }))).toBe(false);
    expect(isKimiProvider(provider({ kind: 'codex' }))).toBe(false);
    expect(isKimiProvider(provider({ kind: 'anthropic-oauth' }))).toBe(false);
    expect(isKimiProvider(provider({ kind: 'xai-oauth' }))).toBe(false);
  });
});

describe('isKimiSignedIn', () => {
  // Kimi has no API key — usable == a bearer access token is present.
  it('is true when an access token is present', () => {
    expect(isKimiSignedIn({ accessToken: 'at', refreshToken: 'rt' })).toBe(true);
  });

  it('is false for undefined, the {} sign-out tombstone, and a refresh-only blob', () => {
    expect(isKimiSignedIn(undefined)).toBe(false);
    expect(isKimiSignedIn({})).toBe(false);
    expect(isKimiSignedIn({ refreshToken: 'rt' })).toBe(false);
  });
});

describe('tokensToKimiCreds', () => {
  it('stamps expires_in (relative seconds) into an absolute epoch-ms expiresAt', () => {
    expect(tokensToKimiCreds({ access_token: 'at', refresh_token: 'rt', expires_in: 3600 }, 1_000))
      .toEqual({ accessToken: 'at', refreshToken: 'rt', expiresAt: 1_000 + 3_600_000 });
  });

  it('omits absent fields rather than writing undefined', () => {
    expect(tokensToKimiCreds({ access_token: 'at' }, 1_000)).toEqual({ accessToken: 'at' });
  });
});

describe('shouldRefreshKimiToken', () => {
  // The ticket's schedule: refresh 5 minutes AHEAD of expiry, so a long session never breaks mid-turn.
  it('is true once the token is within 5 minutes of expiry', () => {
    expect(shouldRefreshKimiToken({ expiresAt: 1_000_000 }, 1_000_000 - 5 * 60_000)).toBe(true);
    expect(shouldRefreshKimiToken({ expiresAt: 1_000_000 }, 1_000_001)).toBe(true);
  });

  it('is false while the token is further out, and for a bundle with no expiry to prove staleness', () => {
    expect(shouldRefreshKimiToken({ expiresAt: 1_000_000 }, 1_000_000 - 5 * 60_000 - 1)).toBe(false);
    expect(shouldRefreshKimiToken({}, 1_000_000)).toBe(false);
  });
});

describe('parseKimiCreds', () => {
  it('reads a stored slice, and answers undefined for absent/corrupt', () => {
    expect(parseKimiCreds('{"accessToken":"at"}')).toEqual({ accessToken: 'at' });
    expect(parseKimiCreds(undefined)).toBeUndefined();
    expect(parseKimiCreds('not json')).toBeUndefined();
  });
});

// ----------------------------- Device authorization (RFC 8628 §3.2) ----------------------------- //

describe('parseDeviceAuthorization', () => {
  it('reads the device-code response and makes both durations absolute', () => {
    const parsed = parseDeviceAuthorization({
      device_code: 'dc', user_code: 'WDJB-MJHT',
      verification_uri: 'https://auth.kimi.com/device',
      verification_uri_complete: 'https://auth.kimi.com/device?user_code=WDJB-MJHT',
      expires_in: 900, interval: 5,
    }, 10_000);
    expect(parsed).toEqual({
      deviceCode: 'dc', userCode: 'WDJB-MJHT',
      verificationUri: 'https://auth.kimi.com/device',
      verificationUriComplete: 'https://auth.kimi.com/device?user_code=WDJB-MJHT',
      intervalMs: 5_000,
      expiresAt: 10_000 + 900_000,
    });
  });

  // §3.2 makes `interval` optional and fixes the default at 5s; a server that omits it must not poll flat out.
  it('defaults a missing interval to 5s and a missing window to 15 minutes', () => {
    const parsed = parseDeviceAuthorization({
      device_code: 'dc', user_code: 'UC', verification_uri: 'https://auth.kimi.com/device',
    }, 0);
    expect(parsed?.intervalMs).toBe(KIMI_DEFAULT_POLL_INTERVAL_MS);
    expect(parsed?.expiresAt).toBe(15 * 60_000);
  });

  // All three fields are REQUIRED by §3.2. A missing user_code used to parse "successfully" and left the
  // user staring at a blank code on a screen they could never complete — fail the flow instead.
  it('answers undefined when the response is missing the device code, user code, or verification URI', () => {
    expect(parseDeviceAuthorization({ user_code: 'UC', verification_uri: 'https://auth.kimi.com/device' }, 0)).toBeUndefined();
    expect(parseDeviceAuthorization({ device_code: 'dc', user_code: 'UC' }, 0)).toBeUndefined();
    expect(parseDeviceAuthorization({ device_code: 'dc', verification_uri: 'https://auth.kimi.com/device' }, 0)).toBeUndefined();
    expect(parseDeviceAuthorization('nope', 0)).toBeUndefined();
  });
});

// ----------------------------- Poll state machine (RFC 8628 §3.5) ----------------------------- //

describe('classifyDevicePoll', () => {
  it('reads a 200 with an access token as authorized, carrying the stamped creds', () => {
    const outcome = classifyDevicePoll(200, { access_token: 'at', refresh_token: 'rt', expires_in: 60 }, 1_000);
    expect(outcome).toEqual({ kind: 'authorized', creds: { accessToken: 'at', refreshToken: 'rt', expiresAt: 61_000 } });
  });

  // A 200 that somehow carries no bearer is a failure, not a silent success — the caller must not store {}.
  it('reads a 200 with no access token as failed', () => {
    expect(classifyDevicePoll(200, { token_type: 'bearer' }, 0).kind).toBe('failed');
  });

  // Some OAuth servers answer the pending legs with HTTP 200 and an `error` body. Trust the error over the
  // status — reading that first poll as "authorized but tokenless" would kill the flow instantly.
  it('trusts an error field even on a 200', () => {
    expect(classifyDevicePoll(200, { error: 'authorization_pending' }, 0)).toEqual({ kind: 'pending' });
    expect(classifyDevicePoll(200, { error: 'slow_down' }, 0)).toEqual({ kind: 'slow-down' });
  });

  it('reads authorization_pending as pending — the user simply has not finished yet', () => {
    expect(classifyDevicePoll(400, { error: 'authorization_pending' }, 0)).toEqual({ kind: 'pending' });
  });

  it('reads slow_down as its own outcome, so the caller can back off', () => {
    expect(classifyDevicePoll(400, { error: 'slow_down' }, 0)).toEqual({ kind: 'slow-down' });
  });

  it('reads access_denied as denied', () => {
    expect(classifyDevicePoll(400, { error: 'access_denied' }, 0).kind).toBe('denied');
  });

  it('reads expired_token as expired', () => {
    expect(classifyDevicePoll(400, { error: 'expired_token' }, 0).kind).toBe('expired');
  });

  // An unknown error code must stop the loop rather than poll forever against a server that will never say yes.
  it('reads an unrecognised error as failed, quoting the server description', () => {
    const outcome = classifyDevicePoll(400, { error: 'invalid_client', error_description: 'bad client id' }, 0);
    expect(outcome.kind).toBe('failed');
    expect(outcome.kind === 'failed' && outcome.message).toContain('bad client id');
  });

  it('reads a non-JSON / unshaped body as failed rather than throwing', () => {
    expect(classifyDevicePoll(500, 'gateway blew up', 0).kind).toBe('failed');
  });

  // AC: no credential or token appears in any log. Outcome messages are what the faces log, so a payload
  // carrying BOTH an error and a token must never let the token ride out in the message.
  it('never carries a token in a failure message', () => {
    const outcome = classifyDevicePoll(400, { error: 'invalid_grant', error_description: 'nope', access_token: 'SECRET-TOKEN' }, 0);
    expect(outcome.kind).toBe('failed');
    expect(JSON.stringify(outcome)).not.toContain('SECRET-TOKEN');
  });
});

describe('nextPollIntervalMs', () => {
  // §3.5: slow_down means "add 5 seconds to your interval and carry on", not "give up".
  it('adds the 5s step on slow-down and leaves every other outcome alone', () => {
    expect(nextPollIntervalMs(5_000, { kind: 'slow-down' })).toBe(5_000 + KIMI_SLOW_DOWN_STEP_MS);
    expect(nextPollIntervalMs(5_000, { kind: 'pending' })).toBe(5_000);
    expect(nextPollIntervalMs(9_000, { kind: 'denied', message: 'x' })).toBe(9_000);
  });

  it('compounds across repeated slow-downs', () => {
    expect(nextPollIntervalMs(nextPollIntervalMs(5_000, { kind: 'slow-down' }), { kind: 'slow-down' }))
      .toBe(5_000 + 2 * KIMI_SLOW_DOWN_STEP_MS);
  });
});

// ----------------------------- The catalog row ----------------------------- //

describe('the Kimi catalog row', () => {
  const kimi = PROVIDERS.find((p) => p.id === 'kimi');

  it('ships in the catalog as an OAuth row with no API key env', () => {
    expect(kimi).toBeDefined();
    expect(kimi && isKimiProvider(kimi)).toBe(true);
    expect(kimi?.apiKeyEnv).toBe('');
  });

  // The whole point of the ticket: Kimi is OpenAI-compatible on the wire, so it must NOT claim one of the
  // three kinds that route to a bespoke client — it falls through to the keyed executor and inherits #169.
  it('is not matched by any of the bespoke-client Provider predicates', async () => {
    const { isCodexProvider, isAnthropicProvider, isXaiProvider } = await import('../src/catalog');
    expect(kimi && isCodexProvider(kimi)).toBe(false);
    expect(kimi && isAnthropicProvider(kimi)).toBe(false);
    expect(kimi && isXaiProvider(kimi)).toBe(false);
  });
});
