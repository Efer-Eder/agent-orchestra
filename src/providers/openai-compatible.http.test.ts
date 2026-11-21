// @vitest-environment node
/**
 * Contract test against a real HTTP server on localhost. It exercises the real
 * `fetch`, headers, JSON bodies, retries and timeouts, without any API key.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createOpenAICompatibleProvider } from './openai-compatible.ts';

type Handler = (req: IncomingMessage, body: string, res: ServerResponse) => void;

let server: Server;
let baseUrl = '';
let handler: Handler = () => undefined;
const seen: { method: string; url: string; auth: string; body: string }[] = [];

function reply(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function completion(content: string) {
  return {
    choices: [{ message: { role: 'assistant', content } }],
    usage: { prompt_tokens: 21, completion_tokens: 13, total_tokens: 34 },
  };
}

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = '';
    req.on('data', (c: Buffer) => (body += c.toString()));
    req.on('end', () => {
      seen.push({
        method: req.method ?? '',
        url: req.url ?? '',
        auth: req.headers.authorization ?? '',
        body,
      });
      handler(req, body, res);
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
});

beforeEach(() => {
  seen.length = 0;
});

function provider(timeoutMs = 2000) {
  return createOpenAICompatibleProvider({
    baseUrl,
    apiKey: 'sk-local-contract',
    model: 'local-model',
    timeoutMs,
    retryDelayMs: 5,
  });
}

describe('OpenAI-compatible contract over real HTTP', () => {
  it('lists models with the bearer key', async () => {
    handler = (_req, _b, res) => reply(res, 200, { data: [{ id: 'local-model' }] });
    expect(await provider().testConnection()).toEqual(['local-model']);
    expect(seen[0]).toMatchObject({ method: 'GET', url: '/v1/models' });
    expect(seen[0]?.auth).toBe('Bearer sk-local-contract');
  });

  it('plans through /chat/completions and reports real usage', async () => {
    handler = (_req, _b, res) =>
      reply(res, 200, completion('{"summary":"Plano","tasks":[{"title":"t","detail":"d"}]}'));
    const result = await provider().plan('Adicionar teste');
    expect(result.output.summary).toBe('Plano');
    expect(result.usage).toMatchObject({ inputTokens: 21, outputTokens: 13 });
    expect(seen[0]).toMatchObject({ method: 'POST', url: '/v1/chat/completions' });
    const body = JSON.parse(seen[0]!.body) as { model: string; messages: unknown[] };
    expect(body.model).toBe('local-model');
    expect(body.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('recovers from a 503 on the next attempt', async () => {
    let calls = 0;
    handler = (_req, _b, res) =>
      ++calls === 1
        ? reply(res, 503, { error: 'busy' })
        : reply(res, 200, completion('{"verdict":"approve","comments":[]}'));
    const result = await provider().review([]);
    expect(result.output.verdict).toBe('approve');
    expect(seen).toHaveLength(2);
  });

  it('maps 401 to unauthorized without retrying', async () => {
    handler = (_req, _b, res) => reply(res, 401, { error: 'bad key' });
    await expect(provider().plan('x')).rejects.toMatchObject({ kind: 'unauthorized' });
    expect(seen).toHaveLength(1);
  });

  it('times out on a server that never answers', async () => {
    handler = () => undefined;
    await expect(provider(100).plan('x')).rejects.toMatchObject({ kind: 'timeout' });
  });
});
