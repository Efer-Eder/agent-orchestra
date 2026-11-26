import { normalizeBaseUrl } from '../providers/openai-compatible.ts';

/**
 * API keys on the desktop. The key typed in Settings is handed to Rust once
 * (`provider_set_key`) and stays in Rust memory; "Save in Windows" copies it
 * from there to the Credential Manager. There is no command that returns a key
 * to the web UI: Rust uses it directly for the provider calls.
 * In the browser the key stays in memory, on this side, only.
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
  if (e && typeof e === 'object' && 'detail' in e && typeof e.detail === 'string') return e.detail;
  return 'Falha ao acessar o Gerenciador de Credenciais.';
}

export interface KeyStatus {
  /** A key was typed in this session (kept in Rust memory). */
  session: boolean;
  /** A key is saved in the Windows Credential Manager. */
  vault: boolean;
}

export function createSecretStore(invoke: Invoke = defaultInvoke) {
  async function call<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
    try {
      return await invoke<T>(cmd, args);
    } catch (e) {
      throw new Error(message(e), { cause: e });
    }
  }
  return {
    /** Hands the typed key to Rust (memory only). Empty clears it. */
    async use(baseUrl: string, key: string): Promise<void> {
      const account = accountFor(baseUrl);
      if (!account) throw new Error('Endereço do provedor inválido.');
      await call('provider_set_key', { baseUrl: account, key: key.trim() || null });
    },
    async status(baseUrl: string): Promise<KeyStatus> {
      const account = accountFor(baseUrl);
      if (!account) return { session: false, vault: false };
      return call<KeyStatus>('provider_key_status', { baseUrl: account });
    },
    /** Copies the session key, inside Rust, to the Windows Credential Manager. */
    async save(baseUrl: string): Promise<void> {
      const account = accountFor(baseUrl);
      if (!account) throw new Error('Endereço do provedor inválido.');
      await call('secret_save', { account });
    },
    /** Removes the key from the Credential Manager and from this session. */
    async remove(baseUrl: string): Promise<void> {
      const account = accountFor(baseUrl);
      if (!account) return;
      await call('secret_delete', { account });
    },
  };
}

export type SecretStore = ReturnType<typeof createSecretStore>;
