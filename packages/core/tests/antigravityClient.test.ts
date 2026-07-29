// ------------- antigravityClient.test.ts — the #189 turn path, driven over CAPTURED wire bytes ------------- //

/*
 * The socket is stubbed; the BYTES are not invented. The streaming fixture below is a verbatim capture from
 * the #186 auth spike (`D:\scratch\antigravity-spike\out\FIXTURE-toolcall-stream.sse.txt`) — a real
 * Antigravity turn that made a real tool call — so this exercises the whole client (host chain, request
 * build, SSE split, frame parse, event mapping) against wire the upstream actually produced.
 *
 * Two things in it are load-bearing and could not be reproduced by hand:
 *   - `functionCall.id` is the UPSTREAM'S OWN id ("5hp24qb7"). The binding rule is asserted against a real
 *     one here, not a fabricated one — this is the evidence that the upstream does mint its own ids and
 *     that ours pass them through untouched.
 *   - the same part carries a `thoughtSignature` and NO `thought` flag, and the terminal chunk repeats the
 *     usage block. Both are shapes a hand-written fixture gets wrong.
 *
 * Scrubbed from the capture, deliberately: the real Cloud Code project id (an account-identifying value —
 * this repo uses the placeholder `example-project-1`) and the bulk of the opaque signature blob.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { antigravityStream, antigravityRequest } from '../src/antigravityClient';
import {
  ANTIGRAVITY_DAILY_HOST, ANTIGRAVITY_PROD_HOST, ANTIGRAVITY_HTTP_USER_AGENT,
  type AntigravityCreds,
} from '../src/catalog';

// ----------------------------- The captured wire ----------------------------- //

const CAPTURED_TOOLCALL_SSE = [
  'data: {"response": {"candidates": [{"content": {"role": "model","parts": [{"thoughtSignature": "EpUFCpIFARFNMg9gRRWY7S9ev8ODKx91C67n","functionCall": {"name": "get_weather","args": {"city": "Paris"},"id": "5hp24qb7"}}]}}],"usageMetadata": {"promptTokenCount": 48,"candidatesTokenCount": 16,"totalTokenCount": 202,"thoughtsTokenCount": 138},"modelVersion": "gemini-3.1-pro-low","responseId": "atBpapXTJ_fWjuMPydXcyAI"},"traceId": "429bf353617a2a3c","metadata": {}}',
  '',
  'data: {"response": {"candidates": [{"content": {"role": "model","parts": [{"text": ""}]},"finishReason": "STOP"}],"usageMetadata": {"promptTokenCount": 48,"candidatesTokenCount": 16,"totalTokenCount": 202,"thoughtsTokenCount": 138},"modelVersion": "gemini-3.1-pro-low","responseId": "atBpapXTJ_fWjuMPydXcyAI"},"traceId": "429bf353617a2a3c","metadata": {}}',
  '',
].join('\n');

// A plain answer turn, same envelope shape as the capture.
const TEXT_SSE = [
  'data: {"response": {"candidates": [{"content": {"role": "model","parts": [{"text": "SPIKE_OK"}]}}]}}',
  '',
  'data: {"response": {"candidates": [{"content": {"role": "model","parts": [{"thought": true,"text": "reasoning, not answer"}]},"finishReason": "STOP"}],"usageMetadata": {"promptTokenCount": 10,"candidatesTokenCount": 3,"thoughtsTokenCount": 7}}}',
  '',
].join('\n');

// ----------------------------- Harness ----------------------------- //

const creds = (over: Partial<AntigravityCreds> = {}): AntigravityCreds =>
  ({ accessToken: 'test-token', projectId: 'example-project-1', ...over });

const sseResponse = (body: string) => new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });

type Call = { url: string; init: RequestInit };

// Stub fetch with a queue of answers, recording every attempt so the host chain is observable.
const stubFetch = (answers: (Response | (() => never))[]): Call[] => {
  const calls: Call[] = [];
  let n = 0;
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    const answer = answers[Math.min(n++, answers.length - 1)];
    if (typeof answer === 'function') answer();
    return answer as Response;
  });
  return calls;
};

const collect = async (stream: AsyncIterable<any>) => {
  const out: any[] = [];
  for await (const event of stream) out.push(event);
  return out;
};

const turn = () => ({ creds: creds(), baseUrl: ANTIGRAVITY_DAILY_HOST, model: 'gemini-3.1-pro-low', messages: [{ role: 'user' as const, content: 'weather in Paris?' }] });

afterEach(() => vi.unstubAllGlobals());

// ----------------------------- The request the client actually sends ----------------------------- //

describe('antigravityStream — the outbound request', () => {
  it('opens the daily host on the streaming path, with the SSE flag', async () => {
    const calls = stubFetch([sseResponse(TEXT_SSE)]);
    await collect(antigravityStream(turn()));
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(`${ANTIGRAVITY_DAILY_HOST}/v1internal:streamGenerateContent?alt=sse`);
    expect(calls[0].init.method).toBe('POST');
  });

  it('sends the mirrored headers with the pinned client version', async () => {
    const calls = stubFetch([sseResponse(TEXT_SSE)]);
    await collect(antigravityStream(turn()));
    expect(calls[0].init.headers).toEqual({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
      'User-Agent': ANTIGRAVITY_HTTP_USER_AGENT,
    });
  });

  // Compared against the SHAPE of a request the upstream really accepted (spike capture
  // request-gemini-stream.json): the envelope keys, and a Gemini payload nested under `request`.
  it('builds the envelope the upstream accepted in the spike', async () => {
    const calls = stubFetch([sseResponse(TEXT_SSE)]);
    await collect(antigravityStream(turn()));
    const body = JSON.parse(String(calls[0].init.body));
    expect(Object.keys(body).sort()).toEqual(['model', 'project', 'request', 'requestId', 'requestType', 'userAgent']);
    expect(body.model).toBe('gemini-3.1-pro-low');
    expect(body.userAgent).toBe('antigravity');
    expect(body.requestType).toBe('agent');
    expect(body.project).toBe('example-project-1');
    expect(body.requestId).toMatch(/^agent-[0-9a-f-]{36}$/);
    expect(body.request.contents).toEqual([{ role: 'user', parts: [{ text: 'weather in Paris?' }] }]);
    expect(body.request.sessionId).toMatch(/^-\d+$/);
  });

  it('refuses before opening a socket when the bundle has no access token', async () => {
    const calls = stubFetch([sseResponse(TEXT_SSE)]);
    await expect(collect(antigravityStream({ ...turn(), creds: creds({ accessToken: undefined }) }))).rejects.toThrow(/not signed in/i);
    expect(calls).toHaveLength(0);
  });

  // An absent project is a hard 400 at request-build time — and 400 keeps it OUT of the transient-retry
  // predicate, because no number of retries conjures a Cloud Code project.
  it('refuses before opening a socket when the bundle has no Cloud Code project', async () => {
    const calls = stubFetch([sseResponse(TEXT_SSE)]);
    await expect(collect(antigravityStream({ ...turn(), creds: creds({ projectId: undefined }) })))
      .rejects.toThrow(/Antigravity API error 400/);
    expect(calls).toHaveLength(0);
  });
});

// ----------------------------- The captured turn, mapped ----------------------------- //

describe('antigravityStream — a real captured tool-call turn', () => {
  it('emits the upstream function call with its OWN id, untouched', async () => {
    stubFetch([sseResponse(CAPTURED_TOOLCALL_SSE)]);
    const events = await collect(antigravityStream(turn()));
    const call = events.find((e) => e.type === 'tool_call');
    expect(call.call).toEqual({ id: '5hp24qb7', name: 'get_weather', argsJson: '{"city":"Paris"}' });
  });

  // The signature blob rides on the same part as the call. Leaking it as answer text would put an opaque
  // token in front of the user, and it must not become an id either.
  it('never leaks the thought signature as text or as an id', async () => {
    stubFetch([sseResponse(CAPTURED_TOOLCALL_SSE)]);
    const events = await collect(antigravityStream(turn()));
    expect(events.filter((e) => e.type === 'text')).toEqual([]);
    expect(JSON.stringify(events)).not.toContain('EpUFCpIF');
  });

  // Thinking tokens are BILLED OUTPUT and this wire reports them separately — reading candidates alone
  // under-reports a reasoning turn enormously (#187/#186: 16 vs 138 here).
  it('bills thinking tokens as output, once, from the terminal chunk', async () => {
    stubFetch([sseResponse(CAPTURED_TOOLCALL_SSE)]);
    const usage = (await collect(antigravityStream(turn()))).filter((e) => e.type === 'usage');
    expect(usage).toHaveLength(1);
    expect(usage[0].usage).toEqual({
      input_tokens: 48, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 16 + 138,
    });
  });

  it('streams answer text and drops reasoning text', async () => {
    stubFetch([sseResponse(TEXT_SSE)]);
    const events = await collect(antigravityStream(turn()));
    expect(events.filter((e) => e.type === 'text').map((e) => e.text)).toEqual(['SPIKE_OK']);
  });

  // The wire sends no [DONE] sentinel; a mapper waiting for one would hang the turn forever.
  it('terminates without a [DONE] sentinel', async () => {
    stubFetch([sseResponse(CAPTURED_TOOLCALL_SSE)]);
    await expect(collect(antigravityStream(turn()))).resolves.toBeDefined();
  });
});

// ----------------------------- The daily-first host chain ----------------------------- //

describe('antigravityStream — the host chain', () => {
  const capacity503 = () => new Response('{"error":{"message":"No capacity available for this model"}}', { status: 503 });

  it('falls through to production on a capacity 503, in that order', async () => {
    const calls = stubFetch([capacity503(), sseResponse(TEXT_SSE)]);
    const events = await collect(antigravityStream(turn()));
    expect(calls.map((c) => c.url)).toEqual([
      `${ANTIGRAVITY_DAILY_HOST}/v1internal:streamGenerateContent?alt=sse`,
      `${ANTIGRAVITY_PROD_HOST}/v1internal:streamGenerateContent?alt=sse`,
    ]);
    expect(events.some((e) => e.type === 'text')).toBe(true);
  });

  it('falls through on a 429 and on a transport error', async () => {
    for (const first of [new Response('{}', { status: 429 }), (() => { throw new Error('ECONNRESET'); }) as () => never]) {
      const calls = stubFetch([first as Response, sseResponse(TEXT_SSE)]);
      await collect(antigravityStream(turn()));
      expect(calls).toHaveLength(2);
      vi.unstubAllGlobals();
    }
  });

  // A 401 cannot be fixed by asking a different host — burning the fallback on it would double every
  // signed-out turn's latency for nothing.
  it('does NOT fall through on an auth failure', async () => {
    const calls = stubFetch([new Response('bad token', { status: 401 })]);
    await expect(collect(antigravityStream(turn()))).rejects.toThrow('Antigravity API error 401: bad token');
    expect(calls).toHaveLength(1);
  });

  it('surfaces the last host failure rather than looping', async () => {
    const calls = stubFetch([capacity503(), capacity503()]);
    await expect(collect(antigravityStream(turn()))).rejects.toThrow(/Antigravity API error 503/);
    expect(calls).toHaveLength(2);
  });

  // Re-minting the request id per host would make one turn look like two to the upstream.
  it('reuses the SAME request body across the fallback', async () => {
    const calls = stubFetch([capacity503(), sseResponse(TEXT_SSE)]);
    await collect(antigravityStream(turn()));
    expect(calls[0].init.body).toBe(calls[1].init.body);
  });

  it('pins to a deliberate baseUrl override instead of falling back', async () => {
    const calls = stubFetch([capacity503(), sseResponse(TEXT_SSE)]);
    await expect(collect(antigravityStream({ ...turn(), baseUrl: 'https://example.test' }))).rejects.toThrow(/503/);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://example.test/v1internal:streamGenerateContent?alt=sse');
  });
});

// ----------------------------- The non-streaming path ----------------------------- //

describe('antigravityRequest', () => {
  it('uses the generateContent endpoint with no SSE flag', async () => {
    const calls = stubFetch([new Response(JSON.stringify({ response: { candidates: [{ content: { parts: [{ text: 'hello' }] } }] } }), { status: 200 })]);
    const text = await antigravityRequest(turn());
    expect(calls[0].url).toBe(`${ANTIGRAVITY_DAILY_HOST}/v1internal:generateContent`);
    expect(text).toBe('hello');
  });

  it('drops reasoning text from the folded answer, exactly as the stream does', async () => {
    stubFetch([new Response(JSON.stringify({ response: { candidates: [{ content: { parts: [
      { thought: true, text: 'thinking' }, { text: 'answer' },
    ] } }] } }), { status: 200 })]);
    expect(await antigravityRequest(turn())).toBe('answer');
  });
});
