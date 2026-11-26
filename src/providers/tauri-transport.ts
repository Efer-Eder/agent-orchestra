import type { Locale } from '../domain/locale.ts';
import type { Usage } from '../domain/types.ts';
import {
  abortError,
  ERR,
  normalizeBaseUrl,
  ProviderError,
  type CompletionCall,
  type CompletionResult,
  type Transport,
} from './openai-compatible.ts';

/**
 * Desktop transport: every request is made by Rust (`provider_http.rs`). The
 * UI sends the model, the messages and, for the Builder, the approved paths;
 * Rust adds the key from its own memory or the OS credential store, reads the
 * files, calls the provider and streams text back. Neither the key nor the
 * file contents ever reach this side.
 */

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

export interface ChannelLike<T> {
  onmessage: (message: T) => void;
}

export interface TauriTransportDeps {
  invoke?: Invoke;
  createChannel?: <T>() => ChannelLike<T>;
  newId?: () => string;
}

export interface TauriTransportConfig {
  baseUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  locale?: Locale;
}

/** `ProviderFailure` from Rust. */
interface Failure {
  kind: string;
  status?: number | null;
  retryAfterMs?: number | null;
  detail?: string;
}

interface RustCompletion {
  content: string;
  usage: { inputTokens: number; outputTokens: number } | null;
  streamed: boolean;
}

function isFailure(e: unknown): e is Failure {
  return typeof e === 'object' && e !== null && typeof (e as Failure).kind === 'string';
}

/** Turns a Rust failure into the same errors the browser transport throws. */
export function toProviderError(e: unknown, locale: Locale, timeoutMs: number): Error {
  const m = ERR[locale];
  if (!isFailure(e)) {
    return new ProviderError('network', m.network(e instanceof Error ? e.message : String(e)));
  }
  const status = e.status ?? undefined;
  const detail = e.detail ?? '';
  switch (e.kind) {
    case 'aborted':
      return abortError(locale);
    case 'unauthorized':
      return new ProviderError('unauthorized', m.unauthorized(status ?? 401), status);
    case 'rate_limited':
      return new ProviderError(
        'rate_limited',
        m.rateLimited(detail || null),
        429,
        e.retryAfterMs ?? undefined,
      );
    case 'timeout':
      return new ProviderError('timeout', m.timeout(Math.round(timeoutMs / 1000)));
    case 'network':
      return new ProviderError('network', m.network(detail));
    case 'http':
      return new ProviderError('http', m.http(status ?? 0, detail ? `: ${detail}` : ''), status);
    case 'bad_response':
      return new ProviderError(
        'bad_response',
        detail === 'not_json' ? m.notJson : detail === 'empty' ? m.empty : m.format(detail),
      );
    default: {
      const known: Record<string, string> = {
        bad_url: m.badUrl,
        https: m.https,
        credentials: m.credentials,
        query: m.query,
        model: m.model,
      };
      return new ProviderError('config', known[detail] ?? detail);
    }
  }
}

let counter = 0;
const defaultId = () => `req-${Date.now().toString(36)}-${(counter++).toString(36)}`;

async function tauriCore(): Promise<{ invoke: Invoke; createChannel: <T>() => ChannelLike<T> }> {
  const core = await import('@tauri-apps/api/core');
  return {
    invoke: core.invoke as Invoke,
    createChannel: <T>() => new core.Channel<T>(),
  };
}

export function createTauriTransport(
  config: TauriTransportConfig,
  deps: TauriTransportDeps = {},
): Transport {
  const locale = config.locale ?? 'pt-BR';
  const baseUrl = normalizeBaseUrl(config.baseUrl, locale);
  const timeoutMs = config.timeoutMs ?? 60_000;
  const newId = deps.newId ?? defaultId;

  async function core() {
    if (deps.invoke && deps.createChannel) {
      return { invoke: deps.invoke, createChannel: deps.createChannel };
    }
    return tauriCore();
  }

  /** Runs one Rust command and cancels it in Rust when the signal aborts. */
  async function cancellable<T>(
    invoke: Invoke,
    requestId: string,
    signal: AbortSignal | undefined,
    run: () => Promise<T>,
  ): Promise<T> {
    if (signal?.aborted) throw abortError(locale);
    const onAbort = () => void invoke('provider_cancel', { requestId }).catch(() => undefined);
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      return await run();
    } catch (e) {
      if (signal?.aborted) throw abortError(locale);
      throw toProviderError(e, locale, timeoutMs);
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }
  }

  return {
    async complete(call: CompletionCall, signal, onDelta): Promise<CompletionResult> {
      const { invoke, createChannel } = await core();
      const requestId = newId();
      const channel = createChannel<{ delta: string }>();
      channel.onmessage = (event) => {
        if (!signal?.aborted && event.delta) onDelta?.(event.delta);
      };
      const result = await cancellable(invoke, requestId, signal, () =>
        invoke<RustCompletion>('provider_complete', {
          request: {
            requestId,
            baseUrl,
            model: call.model,
            messages: call.messages,
            stream: Boolean(call.stream && onDelta),
            timeoutMs,
            ...(config.maxRetries !== undefined ? { maxRetries: config.maxRetries } : {}),
            ...(config.retryDelayMs !== undefined ? { retryDelayMs: config.retryDelayMs } : {}),
            ...(call.attach ? { attach: call.attach } : {}),
          },
          onEvent: channel,
        }),
      );
      const usage: Usage | undefined = result.usage
        ? {
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            synthetic: false,
          }
        : undefined;
      return { content: result.content, ...(usage ? { usage } : {}) };
    },
    async listModels(signal) {
      const { invoke } = await core();
      const requestId = newId();
      return cancellable(invoke, requestId, signal, () =>
        invoke<string[]>('provider_list_models', { baseUrl, requestId, timeoutMs: 20_000 }),
      );
    },
  };
}
