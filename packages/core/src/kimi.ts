// ---------------- kimi.ts — Wisp: Kimi Provider pure cores (creds + the device-flow state machine) ---------------- //

/*
 * Depends on:
 *   - ./catalog — the Provider row type ONLY (import type, erased at runtime), so catalog -> kimi is the sole
 *     runtime edge and the graph stays acyclic (the xai.ts pattern).
 *
 * Data shapes:
 *   - KimiCreds: the Kimi credential bundle (access/refresh token, absolute expiresAt).
 *   - KimiDeviceAuthorization: the parsed RFC 8628 §3.2 device-code response, both durations made absolute.
 *   - KimiPollOutcome: one reading of the §3.5 token-poll — the state machine's alphabet.
 *
 * Kimi is the one Provider that signs in with OAuth but talks the ORDINARY OpenAI-chat wire, so its kind
 * exists purely to tell the faces "offer sign-in, not a key field". Nothing dispatches a bespoke client on
 * it: the Bridge's keyed executor matches it like any other OpenAI-compatible row, which is what makes it
 * inherit #169's usage reporting for free. The impure kimiAuth.ts owns the flow and the IO.
 */

import type { Provider } from './catalog';

// ----------------------------- Constants ----------------------------- //

// RFC 8628 §3.2 fixes the default poll interval at 5s when the server names none, and §3.5 says a slow_down
// means "add 5 seconds and carry on". The 15-minute window is Kimi's stated authorization lifetime, used
// only when the response omits expires_in.
export const KIMI_DEFAULT_POLL_INTERVAL_MS = 5_000;
export const KIMI_SLOW_DOWN_STEP_MS = 5_000;
export const KIMI_DEFAULT_WINDOW_MS = 15 * 60_000;

// Refresh 5 minutes BEFORE expiry (the ticket's schedule — looser than xAI's 2min because a coding session
// runs long between turns). The skew lives HERE at the check, not baked into expiresAt, so it applies once.
const KIMI_TOKEN_REFRESH_SKEW_MS = 5 * 60_000;

// ----------------------------- Creds ----------------------------- //

// Kimi's credential bundle. Like Anthropic/Grok the token carries no JWT exp (the server returns expires_in),
// so the deadline is stored as an absolute epoch-ms expiresAt stamped at exchange time.
export type KimiCreds = {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;   // epoch ms; absent when the token response carried no expires_in
};

// Whether a catalog row is the Kimi backend. Absent kind == 'openai-chat', so false for every API-key row —
// and false for the three kinds that DO switch off the OpenAI-chat path.
export const isKimiProvider = (provider: Provider): boolean => provider.kind === 'kimi-oauth';

// Kimi is "usable when signed in" — no API key, so usability is a bearer access token. The `{}` sign-out
// tombstone and a refresh-only blob both read as signed-out.
export const isKimiSignedIn = (creds: KimiCreds | undefined): boolean => !!creds && !!creds.accessToken;

// Turn a Kimi token response into KimiCreds. expires_in (seconds, relative) becomes an absolute expiresAt
// against the injected clock — `now` is a parameter so this stays pure.
export const tokensToKimiCreds = (
  payload: { access_token?: string; refresh_token?: string; expires_in?: number },
  now: number,
): KimiCreds => ({
  ...(payload.access_token ? { accessToken: payload.access_token } : {}),
  ...(payload.refresh_token ? { refreshToken: payload.refresh_token } : {}),
  ...(typeof payload.expires_in === 'number' ? { expiresAt: now + payload.expires_in * 1000 } : {}),
});

// Refresh once the token is inside the skew window. No expiresAt → false: staleness can't be proven, and a
// speculative refresh would burn the single-use refresh token.
export const shouldRefreshKimiToken = (creds: { expiresAt?: number }, now: number): boolean =>
  creds.expiresAt !== undefined && creds.expiresAt <= now + KIMI_TOKEN_REFRESH_SKEW_MS;

// Parse a stored auth.json slice into KimiCreds. An absent/empty/corrupt slot reads as undefined; the `{}`
// tombstone parses to an empty object (isKimiSignedIn then reads signed-out).
export const parseKimiCreds = (raw: string | undefined): KimiCreds | undefined => {
  if (!raw) return undefined;
  try { return JSON.parse(raw) as KimiCreds; } catch { return undefined; }
};

// ----------------------------- Device authorization (RFC 8628 §3.2) ----------------------------- //

// The device-code response, with both server durations resolved against the caller's clock so the polling
// loop compares absolutes and never re-derives a deadline.
export type KimiDeviceAuthorization = {
  deviceCode: string;              // the secret the poll presents — never displayed, never logged
  userCode: string;                // the short code the user types at verificationUri
  verificationUri: string;
  verificationUriComplete?: string; // the URI with the code pre-filled, when the server offers one
  intervalMs: number;
  expiresAt: number;               // epoch ms — the window the poll gives up at
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);

// Read the §3.2 response. device_code, user_code and verification_uri are all REQUIRED there, and all three
// are load-bearing here: without the code or the URI there is nothing to show the user, and without the
// device code nothing to poll. Any missing one answers undefined rather than a half-built authorization the
// user could never complete.
export const parseDeviceAuthorization = (payload: unknown, now: number): KimiDeviceAuthorization | undefined => {
  if (!isRecord(payload)) return undefined;
  const deviceCode = str(payload.device_code);
  const verificationUri = str(payload.verification_uri);
  const userCode = str(payload.user_code);
  if (!deviceCode || !verificationUri || !userCode) return undefined;
  const interval = typeof payload.interval === 'number' && payload.interval > 0 ? payload.interval * 1000 : KIMI_DEFAULT_POLL_INTERVAL_MS;
  const window = typeof payload.expires_in === 'number' && payload.expires_in > 0 ? payload.expires_in * 1000 : KIMI_DEFAULT_WINDOW_MS;
  return {
    deviceCode,
    userCode,
    verificationUri,
    ...(str(payload.verification_uri_complete) ? { verificationUriComplete: str(payload.verification_uri_complete)! } : {}),
    intervalMs: interval,
    expiresAt: now + window,
  };
};

// ----------------------------- Poll state machine (RFC 8628 §3.5) ----------------------------- //

// One reading of a token poll. `pending` and `slow-down` continue the loop; the other four end it. Split
// rather than collapsed into ok/error because the caller treats all four endings differently: denied and
// expired are the user's doing (a plain message), failed is the server's, authorized carries the prize.
export type KimiPollOutcome =
  | { kind: 'pending' }
  | { kind: 'slow-down' }
  | { kind: 'denied'; message: string }
  | { kind: 'expired'; message: string }
  | { kind: 'authorized'; creds: KimiCreds }
  | { kind: 'failed'; message: string };

// Classify one poll response. Messages are built ONLY from the server's error/error_description fields, so
// a payload that carries both an error and a token can never leak the token into a log line (AC: no
// credential appears in any log). A 200 with no bearer is a failure, not a silent success — storing `{}`
// there would read as signed-out forever while the user believes they signed in.
export const classifyDevicePoll = (status: number, payload: unknown, now: number): KimiPollOutcome => {
  const error = isRecord(payload) ? str(payload.error) : undefined;
  // The error field wins over the status. Some OAuth servers answer the pending legs 200-with-error, and
  // reading that as "authorized but tokenless" would end the flow on the very first poll.
  if (status === 200 && !error) {
    const creds = isRecord(payload) ? tokensToKimiCreds(payload as { access_token?: string }, now) : {};
    return creds.accessToken
      ? { kind: 'authorized', creds }
      : { kind: 'failed', message: 'Kimi sign-in completed but no access token was returned.' };
  }
  const description = (isRecord(payload) ? str(payload.error_description) : undefined) ?? error ?? `HTTP ${status}`;
  switch (error) {
    case 'authorization_pending': return { kind: 'pending' };
    case 'slow_down': return { kind: 'slow-down' };
    case 'access_denied': return { kind: 'denied', message: 'Kimi sign-in was denied.' };
    case 'expired_token': return { kind: 'expired', message: 'Kimi sign-in expired before it was approved.' };
    default: return { kind: 'failed', message: `Kimi sign-in failed: ${description}` };
  }
};

// The interval to use for the next poll. §3.5's only pacing rule: a slow_down adds 5 seconds permanently,
// every other outcome leaves the server's stated interval alone.
export const nextPollIntervalMs = (current: number, outcome: KimiPollOutcome): number =>
  outcome.kind === 'slow-down' ? current + KIMI_SLOW_DOWN_STEP_MS : current;
