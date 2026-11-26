import { describe, expect, it, vi } from 'vitest';
import { AGENTS } from '../domain/agents.ts';
import {
  createOpenAICompatibleProvider,
  FILES_PLACEHOLDER,
  ProviderError,
} from './openai-compatible.ts';
import { createTauriTransport, toProviderError, type ChannelLike } from './tauri-transport.ts';

type Call = [string, Record<string, unknown> | undefined];

/** Fake Rust side: records commands and answers `provider_complete` with a script. */
function fakeRust(
  answer: (
    args: Record<string, unknown>,
    channel: ChannelLike<{ delta: string }>,
  ) => Promise<unknown>,
) {
  const calls: Call[] = [];
  let channel: ChannelLike<{ delta: string }> | null = null;
  const invoke = vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
    calls.push([cmd, args]);
    if (cmd === 'provider_complete') return answer(args!, channel!);
    if (cmd === 'provider_list_models') return ['m1', 'm2'];
    return true;
  });
  const createChannel = <T>() => {
    const c: ChannelLike<T> = { onmessage: () => undefined };
    channel = c as unknown as ChannelLike<{ delta: string }>;
    return c;
  };
  let n = 0;
  return {
    calls,
    deps: { invoke: invoke as never, createChannel, newId: () => `req-${++n}` },
  };
}

const ok = {
  content: '{"summary":"s","tasks":[{"title":"t","detail":"d"}]}',
  usage: { inputTokens: 5, outputTokens: 3 },
  streamed: false,
};

describe('Tauri transport', () => {
  it('sends no key from the UI and reports real usage', async () => {
    const rust = fakeRust(async () => ok);
    const transport = createTauriTransport({ baseUrl: 'https://api.example.test/v1/' }, rust.deps);
    const provider = createOpenAICompatibleProvider({
      baseUrl: 'https://api.example.test/v1',
      model: 'm',
      transport,
    });
    const result = await provider.plan('x');
    expect(result.usage).toEqual({ inputTokens: 5, outputTokens: 3, synthetic: false });
    const [cmd, args] = rust.calls[0]!;
    expect(cmd).toBe('provider_complete');
    const request = args!.request as Record<string, unknown>;
    expect(request.baseUrl).toBe('https://api.example.test/v1');
    expect(request.requestId).toBe('req-1');
    expect(JSON.stringify(args)).not.toMatch(/apiKey|Authorization|Bearer/i);
  });

  it('streams deltas from the Rust channel', async () => {
    const rust = fakeRust(async (_args, channel) => {
      channel.onmessage({ delta: 'Olá' });
      channel.onmessage({ delta: ', mundo' });
      return { content: 'Olá, mundo', usage: null, streamed: true };
    });
    const provider = createOpenAICompatibleProvider({
      baseUrl: 'https://api.example.test/v1',
      model: 'm',
      transport: createTauriTransport({ baseUrl: 'https://api.example.test/v1' }, rust.deps),
    });
    const seen: string[] = [];
    const reply = await provider.chat(
      AGENTS.planner,
      [{ id: '1', from: 'user', content: 'oi', at: '' }],
      undefined,
      {
        onDelta: (t) => seen.push(t),
      },
    );
    expect(reply.output).toBe('Olá, mundo');
    expect(seen).toEqual(['Olá', ', mundo']);
    expect((rust.calls[0]![1]!.request as { stream: boolean }).stream).toBe(true);
  });

  it('sends only paths for the Builder and lets Rust read the files', async () => {
    const rust = fakeRust(async () => ({
      content: '{"changes":[]}',
      usage: null,
      streamed: false,
    }));
    const provider = createOpenAICompatibleProvider({
      baseUrl: 'https://api.example.test/v1',
      model: 'm',
      transport: createTauriTransport({ baseUrl: 'https://api.example.test/v1' }, rust.deps),
    });
    await provider.build(
      { summary: 's', tasks: [] },
      undefined,
      [
        { path: 'src/a.ts', bytes: 10, truncated: false, redactions: 0, skipped: null },
        { path: '.env', bytes: 0, truncated: false, redactions: 0, skipped: 'denied' },
      ],
      { root: 'C:/proj' },
    );
    const request = rust.calls[0]![1]!.request as {
      attach: unknown;
      messages: { content: string }[];
    };
    expect(request.attach).toEqual({ root: 'C:/proj', paths: ['src/a.ts'] });
    expect(request.messages[1]!.content).toContain(FILES_PLACEHOLDER);
  });

  it('cancels in Rust when the signal aborts', async () => {
    const controller = new AbortController();
    const rust = fakeRust(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            controller.abort();
            setTimeout(() => reject({ kind: 'aborted', detail: '' }), 5);
          }, 5);
        }),
    );
    const transport = createTauriTransport({ baseUrl: 'https://api.example.test/v1' }, rust.deps);
    await expect(
      transport.complete(
        { model: 'm', messages: [{ role: 'user', content: 'x' }] },
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(rust.calls.map(([c]) => c)).toContain('provider_cancel');
    expect(rust.calls.find(([c]) => c === 'provider_cancel')![1]).toEqual({ requestId: 'req-1' });
  });

  it('lists models through Rust', async () => {
    const rust = fakeRust(async () => ok);
    const transport = createTauriTransport({ baseUrl: 'https://api.example.test/v1' }, rust.deps);
    expect(await transport.listModels()).toEqual(['m1', 'm2']);
  });

  it('translates Rust failures', () => {
    const unauthorized = toProviderError({ kind: 'unauthorized', status: 401 }, 'en-US', 1000);
    expect(unauthorized).toBeInstanceOf(ProviderError);
    expect(unauthorized.message).toMatch(/API key rejected/);
    const limited = toProviderError(
      { kind: 'rate_limited', retryAfterMs: 60_000, detail: '60' },
      'pt-BR',
      1000,
    ) as ProviderError;
    expect([limited.kind, limited.retryAfterMs]).toEqual(['rate_limited', 60_000]);
    expect(toProviderError({ kind: 'timeout' }, 'pt-BR', 15_000).message).toMatch(/15 s/);
    expect(toProviderError({ kind: 'config', detail: 'https' }, 'en-US', 1).message).toMatch(
      /https/,
    );
    expect(toProviderError({ kind: 'aborted' }, 'en-US', 1).name).toBe('AbortError');
  });
});
