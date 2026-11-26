import { describe, expect, it, vi } from 'vitest';
import { accountFor, createSecretStore, isDesktop } from './secrets.ts';

describe('secret store bridge', () => {
  it('uses the normalized provider URL as the account', () => {
    expect(accountFor('https://api.example.test/v1/')).toBe('https://api.example.test/v1');
    expect(accountFor('http://api.example.test')).toBeNull();
  });

  it('hands the key to Rust once and never asks for it back', async () => {
    const invoke = vi.fn(async (cmd: string) =>
      cmd === 'provider_key_status' ? { session: true, vault: false } : null,
    ) as never;
    const store = createSecretStore(invoke);
    await store.use('https://api.example.test/v1/', ' sk-1 ');
    expect(await store.status('https://api.example.test/v1')).toEqual({
      session: true,
      vault: false,
    });
    await store.save('https://api.example.test/v1');
    await store.use('https://api.example.test/v1', '');
    await store.remove('https://api.example.test/v1');
    const calls = (invoke as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toEqual([
      ['provider_set_key', { baseUrl: 'https://api.example.test/v1', key: 'sk-1' }],
      ['provider_key_status', { baseUrl: 'https://api.example.test/v1' }],
      ['secret_save', { account: 'https://api.example.test/v1' }],
      ['provider_set_key', { baseUrl: 'https://api.example.test/v1', key: null }],
      ['secret_delete', { account: 'https://api.example.test/v1' }],
    ]);
    // Only `provider_set_key` carries a key, and nothing returns one.
    expect(calls.filter(([, args]) => JSON.stringify(args).includes('sk-1'))).toHaveLength(1);
  });

  it('refuses invalid URLs without calling Rust', async () => {
    const invoke = vi.fn() as never;
    await expect(createSecretStore(invoke).use('ftp://x', 'sk')).rejects.toThrow(/inválido/);
    await expect(createSecretStore(invoke).save('ftp://x')).rejects.toThrow(/inválido/);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('surfaces Rust errors as Error messages', async () => {
    const invoke = vi.fn(async () => {
      throw 'O Gerenciador de Credenciais do sistema não está acessível.';
    }) as never;
    await expect(createSecretStore(invoke).save('https://api.example.test')).rejects.toThrow(
      /Gerenciador/,
    );
    const failing = vi.fn(async () => {
      throw { kind: 'config', detail: 'Digite a chave antes de salvar no Windows.' };
    }) as never;
    await expect(createSecretStore(failing).status('https://api.example.test')).rejects.toThrow(
      /Digite a chave/,
    );
  });

  it('is not the desktop app under tests', () => {
    expect(isDesktop()).toBe(false);
  });
});
