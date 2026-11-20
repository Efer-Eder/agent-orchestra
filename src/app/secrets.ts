import { normalizeBaseUrl } from '../providers/openai-compatible.ts';

/**
 * API keys in the OS credential store (Windows Credential Manager), through
 * the Rust commands in `src-tauri/src/secrets.rs`. Only available in the
 * desktop app; in the browser the key stays in memory only.
 */

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function defaultInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

/** The credential "account" is the normalized provider URL, one key per provider. */
export function accountFor(baseUrl: string): string | null {
  try {
    return normalizeBaseUrl(baseUrl);
  } catch {
    return null;
  }
}

function message(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  return 'Falha ao acessar o Gerenciador de Credenciais.';
}

export function createSecretStore(invoke: Invoke = defaultInvoke) {
  return {
    async save(baseUrl: string, secret: string): Promise<void> {
      const account = accountFor(baseUrl);
      if (!account) throw new Error('Endereço do provedor inválido.');
      try {
        await invoke('secret_save', { account, secret });
      } catch (e) {
        throw new Error(message(e), { cause: e });
      }
    },
    async load(baseUrl: string): Promise<string | null> {
      const account = accountFor(baseUrl);
      if (!account) return null;
      try {
        return (await invoke<string | null>('secret_load', { account })) ?? null;
      } catch (e) {
        throw new Error(message(e), { cause: e });
      }
    },
    async remove(baseUrl: string): Promise<void> {
      const account = accountFor(baseUrl);
      if (!account) return;
      try {
        await invoke('secret_delete', { account });
      } catch (e) {
        throw new Error(message(e), { cause: e });
      }
    },
  };
}

export type SecretStore = ReturnType<typeof createSecretStore>;
