import {
  CircleCheck,
  KeyRound,
  Languages,
  LockKeyhole,
  Monitor,
  Moon,
  PlugZap,
  Sun,
  Trash,
  TriangleExclamationPoint,
} from 'lucide-react';
import { useState } from 'react';
import type { ProviderSettings } from '../app/state.ts';
import type { VaultState } from '../app/useOrchestra.ts';
import type { ThemePreference } from '../app/theme.ts';
import { useI18n } from '../i18n/I18n.tsx';
import { LOCALES, MESSAGES, type Locale } from '../i18n/messages.ts';
import { createOpenAICompatibleProvider } from '../providers/openai-compatible.ts';
import { Button, Field, Segmented, TextInput } from './primitives.tsx';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 text-[15px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsView({
  theme,
  onTheme,
  settings,
  onSettings,
  apiKey,
  onApiKey,
  providerProblem,
  onResetAll,
  vault,
  onSaveToVault,
  onRemoveFromVault,
}: {
  theme: ThemePreference;
  onTheme: (t: ThemePreference) => void;
  settings: ProviderSettings;
  onSettings: (s: Partial<ProviderSettings>) => void;
  apiKey: string;
  onApiKey: (k: string) => void;
  providerProblem: string | null;
  onResetAll: () => void;
  vault: VaultState;
  onSaveToVault: () => void;
  onRemoveFromVault: () => void;
}) {
  const { t, locale, setLocale } = useI18n();
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    try {
      const provider = createOpenAICompatibleProvider({
        baseUrl: settings.baseUrl,
        apiKey,
        model: settings.model || 'test',
        timeoutMs: 15_000,
        locale,
      });
      const models = await provider.testConnection();
      const has = settings.model && models.includes(settings.model);
      setTest({
        ok: true,
        text: t.settings.testOk(models.length, settings.model, Boolean(has)),
      });
    } catch (e) {
      setTest({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-[720px] gap-5 px-6 py-8">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">{t.settings.title}</h1>
          <p className="mt-1.5 text-[14px] text-ink-3">{t.settings.subtitle}</p>
        </div>

        <Card title={t.settings.appearance}>
          <div className="grid gap-4">
            <Segmented<ThemePreference>
              label={t.settings.theme}
              value={theme}
              onChange={onTheme}
              options={[
                { value: 'light', label: t.settings.light, icon: <Sun size={14} /> },
                { value: 'dark', label: t.settings.dark, icon: <Moon size={14} /> },
                { value: 'system', label: t.settings.system, icon: <Monitor size={14} /> },
              ]}
            />
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2">
                <Languages size={14} className="text-ink-3" />
                {t.settings.language}
              </span>
              <Segmented<Locale>
                label={t.settings.language}
                value={locale}
                onChange={setLocale}
                options={LOCALES.map((l) => ({ value: l, label: MESSAGES[l].meta.name }))}
              />
            </div>
          </div>
        </Card>

        <Card title={t.settings.provider}>
          <div className="grid gap-4">
            <div>
              <Segmented<ProviderSettings['kind']>
                label={t.settings.providerKind}
                value={settings.kind}
                onChange={(kind) => onSettings({ kind })}
                options={[
                  { value: 'mock', label: t.settings.mock },
                  { value: 'openai', label: t.settings.openai },
                ]}
              />
            </div>
            {settings.kind === 'mock' ? (
              <p className="text-[13px] leading-relaxed text-ink-2">{t.settings.mockHelp}</p>
            ) : (
              <>
                <Field label={t.settings.baseUrl} hint={t.settings.baseUrlHint}>
                  <TextInput
                    value={settings.baseUrl}
                    onChange={(e) => onSettings({ baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    spellCheck={false}
                  />
                </Field>
                <Field label={t.settings.model}>
                  <TextInput
                    value={settings.model}
                    onChange={(e) => onSettings({ model: e.target.value })}
                    placeholder={t.settings.modelPlaceholder}
                    spellCheck={false}
                  />
                </Field>
                <Field label={t.settings.apiKey} hint={t.settings.apiKeyHint}>
                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
                    />
                    <TextInput
                      type="password"
                      autoComplete="off"
                      value={apiKey}
                      onChange={(e) => onApiKey(e.target.value)}
                      placeholder={t.settings.apiKeyPlaceholder}
                      className="pl-9"
                    />
                  </div>
                </Field>
                <div className="rounded-xl border border-line bg-surface-2 px-3.5 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <LockKeyhole size={16} className="shrink-0 text-ink-3" />
                    <span className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink-2">
                      {!vault.available
                        ? t.settings.vaultUnavailable
                        : vault.saved
                          ? t.settings.vaultSaved
                          : t.settings.vaultHint}
                    </span>
                    {vault.available &&
                      (vault.saved ? (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={vault.busy}
                          onClick={onRemoveFromVault}
                        >
                          {t.settings.vaultRemove}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={vault.busy || !apiKey.trim()}
                          onClick={onSaveToVault}
                        >
                          {t.settings.vaultSave}
                        </Button>
                      ))}
                  </div>
                  {vault.message && (
                    <p role="alert" className="mt-2 text-[12.5px] text-bad">
                      {vault.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={runTest} disabled={testing || !settings.baseUrl}>
                    <PlugZap size={15} />
                    {testing ? t.settings.testing : t.settings.test}
                  </Button>
                  {test && (
                    <span
                      role="status"
                      className={`inline-flex items-start gap-1.5 text-[12.5px] ${test.ok ? 'text-ok' : 'text-bad'}`}
                    >
                      {test.ok ? (
                        <CircleCheck size={14} className="mt-0.5 shrink-0" />
                      ) : (
                        <TriangleExclamationPoint size={14} className="mt-0.5 shrink-0" />
                      )}
                      {test.text}
                    </span>
                  )}
                </div>
                {providerProblem && (
                  <p className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-[12.5px] text-warn">
                    {providerProblem} {t.settings.providerFallback}
                  </p>
                )}
              </>
            )}
          </div>
        </Card>

        <Card title={t.settings.data}>
          <p className="text-[13px] leading-relaxed text-ink-2">{t.settings.dataHelp}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {confirmReset ? (
              <>
                <span className="text-[12.5px] text-bad">{t.settings.confirmReset}</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                  {t.common.cancel}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    onResetAll();
                    setConfirmReset(false);
                  }}
                >
                  {t.settings.reset}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setConfirmReset(true)}>
                <Trash size={14} />
                {t.settings.resetButton}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
