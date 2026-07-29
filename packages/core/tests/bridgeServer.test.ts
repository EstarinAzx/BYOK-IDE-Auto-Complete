// ---------------- bridgeServer.test.ts — Grok dispatch through both Bridge doors (#95) ---------------- //

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createServer } from 'http';
import * as http from 'http';
import type { AddressInfo } from 'net';
import { createBridgeServer, type BridgeDeps } from '../src/bridgeServer';
import { MAX_PROVIDER_ATTEMPTS, TRANSIENT_FAILURES_BEFORE_COOLDOWN, TRANSIENT_COOLDOWN_SECONDS } from '../src/routing';
import type { Provider } from '../src/catalog';

// The Grok catalog row — id 'xai', the subscription-proxy base (grok-build routes there).
const GROK: Provider = { id: 'xai', label: 'Grok', baseUrl: 'https://cli-chat-proxy.grok.com/v1', defaultModel: 'grok-build', apiKeyEnv: '', kind: 'xai-oauth' };

// A canned Grok Responses SSE stream (same wire as Codex): one text delta + a clean terminal frame.
const grokSse = (): Response => {
  const text =
    'event: response.output_text.delta\ndata: {"delta":"Hello from Grok"}\n\n' +
    'event: response.completed\ndata: {"response":{"output":[{"type":"message","content":[{"type":"output_text","text":"Hello from Grok"}]}]}}\n\n';
  const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close(); } });
  return new Response(body, { status: 200 });
};

// Grab a free loopback port so the test server never clashes with a fixed one.
const freePort = (): Promise<number> => new Promise((resolve, reject) => {
  const s = createServer();
  s.on('error', reject);
  s.listen(0, '127.0.0.1', () => { const p = (s.address() as AddressInfo).port; s.close(() => resolve(p)); });
});

// Minimal BridgeDeps — only the xai path + routing + auth matter here; every other resolver is inert.
const makeDeps = (over: Partial<BridgeDeps>): BridgeDeps => ({
  providers: [GROK],
  modelMap: () => ({}),
  customBaseUrl: () => '',
  keyFor: async () => '',
  clientFor: async () => undefined,
  codexSignedIn: async () => false,
  codexCreds: async () => undefined,
  anthropicSignedIn: async () => false,
  anthropicCreds: async () => undefined,
  xaiSignedIn: async () => true,
  xaiCreds: async () => ({ accessToken: 'tok' }),
  effort: () => 'medium',
  activeProviderId: () => 'xai',
  routingMap: () => ({ families: {}, aliases: [] }),
  aliasPickerShowsModel: () => false,
  aliasOnlyModels: () => false,
  port: () => 0,
  accessSecret: () => 'secret',
  log: () => {},
  ...over,
});

// POST over node http (NOT fetch — fetch is stubbed for the upstream xai call) → { status, body }.
const post = (port: number, path: string, payload: unknown): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      { host: '127.0.0.1', port, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), Authorization: 'Bearer secret' } },
      (res) => { let body = ''; res.setEncoding('utf8'); res.on('data', (c) => (body += c)); res.on('end', () => resolve({ status: res.statusCode ?? 0, body })); },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });

// Stand up the real listener on a free port, run the assertions, always tear it down.
const runServer = async (deps: BridgeDeps, fn: (port: number) => Promise<void>): Promise<void> => {
  const port = await freePort();
  const server = createBridgeServer({ ...deps, port: () => port });
  await server.start();
  try { await fn(port); } finally { server.stop(); }
};

describe('Bridge — Grok dispatch (#95)', () => {
  afterEach(() => vi.unstubAllGlobals());

  // OpenAI door: a Grok Target streams its reply back as OpenAI chat.completion SSE.
  it('streams a Grok Target through the OpenAI door (/v1/chat/completions)', async () => {
    vi.stubGlobal('fetch', async () => grokSse());
    await runServer(makeDeps({}), async (port) => {
      const { status, body } = await post(port, '/v1/chat/completions', { model: 'xai', stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(200);
      expect(body).toContain('Hello from Grok');
    });
  });

  // Anthropic door: the same Grok Target streams back as Anthropic Messages SSE (this IS Claude Code's route).
  it('streams a Grok Target through the Anthropic door (/v1/messages)', async () => {
    vi.stubGlobal('fetch', async () => grokSse());
    await runServer(makeDeps({}), async (port) => {
      const { status, body } = await post(port, '/v1/messages', { model: 'xai', max_tokens: 100, stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(200);
      expect(body).toContain('Hello from Grok');
    });
  });

  // Signed-out Grok on the OpenAI door → a clean 401, NOT an empty SSE envelope (the #87/#88 failure mode).
  it('returns a real 401 for a signed-out Grok Target on the OpenAI door', async () => {
    await runServer(makeDeps({ xaiCreds: async () => undefined }), async (port) => {
      const { status, body } = await post(port, '/v1/chat/completions', { model: 'xai', stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(401);
      expect(body).not.toContain('data:'); // an error, not a silent event-stream
    });
  });

  // Signed-out Grok on the Anthropic door → a clean 401 before any SSE head (checked eagerly in startProviderStream).
  it('returns a real 401 for a signed-out Grok Target on the Anthropic door', async () => {
    await runServer(makeDeps({ xaiCreds: async () => undefined }), async (port) => {
      const { status } = await post(port, '/v1/messages', { model: 'xai', max_tokens: 100, stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(401);
    });
  });

  // Non-streaming /v1/messages — Claude Code's `/model` validation probe. Must be a JSON Messages object
  // carrying a usage block, NOT an SSE stream: reading usage.input_tokens off an event-stream body is what
  // crashed /model with "undefined is not an object (evaluating 'B.usage.input_tokens')".
  it('answers a non-streaming /v1/messages with a JSON Messages object carrying usage.input_tokens', async () => {
    vi.stubGlobal('fetch', async () => grokSse());
    await runServer(makeDeps({}), async (port) => {
      const { status, body } = await post(port, '/v1/messages', { model: 'xai', max_tokens: 100, stream: false, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(200);
      expect(body).not.toContain('event:'); // a JSON body, never an SSE stream
      const parsed = JSON.parse(body);
      expect(parsed.type).toBe('message');
      expect(typeof parsed.usage.input_tokens).toBe('number');
      expect(parsed.content).toEqual([{ type: 'text', text: 'Hello from Grok' }]);
      expect(parsed.stop_reason).toBe('end_turn');
    });
  });
});

// #166: a failed Codex turn used to leave either door as `502 provider request failed`, whatever went wrong.
// A 502 tells Claude Code "the server broke, retry" — so it retried an oversized conversation that could only
// get bigger. These assert the door answers with the classified status instead, on BOTH doors, and that an
// unrecognised failure still stays a 502.
describe('Bridge — classified Codex failures (#166)', () => {
  afterEach(() => vi.unstubAllGlobals());

  const CODEX: Provider = { id: 'codex', label: 'Codex', baseUrl: 'https://chatgpt.com/backend-api/codex', defaultModel: 'gpt-5.4', apiKeyEnv: '', kind: 'codex' };

  // Deps whose only usable Provider is Codex, signed in with the account id the Responses request requires.
  const codexDeps = (over: Partial<BridgeDeps> = {}): BridgeDeps => makeDeps({
    providers: [CODEX],
    codexSignedIn: async () => true,
    codexCreds: async () => ({ accessToken: 'tok', accountId: 'acct' }),
    xaiSignedIn: async () => false,
    xaiCreds: async () => undefined,
    activeProviderId: () => 'codex',
    ...over,
  });

  // The recorded failure verbatim (#163): the backend rejects on its own window with a 400 naming the cause.
  const windowRejection = () => new Response(
    '{"error":{"message":"Your input exceeds the context window of this model.","type":"invalid_request_error","code":"context_length_exceeded"}}',
    { status: 400 },
  );

  // OpenAI door — the exceeded window comes back as a client error naming the cause, not a gateway error.
  it('answers an exceeded context window with 400 on the OpenAI door', async () => {
    vi.stubGlobal('fetch', async () => windowRejection());
    await runServer(codexDeps(), async (port) => {
      const { status, body } = await post(port, '/v1/chat/completions', { model: 'codex', stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(400);
      expect(JSON.parse(body).error.type).toBe('invalid_request_error');
    });
  });

  // Anthropic door — THIS is Claude Code's route, and the one where a 502 caused the retry loop.
  it('answers an exceeded context window with 400 on the Anthropic door', async () => {
    vi.stubGlobal('fetch', async () => windowRejection());
    await runServer(codexDeps(), async (port) => {
      const { status } = await post(port, '/v1/messages', { model: 'codex', max_tokens: 100, stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(400);
    });
  });

  // An expired / revoked credential is an authentication error, so the user is told to sign in again.
  it('answers an unavailable credential with 401', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"error":{"message":"Missing bearer token.","type":"authentication_error"}}', { status: 401 }));
    await runServer(codexDeps(), async (port) => {
      const { status } = await post(port, '/v1/messages', { model: 'codex', max_tokens: 100, stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(401);
    });
  });

  // The safety property, end to end: a genuine upstream outage must NOT be relabelled a client error.
  it('keeps 502 for an unrecognised upstream failure', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"error":{"message":"internal server error"}}', { status: 500 }));
    await runServer(codexDeps(), async (port) => {
      const { status } = await post(port, '/v1/chat/completions', { model: 'codex', stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(502);
    });
  });

  // The operator's handle on the four cases: the Bridge log names the classified code.
  it('logs the classified code', async () => {
    vi.stubGlobal('fetch', async () => windowRejection());
    const lines: string[] = [];
    await runServer(codexDeps({ log: (m) => lines.push(m) }), async (port) => {
      await post(port, '/v1/chat/completions', { model: 'codex', stream: true, messages: [{ role: 'user', content: 'hi' }] });
    });
    expect(lines.some((l) => l.includes('context_length_exceeded'))).toBe(true);
  });
});

// #168: a transient upstream failure used to cost the user the whole turn. These assert the retry only fires
// where NOTHING was delivered, never fires for a failure #166 classified, is bounded, and that repeated
// failures put the provider on the SHORT cooldown channel.
describe('Bridge — transient retry and cooldown (#168)', () => {
  afterEach(() => vi.unstubAllGlobals());

  const CODEX: Provider = { id: 'codex', label: 'Codex', baseUrl: 'https://chatgpt.com/backend-api/codex', defaultModel: 'gpt-5.4', apiKeyEnv: '', kind: 'codex' };

  const codexDeps = (over: Partial<BridgeDeps> = {}): BridgeDeps => makeDeps({
    providers: [CODEX],
    codexSignedIn: async () => true,
    codexCreds: async () => ({ accessToken: 'tok', accountId: 'acct' }),
    xaiSignedIn: async () => false,
    xaiCreds: async () => undefined,
    activeProviderId: () => 'codex',
    ...over,
  });

  // A clean Responses turn (the Codex/Grok wire): one text delta then the terminal frame.
  const goodSse = (): Response => {
    const text =
      'event: response.output_text.delta\ndata: {"delta":"recovered"}\n\n' +
      'event: response.completed\ndata: {"response":{"output":[{"type":"message","content":[{"type":"output_text","text":"recovered"}]}]}}\n\n';
    const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close(); } });
    return new Response(body, { status: 200 });
  };

  // A 200 that delivers a delta and THEN breaks — the case that must never be retried. Enqueue-then-error in
  // one tick would NOT model this: controller.error() discards the queue, so the delta would never be read.
  // Driving it from pull() makes the delta genuinely reach the consumer before the socket drops.
  const partialThenBreak = (): Response => {
    let sent = false;
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        if (!sent) {
          sent = true;
          c.enqueue(new TextEncoder().encode('event: response.output_text.delta\ndata: {"delta":"half a "}\n\n'));
          return;
        }
        c.error(new Error('socket hang up'));
      },
    });
    return new Response(body, { status: 200 });
  };

  const badGateway = () => new Response('{"error":{"message":"internal server error"}}', { status: 500 });

  // Count upstream attempts so "was it retried" is an observable, not an inference.
  const countingFetch = (responses: (() => Response)[]) => {
    const state = { calls: 0 };
    vi.stubGlobal('fetch', async () => {
      const make = responses[Math.min(state.calls, responses.length - 1)];
      state.calls += 1;
      return make();
    });
    return state;
  };

  it('retries a stream that failed before delivering anything (OpenAI door)', async () => {
    const state = countingFetch([badGateway, goodSse]);
    await runServer(codexDeps(), async (port) => {
      const { status, body } = await post(port, '/v1/chat/completions', { model: 'codex', stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(200);
      expect(body).toContain('recovered');
    });
    expect(state.calls).toBe(2);
  });

  // Claude Code's route — the one where losing the turn actually hurts.
  it('retries a stream that failed before delivering anything (Anthropic door)', async () => {
    const state = countingFetch([badGateway, goodSse]);
    await runServer(codexDeps(), async (port) => {
      const { status, body } = await post(port, '/v1/messages', { model: 'codex', max_tokens: 100, stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(200);
      expect(body).toContain('recovered');
    });
    expect(state.calls).toBe(2);
  });

  // Never discard delivered content: a torn stream surfaces what arrived, it does not start over.
  it('never retries a stream that already delivered content', async () => {
    const state = countingFetch([partialThenBreak]);
    await runServer(codexDeps(), async (port) => {
      const { status, body } = await post(port, '/v1/chat/completions', { model: 'codex', stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(200);
      expect(body).toContain('half a ');
    });
    expect(state.calls).toBe(1);
  });

  // A #166-classified failure cannot succeed on a retry, so it must not cost one.
  it('never retries a classified client error', async () => {
    const state = countingFetch([() => new Response('{"error":{"code":"context_length_exceeded","message":"too big"}}', { status: 400 })]);
    await runServer(codexDeps(), async (port) => {
      const { status } = await post(port, '/v1/chat/completions', { model: 'codex', stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(400);
    });
    expect(state.calls).toBe(1);
  });

  // The bound: a provider that is genuinely down fails the request, it does not retry forever.
  it('bounds the attempts and still answers 502 when they are exhausted', async () => {
    const state = countingFetch([badGateway]);
    await runServer(codexDeps(), async (port) => {
      const { status } = await post(port, '/v1/chat/completions', { model: 'codex', stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(502);
    });
    expect(state.calls).toBe(MAX_PROVIDER_ATTEMPTS);
  });

  // Repeated failed REQUESTS (not attempts) trip the short channel — and the log says so, with #168 not #161.
  it('cools the provider on the short channel after repeated failed requests', async () => {
    countingFetch([badGateway]);
    const lines: string[] = [];
    await runServer(codexDeps({ log: (m) => lines.push(m) }), async (port) => {
      for (let i = 0; i < TRANSIENT_FAILURES_BEFORE_COOLDOWN; i++)
        await post(port, '/v1/chat/completions', { model: 'codex', stream: true, messages: [{ role: 'user', content: 'hi' }] });
    });
    expect(lines.some((l) => l.includes('#168') && l.includes('retrying'))).toBe(true);
    const cooled = lines.find((l) => l.includes('#168') && l.includes('cooling down'));
    expect(cooled).toBeDefined();
    // The blip channel, never the plan-window one — #161's line is the multi-day answer.
    expect(cooled).not.toContain('#161');
    expect(cooled).toContain(`${TRANSIENT_COOLDOWN_SECONDS}s`);
  });
});

// ---------------- #169: API-key Providers report real token usage ---------------- //

// A plain OpenAI-compatible catalog row — no `kind`, so it falls through to the keyed executor.
const KEYED: Provider = { id: 'opencode-go', label: 'OpenCode Go', baseUrl: 'https://opencode.ai/zen/go/v1', defaultModel: 'gpt-x', apiKeyEnv: 'OPENCODE_API_KEY' };

// A stand-in for the OpenAI SDK client `deps.clientFor` hands back: yields the given chunks and records the
// request body, so a test can assert BOTH what was asked for and what came back.
const keyedClient = (chunks: unknown[], seen: { body?: any } = {}) => ({
  seen,
  client: {
    chat: {
      completions: {
        create: async (body: any) => {
          seen.body = body;
          return (async function* () { for (const c of chunks) yield c; })();
        },
      },
    },
  } as any,
});

// One text chunk, then the terminal usage chunk an opted-in stream sends — note its EMPTY choices array.
const KEYED_TEXT = { choices: [{ delta: { content: 'Hello from the key' } }] };
const KEYED_USAGE = { choices: [], usage: { prompt_tokens: 1000, prompt_tokens_details: { cached_tokens: 800 }, completion_tokens: 300 } };

const keyedDeps = (chunks: unknown[], seen: { body?: any } = {}): BridgeDeps => {
  const { client } = keyedClient(chunks, seen);
  return makeDeps({ providers: [KEYED], activeProviderId: () => 'opencode-go', clientFor: async () => client });
};

describe('Bridge — API-key Provider usage (#169)', () => {
  afterEach(() => vi.unstubAllGlobals());

  // The opt-in itself: chat-completions streams omit usage entirely unless the request asks for it, so both
  // keyed call sites must send stream_options. The OpenAI door's executor is the first of the two.
  it('asks for usage on the keyed stream from the OpenAI door', async () => {
    const seen: { body?: any } = {};
    await runServer(keyedDeps([KEYED_TEXT, KEYED_USAGE], seen), async (port) => {
      await post(port, '/v1/chat/completions', { model: 'opencode-go', stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(seen.body.stream_options).toEqual({ include_usage: true });
    });
  });

  // The second call site — startProviderStream's keyed tail, which is what Claude Code actually goes through.
  it('asks for usage on the keyed stream from the Anthropic door', async () => {
    const seen: { body?: any } = {};
    await runServer(keyedDeps([KEYED_TEXT, KEYED_USAGE], seen), async (port) => {
      await post(port, '/v1/messages', { model: 'opencode-go', max_tokens: 100, stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(seen.body.stream_options).toEqual({ include_usage: true });
    });
  });

  // The payoff: the final chunk's counts reach the client as real numbers, split by #165's convention —
  // cached prompt tokens in cache-read, the uncached remainder in input. Only the Anthropic door forwards
  // usage to the client, so this is the door the criterion is read through.
  it('reports the real counts on the Anthropic door, cached tokens split into cache-read', async () => {
    await runServer(keyedDeps([KEYED_TEXT, KEYED_USAGE]), async (port) => {
      const { status, body } = await post(port, '/v1/messages', { model: 'opencode-go', max_tokens: 100, stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(200);
      expect(body).toContain('Hello from the key');
      const delta = body.split('\n').filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6))).find((d) => d.type === 'message_delta');
      expect(delta.usage).toMatchObject({ input_tokens: 200, cache_creation_input_tokens: 0, cache_read_input_tokens: 800, output_tokens: 300 });
    });
  });

  // A Provider that IGNORES the opt-in sends no usage chunk at all. The turn must still complete cleanly, and
  // no usage event may be synthesized — the counts stay the encoder's zeroed default rather than a fake.
  it('completes cleanly with no usage event when the Provider ignores the opt-in', async () => {
    await runServer(keyedDeps([KEYED_TEXT]), async (port) => {
      const { status, body } = await post(port, '/v1/messages', { model: 'opencode-go', max_tokens: 100, stream: true, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(200);
      expect(body).toContain('Hello from the key');
      const delta = body.split('\n').filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6))).find((d) => d.type === 'message_delta');
      expect(delta.usage).toEqual({ output_tokens: 0 });
    });
  });

  // The usage chunk carries an EMPTY choices array; a reader that assumes every chunk has a choice would
  // mangle it. Nothing about the non-streaming reply may change — same text, same JSON shape as before.
  it('leaves a non-streaming keyed reply unaffected', async () => {
    await runServer(keyedDeps([KEYED_TEXT, KEYED_USAGE]), async (port) => {
      const { status, body } = await post(port, '/v1/chat/completions', { model: 'opencode-go', stream: false, messages: [{ role: 'user', content: 'hi' }] });
      expect(status).toBe(200);
      expect(body).not.toContain('event:');
      expect(JSON.parse(body).choices[0].message.content).toBe('Hello from the key');
    });
  });
});
