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
import { agentProfile } from '../domain/agents.ts';
import type { Pricing } from '../domain/cost.ts';
import { AGENT_ROLES } from '../domain/types.ts';
import type { VaultState } from '../app/useOrchestra.ts';
import type { ThemePreference } from '../app/theme.ts';
import { useI18n } from '../i18n/I18n.tsx';
import { LOCALES, MESSAGES, type Locale } from '../i18n/messages.ts';
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
  onApplyKey,
  onTestConnection,
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
  /** Desktop: hands the typed key to Rust. */
  onApplyKey: () => void;
  onTestConnection: () => Promise<string[]>;
  onSaveToVault: () => void;
  onRemoveFromVault: () => void;
}) {
  const { t, locale, setLocale } = useI18n();
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const pricing: Pricing = settings.pricing ?? {
    inputPerMillion: 0,
    outputPerMillion: 0,
    currency: 'USD',
    asOf: new Date().toISOString().slice(0, 10),
  };
  const setPricing = (patch: Partial<Pricing>) => onSettings({ pricing: { ...pricing, ...patch } });

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    try {
      const models = await onTestConnection();
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
                <fieldset className="grid gap-2">
                  <legend className="text-[12.5px] font-medium text-ink-2">
                    {t.settings.agentModels}
                  </legend>
                  <p className="-mt-1 text-[12px] text-ink-3">{t.settings.agentModelsHint}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {AGENT_ROLES.map((role) => (
                      <label key={role} className="grid gap-1 text-[12px] text-ink-3">
                        {agentProfile(role, locale).name}
                        <TextInput
                          value={settings.agentModels[role] ?? ''}
                          onChange={(e) =>
                            onSettings({
                              agentModels: { ...settings.agentModels, [role]: e.target.value },
                            })
                          }
                          placeholder={settings.model || t.settings.modelPlaceholder}
                          spellCheck={false}
                        />
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset className="grid gap-2">
                  <legend className="text-[12.5px] font-medium text-ink-2">
                    {t.settings.pricing}
                  </legend>
                  <p className="-mt-1 text-[12px] leading-relaxed text-ink-3">
                    {t.settings.pricingHint}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="grid gap-1 text-[12px] text-ink-3">
                      {t.settings.inputPrice}
                      <TextInput
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={pricing.inputPerMillion || ''}
                        onChange={(e) => setPricing({ inputPerMillion: Number(e.target.value) })}
                      />
                    </label>
                    <label className="grid gap-1 text-[12px] text-ink-3">
                      {t.settings.outputPrice}
                      <TextInput
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={pricing.outputPerMillion || ''}
                        onChange={(e) => setPricing({ outputPerMillion: Number(e.target.value) })}
                      />
                    </label>
                    <label className="grid gap-1 text-[12px] text-ink-3">
                      {t.settings.currency}
                      <TextInput
                        value={pricing.currency}
                        maxLength={3}
                        onChange={(e) => setPricing({ currency: e.target.value.toUpperCase() })}
                        spellCheck={false}
                      />
                    </label>
                    <label className="grid gap-1 text-[12px] text-ink-3">
                      {t.settings.asOf}
                      <TextInput
                        type="date"
                        value={pricing.asOf}
                        onChange={(e) => setPricing({ asOf: e.target.value })}
                      />
                    </label>
                  </div>
                  {settings.pricing && (
                    <div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSettings({ pricing: null })}
                      >
                        {t.settings.clearPricing}
                      </Button>
                    </div>
                  )}
                </fieldset>
                <Field
                  label={t.settings.apiKey}
                  hint={vault.available ? t.settings.apiKeyHintDesktop : t.settings.apiKeyHint}
                >
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (vault.available) onApplyKey();
                    }}
                  >
                    <div className="relative min-w-0 flex-1">
                      <KeyRound
                        size={15}
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
                      />
                      <TextInput
                        type="password"
                        autoComplete="off"
                        value={apiKey}
                        onChange={(e) => onApiKey(e.target.value)}
                        placeholder={
                          vault.available && (vault.session || vault.saved)
                            ? t.settings.apiKeyReplace
                            : t.settings.apiKeyPlaceholder
                        }
                        className="pl-9"
                      />
                    </div>
                    {vault.available && (
                      <Button type="submit" disabled={vault.busy || !apiKey.trim()}>
                        {t.settings.useKey}
                      </Button>
                    )}
                  </form>
                  {vault.available && vault.session && (
                    <p className="mt-1.5 text-[12px] text-ok">{t.settings.keyInSession}</p>
                  )}
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
                          disabled={vault.busy || !(apiKey.trim() || vault.session)}
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
