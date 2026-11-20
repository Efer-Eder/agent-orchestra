import { describe, expect, it, vi } from 'vitest';
import { accountFor, createSecretStore, isDesktop } from './secrets.ts';

describe('secret store bridge', () => {
  it('uses the normalized provider URL as the account', () => {
    expect(accountFor('https://api.example.test/v1/')).toBe('https://api.example.test/v1');
    expect(accountFor('http://api.example.test')).toBeNull();
  });

  it('calls the Rust commands with account and secret', async () => {
    const invoke = vi.fn(async () => null) as never;
    const store = createSecretStore(invoke);
    await store.save('https://api.example.test/v1', 'sk-1');
    await store.load('https://api.example.test/v1');
    await store.remove('https://api.example.test/v1');
    expect((invoke as ReturnType<typeof vi.fn>).mock.calls).toEqual([
      ['secret_save', { account: 'https://api.example.test/v1', secret: 'sk-1' }],
      ['secret_load', { account: 'https://api.example.test/v1' }],
      ['secret_delete', { account: 'https://api.example.test/v1' }],
    ]);
  });

  it('refuses to save for an invalid URL without calling Rust', async () => {
    const invoke = vi.fn() as never;
    await expect(createSecretStore(invoke).save('ftp://x', 'sk')).rejects.toThrow(/inválido/);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('surfaces Rust error strings as Error messages', async () => {
    const invoke = vi.fn(async () => {
      throw 'O Gerenciador de Credenciais do sistema não está acessível.';
    }) as never;
    await expect(createSecretStore(invoke).load('https://api.example.test')).rejects.toThrow(
      /Gerenciador/,
    );
  });

  it('is not the desktop app under tests', () => {
    expect(isDesktop()).toBe(false);
  });
});
