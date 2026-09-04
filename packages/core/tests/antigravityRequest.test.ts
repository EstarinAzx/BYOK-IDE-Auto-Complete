// ------------- antigravityRequest.test.ts — the #189 request path: lineup, hosts, throw shape, payload ------------- //

/*
 * #189 adds the pure half of the first real turn: the model lineup, the daily-first host chain, the URL /
 * header builders, the throw shape, and the turns -> Gemini payload translation the envelope wraps.
 *
 * The executor record and the door wiring have NO unit seam by design (spec #185) — they are verified live,
 * the way bridgeServer.ts always has been. Everything they call, however, is pure and lives here.
 *
 * The load-bearing case is `antigravityApiError`: its message shape is a CONTRACT with routing.ts's
 * isTransientProviderError, and the tests below assert against that real predicate rather than against a
 * hand-copied regex — a contract asserted against a copy of itself proves nothing.
 */

import { describe, it, expect } from 'vitest';
import {
  ANTIGRAVITY_MODELS, ANTIGRAVITY_MODEL_SPECS, ANTIGRAVITY_DAILY_HOST, ANTIGRAVITY_PROD_HOST,
  ANTIGRAVITY_HTTP_USER_AGENT, ANTIGRAVITY_SYNTHETIC_SIGNATURE,
  antigravityMaxCompletionTokens, isAntigravityImageModel, antigravityImageRefusal,
  antigravityHostChain, antigravityTurnUrl, antigravityRequestHeaders,
  antigravityApiError, antigravityShouldTryNextHost, antigravityFallbackSessionId,
  antigravityFailureOf, ANTIGRAVITY_QUOTA_EXHAUSTED_CODE, ANTIGRAVITY_RATE_LIMITED_CODE,
  buildAntigravityPayload, buildAntigravityRequestBody,
  validateAntigravityFunctionCallPairing, antigravityStableSessionId,
  oauthModelOptions, PROVIDERS,
  type Provider,
} from '../src/catalog';
import { isTransientProviderError } from '../src/routing';

const antigravityRow = (): Provider => PROVIDERS.find((p) => p.id === 'antigravity')!;

// ----------------------------- The model lineup ----------------------------- //

describe('ANTIGRAVITY_MODELS', () => {
  it('lists thirteen models', () => {
    expect(ANTIGRAVITY_MODELS).toHaveLength(13);
    expect(new Set(ANTIGRAVITY_MODELS).size).toBe(13); // no duplicate ids
  });

  it('carries the catalog row default, and it is NOT the recommended-but-400ing pro-high row', () => {
    expect(ANTIGRAVITY_MODELS).toContain(antigravityRow().defaultModel);
    expect(ANTIGRAVITY_MODELS).not.toContain('gemini-3.1-pro-high');
  });

  it('exposes exactly one image row', () => {
    expect(ANTIGRAVITY_MODEL_SPECS.filter((spec) => spec.image).map((spec) => spec.id)).toEqual(['gemini-3.1-flash-image']);
  });

  it('feeds the Provider model picker through oauthModelOptions', () => {
    expect(oauthModelOptions(antigravityRow(), undefined)).toEqual(ANTIGRAVITY_MODELS);
  });

  it('reports each row output cap, and undefined for an unknown id', () => {
    expect(antigravityMaxCompletionTokens('claude-sonnet-4-6')).toBe(64_000);
    expect(antigravityMaxCompletionTokens('gemini-3-flash')).toBe(65_536);
    expect(antigravityMaxCompletionTokens('gpt-oss-120b-medium')).toBe(32_768);
    expect(antigravityMaxCompletionTokens('not-a-model')).toBeUndefined();
  });
});

describe('isAntigravityImageModel', () => {
  it('is true for the listed image row and false for the text rows', () => {
    expect(isAntigravityImageModel('gemini-3.1-flash-image')).toBe(true);
    for (const id of ANTIGRAVITY_MODELS.filter((m) => m !== 'gemini-3.1-flash-image')) {
      expect(isAntigravityImageModel(id)).toBe(false);
    }
  });

  // An UNLISTED image id must refuse too: the upstream catalog is advisory and answered 24 rows to our 13,
  // so a new image model would otherwise stream an empty answer instead of saying why.
  it('falls back to the same substring test the envelope uses for requestType', () => {
    expect(isAntigravityImageModel('gemini-9-flash-image')).toBe(true);
    expect(isAntigravityImageModel('gemini-9-flash')).toBe(false);
  });

  it('names the reason in the refusal', () => {
    const message = antigravityImageRefusal('gemini-3.1-flash-image');
    expect(message).toContain('gemini-3.1-flash-image');
    expect(message).toContain('image-output channel');
  });
});

// ----------------------------- Hosts, URLs, headers ----------------------------- //

describe('antigravityHostChain', () => {
  it('is daily first, production second', () => {
    expect(antigravityHostChain()).toEqual([ANTIGRAVITY_DAILY_HOST, ANTIGRAVITY_PROD_HOST]);
  });

  // The catalog row's baseUrl IS the daily host, so the ordinary wiring must still yield the fallback.
  it('still yields both when handed the catalog row default', () => {
    expect(antigravityHostChain(antigravityRow().baseUrl)).toEqual([ANTIGRAVITY_DAILY_HOST, ANTIGRAVITY_PROD_HOST]);
    expect(antigravityHostChain(`${ANTIGRAVITY_DAILY_HOST}/`)).toEqual([ANTIGRAVITY_DAILY_HOST, ANTIGRAVITY_PROD_HOST]);
  });

  it('pins to a deliberate override instead of prefixing it', () => {
    expect(antigravityHostChain('https://example.test')).toEqual(['https://example.test']);
  });
});

describe('antigravityTurnUrl', () => {
  it('adds the SSE query flag on the streaming path only', () => {
    expect(antigravityTurnUrl(ANTIGRAVITY_DAILY_HOST, true))
      .toBe(`${ANTIGRAVITY_DAILY_HOST}/v1internal:streamGenerateContent?alt=sse`);
    expect(antigravityTurnUrl(ANTIGRAVITY_DAILY_HOST, false))
      .toBe(`${ANTIGRAVITY_DAILY_HOST}/v1internal:generateContent`);
  });

  it('does not double the slash on a trailing-slash host', () => {
    expect(antigravityTurnUrl(`${ANTIGRAVITY_PROD_HOST}/`, false)).toBe(`${ANTIGRAVITY_PROD_HOST}/v1internal:generateContent`);
  });
});

describe('antigravityRequestHeaders', () => {
  it('mirrors the reference headers with the pinned client version', () => {
    expect(antigravityRequestHeaders('tok')).toEqual({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer tok',
      'User-Agent': ANTIGRAVITY_HTTP_USER_AGENT,
    });
  });

  // The version is what the upstream gates on (#186 verified 2.2.1) and there is no background poller
  // refreshing it — so it must stay a visible constant, not a value assembled at the call site.
  it('claims a versioned client', () => {
    expect(ANTIGRAVITY_HTTP_USER_AGENT).toMatch(/^antigravity\/hub\/\d+\.\d+\.\d+ /);
  });
});

// ----------------------------- The throw shape (the contract) ----------------------------- //

describe('antigravityApiError', () => {
  // ⚠ Asserted against the REAL predicate. A client throwing an unmatched shape gets ZERO retries, and the
  // damage only shows up as a user-visible failure on the next blip.
  it('produces a shape the shared transient-retry predicate actually matches', () => {
    for (const status of [429, 500, 502, 503, 504]) {
      expect(isTransientProviderError(String(antigravityApiError(status, 'upstream said no')))).toBe(true);
    }
  });

  it('does NOT look transient for a client error — a retry cannot fix a 400 or a 401', () => {
    for (const status of [400, 401, 403, 404]) {
      expect(isTransientProviderError(String(antigravityApiError(status, 'bad request')))).toBe(false);
    }
  });

  it('carries the status and the upstream body', () => {
    expect(antigravityApiError(500, '  boom  ').message).toBe('Antigravity API error 500: boom');
    expect(antigravityApiError(500, '').message).toBe('Antigravity API error 500');
  });

  it('caps a huge body so one error cannot flood the log', () => {
    expect(antigravityApiError(502, 'x'.repeat(5_000)).message.length).toBeLessThan(600);
  });

  // A classified 429 swaps the raw body for the reason decideAntigravity429 read — and keeps the prefix, so
  // the predicate still matches.
  it('uses the classified reason on a quota 429, keeping the matching prefix', () => {
    const body = JSON.stringify({
      error: {
        status: 'RESOURCE_EXHAUSTED',
        details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'QUOTA_EXHAUSTED' }],
      },
    });
    const err = antigravityApiError(429, body);
    expect(err.message).toBe('Antigravity API error 429: QUOTA_EXHAUSTED');
    expect(isTransientProviderError(err.message)).toBe(true);
  });

  it('falls back to the raw body when the 429 declines classification', () => {
    expect(antigravityApiError(429, 'slow down').message).toBe('Antigravity API error 429: slow down');
  });

  it('survives a 429 body that is not JSON at all', () => {
    expect(() => antigravityApiError(429, '<html>502 gateway</html>')).not.toThrow();
  });
});

// ----------------------------- The classified failure carried on the Error (#190) ----------------------------- //

/*
 * #190 makes Antigravity the first record to answer a rate limit as 429 instead of a gateway fault, and to
 * seed a cooldown from the horizon the server stated. Both consumers read the verdict OFF the Error rather
 * than out of its message. These pin that the carrier is present exactly when the pure layer classified and
 * absent exactly when it declined — that boundary IS the retry / no-retry decision.
 */

const quota429 = (reason: string, retryDelay?: string): string => JSON.stringify({
  error: {
    code: 429, status: 'RESOURCE_EXHAUSTED', message: 'rate limited',
    details: [
      { '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason },
      ...(retryDelay ? [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay }] : []),
    ],
  },
});

// ---------------- Antigravity 4xx classification (2.1.0) ---------------- //

/*
 * Every non-429 Antigravity failure used to leave the door as `502 provider request failed`. A 502 is the
 * wrong instruction for a client error: it says "the server broke, retry", so Claude Code retried a
 * deterministic 400 (the itemless-array schema rejection, 2.0.48) ten times, and the retry storm hid the
 * stable error. Same instruction problem #166 fixed for Codex. A 4xx cannot succeed on a retry, so it
 * rides the #166 four-field shape and the door answers with the real status. 5xx stays unclassified —
 * a real outage must never hide behind a client-error status the client would stop retrying.
 */
describe('antigravityApiError — 4xx client errors classify (2.1.0)', () => {
  it('a 400 carries the #166 shape: real status, invalid_request_error, the upstream detail', () => {
    const failure = antigravityFailureOf(antigravityApiError(400, 'function_declarations[3].parameters.properties[where].items: missing field'));
    expect(failure?.status).toBe(400);
    expect(failure?.type).toBe('invalid_request_error');
    expect(failure?.code).toBe('antigravity_bad_request');
    expect(failure?.message).toBe('Antigravity API error 400: function_declarations[3].parameters.properties[where].items: missing field');
  });

  it('401, 403 and 404 answer with their own status and the matching Anthropic error type', () => {
    expect(antigravityFailureOf(antigravityApiError(401, 'UNAUTHENTICATED'))).toMatchObject({ status: 401, type: 'authentication_error', code: 'antigravity_auth_unavailable' });
    expect(antigravityFailureOf(antigravityApiError(403, 'PERMISSION_DENIED'))).toMatchObject({ status: 403, type: 'permission_error', code: 'antigravity_permission_denied' });
    expect(antigravityFailureOf(antigravityApiError(404, 'NOT_FOUND'))).toMatchObject({ status: 404, type: 'not_found_error', code: 'antigravity_not_found' });
  });

  // The fallthrough is the load-bearing part: a 5xx is a gateway condition, and it must stay one.
  it('leaves 5xx unclassified so the 502 path and the bounded retry still own them', () => {
    expect(antigravityFailureOf(antigravityApiError(500, 'internal'))).toBeUndefined();
    expect(antigravityFailureOf(antigravityApiError(502, 'bad gateway'))).toBeUndefined();
    expect(antigravityFailureOf(antigravityApiError(503, 'no capacity available'))).toBeUndefined();
  });

  // The throw shape is a contract with routing.ts — a classified 4xx keeps the exact message shape, and a
  // 400 must never read as transient (that is the whole point: no retry can fix it).
  it('keeps the message shape and is NOT transient, so nothing retries a 400', () => {
    const err = antigravityApiError(400, 'INVALID_ARGUMENT');
    expect(err.message).toBe('Antigravity API error 400: INVALID_ARGUMENT');
    expect(isTransientProviderError(err.message)).toBe(false);
  });
});

describe('antigravityFailureOf (#190)', () => {
  it('carries the classified 429 and the horizon the server actually stated', () => {
    const failure = antigravityFailureOf(antigravityApiError(429, quota429('QUOTA_EXHAUSTED', '1h30m')));
    expect(failure?.status).toBe(429);
    expect(failure?.code).toBe(ANTIGRAVITY_QUOTA_EXHAUSTED_CODE);
    expect(failure?.cooldownSeconds).toBe(5_400); // the server's own 1h30m — never a default picked here
  });

  it('a spent window with NO stated horizon still classifies, and invents no cooldown of its own', () => {
    const failure = antigravityFailureOf(antigravityApiError(429, quota429('QUOTA_EXHAUSTED')));
    expect(failure?.code).toBe(ANTIGRAVITY_QUOTA_EXHAUSTED_CODE);
    expect(failure?.cooldownSeconds).toBeUndefined(); // the caller picks the fallback; this layer does not guess
  });

  // A sub-five-minute rate limit is the blip flavour: answered 429, but it must never write the long channel.
  it('a short rate limit classifies WITHOUT a cooldown horizon', () => {
    const failure = antigravityFailureOf(antigravityApiError(429, quota429('RATE_LIMIT_EXCEEDED', '10s')));
    expect(failure?.code).toBe(ANTIGRAVITY_RATE_LIMITED_CODE);
    expect(failure?.cooldownSeconds).toBeUndefined();
  });

  // The boundary that matters: below the instant-retry threshold nothing is carried, so the bounded retry runs.
  it('carries NOTHING for a 429 the pure layer declined, or for a non-429', () => {
    expect(antigravityFailureOf(antigravityApiError(429, quota429('RATE_LIMIT_EXCEEDED', '1s')))).toBeUndefined();
    expect(antigravityFailureOf(antigravityApiError(429, 'slow down'))).toBeUndefined();
    expect(antigravityFailureOf(antigravityApiError(503, 'no capacity available'))).toBeUndefined();
  });

  /*
   * ⚠ THIS is why the verdict is carried rather than re-read from the message. A DECLINED 429 quotes the raw
   * upstream body, and that body uses the very same words as a classified one — same status, same reason.
   * A string matcher over the message classifies both identically, and classifying the declined one stops
   * the bounded retry that declining exists to allow.
   */
  it('the declined message is indistinguishable from a classified one by its words alone', () => {
    const declined = antigravityApiError(429, quota429('RATE_LIMIT_EXCEEDED', '1s')).message;
    const classified = antigravityApiError(429, quota429('RATE_LIMIT_EXCEEDED', '10m')).message;
    for (const message of [declined, classified]) {
      expect(message).toContain('429');
      expect(message).toContain('RATE_LIMIT_EXCEEDED');
    }
    // Same vocabulary, opposite verdicts — only the carrier tells them apart.
    expect(antigravityFailureOf(antigravityApiError(429, quota429('RATE_LIMIT_EXCEEDED', '1s')))).toBeUndefined();
    expect(antigravityFailureOf(antigravityApiError(429, quota429('RATE_LIMIT_EXCEEDED', '10m')))).toBeDefined();
  });

  it('answers undefined for anything that is not a carrying Error', () => {
    expect(antigravityFailureOf(new Error('Codex API error 429: usage_limit_reached'))).toBeUndefined();
    expect(antigravityFailureOf('a string')).toBeUndefined();
    expect(antigravityFailureOf(undefined)).toBeUndefined();
    expect(antigravityFailureOf(null)).toBeUndefined();
  });

  // The attachment must not disturb the retryability contract the message shape IS.
  it('attaching the verdict leaves the message shape untouched', () => {
    const err = antigravityApiError(429, quota429('QUOTA_EXHAUSTED', '2h'));
    expect(err.message).toBe('Antigravity API error 429: QUOTA_EXHAUSTED');
    expect(isTransientProviderError(String(err))).toBe(true);
  });
});

describe('antigravityShouldTryNextHost', () => {
  it('moves on for a 429 and for the capacity 503', () => {
    expect(antigravityShouldTryNextHost(429, '{}')).toBe(true);
    expect(antigravityShouldTryNextHost(503, 'No capacity available for this model')).toBe(true);
  });

  it('stays put for an ordinary 503 and for client errors', () => {
    expect(antigravityShouldTryNextHost(503, 'backend unavailable')).toBe(false);
    expect(antigravityShouldTryNextHost(400, 'no capacity available')).toBe(false);
    expect(antigravityShouldTryNextHost(401, '')).toBe(false);
    expect(antigravityShouldTryNextHost(500, '')).toBe(false);
  });
});

// ----------------------------- The session-id fallback ----------------------------- //

describe('antigravityFallbackSessionId', () => {
  it('has the same shape as the content-derived id, so the upstream cannot tell them apart', () => {
    const stable = antigravityStableSessionId({ request: { contents: [{ role: 'user', parts: [{ text: 'hi' }] }] } })!;
    const fallback = antigravityFallbackSessionId('ffffffffffffffff');
    for (const id of [stable, fallback]) expect(id).toMatch(/^-\d+$/);
    expect(BigInt(fallback.slice(1))).toBeLessThanOrEqual(0x7fffffffffffffffn);
  });
});

// ----------------------------- Turns -> the Gemini payload ----------------------------- //

describe('buildAntigravityPayload', () => {
  it('lifts a system turn into systemInstruction, not into contents', () => {
    const out = buildAntigravityPayload({ messages: [
      { role: 'system', content: 'be brief' },
      { role: 'user', content: 'hi' },
    ] });
    expect(out.request.systemInstruction).toEqual({ role: 'user', parts: [{ text: 'be brief' }] });
    expect(out.request.contents).toEqual([{ role: 'user', parts: [{ text: 'hi' }] }]);
  });

  it('maps an assistant turn to role model', () => {
    const out = buildAntigravityPayload({ messages: [{ role: 'assistant', content: 'sure' }] });
    expect(out.request.contents).toEqual([{ role: 'model', parts: [{ text: 'sure' }] }]);
  });

  it('carries images as inlineData parts', () => {
    const out = buildAntigravityPayload({ messages: [
      { role: 'user', content: 'what is this', images: [{ mimeType: 'image/png', dataBase64: 'AAA' }] },
    ] });
    expect(out.request.contents[0].parts[1]).toEqual({ inlineData: { mimeType: 'image/png', data: 'AAA' } });
  });

  /*
   * #191: the Anthropic door normalizes `document` blocks into their own channel, and this wire has no
   * separate one — a PDF is an inlineData part exactly like an image, distinguished only by mimeType. Left
   * unwired, a Claude Code attach would reach the door and vanish before the payload, which is the same
   * silent-vision hole the door's Anthropic arm once had.
   */
  it('carries documents as inlineData parts, after the images', () => {
    const out = buildAntigravityPayload({ messages: [
      { role: 'user', content: 'read this',
        images: [{ mimeType: 'image/png', dataBase64: 'AAA' }],
        documents: [{ mimeType: 'application/pdf', dataBase64: 'JVBER' }] },
    ] });
    expect(out.request.contents[0].parts).toEqual([
      { text: 'read this' },
      { inlineData: { mimeType: 'image/png', data: 'AAA' } },
      { inlineData: { mimeType: 'application/pdf', data: 'JVBER' } },
    ]);
  });

  // A document with no text still has something to send — the attach must not be dropped with the turn.
  it('sends a document-only turn', () => {
    const out = buildAntigravityPayload({ messages: [
      { role: 'user', content: '', documents: [{ mimeType: 'application/pdf', dataBase64: 'JVBER' }] },
    ] });
    expect(out.request.contents).toEqual([
      { role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: 'JVBER' } }] },
    ]);
  });

  it('drops an empty turn rather than sending a part-less content', () => {
    expect(buildAntigravityPayload({ messages: [{ role: 'user', content: '' }] }).request.contents).toEqual([]);
  });

  it('omits tools entirely when there are none — no bare tools:[{}] rides the wire', () => {
    expect(buildAntigravityPayload({ messages: [{ role: 'user', content: 'hi' }] }).request.tools).toBeUndefined();
  });

  it('builds function declarations when tools are given', () => {
    const out = buildAntigravityPayload({
      messages: [{ role: 'user', content: 'hi' }],
      tools: [{ name: 'read', description: 'read a file', inputSchema: { type: 'object', properties: {} } }],
    });
    expect(out.request.tools[0].functionDeclarations[0].name).toBe('read');
  });

  // THE BINDING RULE: an upstream id is copied through; an absent one stays absent. A minted id is a
  // dangling pointer into a replay ledger this port deliberately does not build.
  it('copies tool-call ids and NEVER mints one', () => {
    const out = buildAntigravityPayload({ messages: [
      { role: 'assistant', content: '', toolCalls: [
        { id: 'up-1', name: 'read', argsJson: '{"path":"a"}' },
        { id: '', name: 'write', argsJson: '{}' },
      ] },
    ] });
    const [withId, withoutId] = out.request.contents[0].parts;
    expect(withId.functionCall.id).toBe('up-1');
    expect(withId.functionCall.args).toEqual({ path: 'a' });
    expect('id' in withoutId.functionCall).toBe(false);
  });

  it('wraps non-object tool arguments under params rather than sending a bare scalar', () => {
    const out = buildAntigravityPayload({ messages: [
      { role: 'assistant', content: '', toolCalls: [{ id: 'c1', name: 'x', argsJson: 'not json' }] },
    ] });
    expect(out.request.contents[0].parts[0].functionCall.args).toEqual({ params: 'not json' });
  });

  // The pairing rule forbids call and response parts in ONE content and wants the response content directly
  // after the calls — so a user turn carrying both results and text must split, results first.
  it('puts tool results in their own content, ahead of the turn text', () => {
    const out = buildAntigravityPayload({ messages: [
      { role: 'user', content: 'go' },
      { role: 'assistant', content: '', toolCalls: [{ id: 'c1', name: 'read', argsJson: '{}' }] },
      { role: 'user', content: 'thanks', toolResults: [{ callId: 'c1', content: 'file body' }] },
    ] });
    expect(out.request.contents.map((c: any) => c.role)).toEqual(['user', 'model', 'user', 'user']);
    expect(out.request.contents[2].parts).toEqual([
      { functionResponse: { id: 'c1', name: 'read', response: { result: 'file body' } } },
    ]);
    expect(out.request.contents[3].parts).toEqual([{ text: 'thanks' }]);
  });

  // A response carries the NAME of the call it answers; the turns only carry the id, so it is looked up.
  it('recovers the function name from the call that shares the id', () => {
    const out = buildAntigravityPayload({ messages: [
      { role: 'assistant', content: '', toolCalls: [{ id: 'c9', name: 'grep', argsJson: '{}' }] },
      { role: 'user', content: '', toolResults: [{ callId: 'c9', content: 'ok' }] },
    ] });
    expect(out.request.contents[1].parts[0].functionResponse.name).toBe('grep');
  });
});

// ----------------------------- The assembled request body ----------------------------- //

describe('buildAntigravityRequestBody', () => {
  const turn = () => ({ model: 'gemini-3-flash', messages: [{ role: 'user' as const, content: 'hello there' }], requestId: 'agent-1' });

  it('produces an envelope that pairs — the upstream would not reject it', () => {
    const body = buildAntigravityRequestBody({
      ...turn(),
      messages: [
        { role: 'user', content: 'go' },
        { role: 'assistant', content: '', toolCalls: [{ id: 'c1', name: 'read', argsJson: '{}' }] },
        { role: 'user', content: '', toolResults: [{ callId: 'c1', content: 'body' }] },
      ],
    });
    expect(validateAntigravityFunctionCallPairing(body)).toBeUndefined();
  });

  it('carries the project, the request id and the envelope metadata', () => {
    const body = buildAntigravityRequestBody({ ...turn(), projectId: 'example-project-1' });
    expect(body.project).toBe('example-project-1');
    expect(body.requestId).toBe('agent-1');
    expect(body.model).toBe('gemini-3-flash');
    expect(body.userAgent).toBe('antigravity');
    expect(body.requestType).toBe('agent');
  });

  it('omits project entirely when there is none, rather than sending an empty one', () => {
    expect('project' in buildAntigravityRequestBody(turn())).toBe(false);
  });

  // The content-derived id is upstream CACHE behaviour, not a nonce — a random value that quietly wins
  // would look fine and lose every cache hit.
  it('prefers the content-derived session id over the injected fallback', () => {
    const body = buildAntigravityRequestBody({ ...turn(), fallbackSessionId: '-999' });
    const stable = antigravityStableSessionId({ request: { contents: [{ role: 'user', parts: [{ text: 'hello there' }] }] } });
    expect(body.request.sessionId).toBe(stable);
    expect(body.request.sessionId).not.toBe('-999');
  });

  it('uses the fallback only when the payload carries no anchor text', () => {
    const body = buildAntigravityRequestBody({
      ...turn(),
      messages: [{ role: 'user', content: '', images: [{ mimeType: 'image/png', dataBase64: 'AAA' }] }],
      fallbackSessionId: '-999',
    });
    expect(body.request.sessionId).toBe('-999');
  });

  it('is stable across calls for the same conversation', () => {
    const first = buildAntigravityRequestBody(turn()).request.sessionId;
    const second = buildAntigravityRequestBody(turn()).request.sessionId;
    expect(first).toBe(second);
  });

  // The family fork table: Claude keeps its cap and gains VALIDATED tool mode; Gemini loses the cap.
  it('applies the Claude fork', () => {
    const body = buildAntigravityRequestBody({ ...turn(), model: 'claude-sonnet-4-6' });
    expect(body.request.toolConfig.functionCallingConfig.mode).toBe('VALIDATED');
  });

  it('does not apply the Claude fork to a Gemini model', () => {
    expect(buildAntigravityRequestBody(turn()).request.toolConfig).toBeUndefined();
  });

  it('repairs an unsigned leading function call rather than letting the upstream 400 it', () => {
    const body = buildAntigravityRequestBody({
      ...turn(),
      messages: [{ role: 'assistant', content: '', toolCalls: [{ id: 'c1', name: 'read', argsJson: '{}' }] }],
    });
    expect(body.request.contents[0].parts[0].thoughtSignature).toBe(ANTIGRAVITY_SYNTHETIC_SIGNATURE);
  });

  it('cleans tool schemas without touching replayed history', () => {
    const history = { role: 'assistant' as const, content: '', toolCalls: [{ id: 'c1', name: 'todo', argsJson: '{"title":"keep me","default":"also me"}' }] };
    const body = buildAntigravityRequestBody({
      ...turn(),
      messages: [history, { role: 'user', content: '', toolResults: [{ callId: 'c1', content: 'ok' }] }],
      tools: [{ name: 'todo', description: 'd', inputSchema: { type: 'object', properties: { a: { type: 'string', title: 'strip me' } } } }],
    });
    // The DATA keys survive; only the schema is rewritten.
    expect(body.request.contents[0].parts[0].functionCall.args).toEqual({ title: 'keep me', default: 'also me' });
    expect(JSON.stringify(body.request.tools)).not.toContain('strip me');
  });

  it('routes an image model through the image request type', () => {
    const body = buildAntigravityRequestBody({ ...turn(), model: 'gemini-3.1-flash-image' });
    expect(body.requestType).toBe('image_gen');
  });
});
