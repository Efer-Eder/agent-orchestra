import {
  CircleCheck,
  KeyRound,
  Monitor,
  Moon,
  PlugZap,
  Sun,
  Trash,
  TriangleExclamationPoint,
} from 'lucide-react';
import { useState } from 'react';
import type { ProviderSettings } from '../app/state.ts';
import type { ThemePreference } from '../app/theme.ts';
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
}: {
  theme: ThemePreference;
  onTheme: (t: ThemePreference) => void;
  settings: ProviderSettings;
  onSettings: (s: Partial<ProviderSettings>) => void;
  apiKey: string;
  onApiKey: (k: string) => void;
  providerProblem: string | null;
  onResetAll: () => void;
}) {
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
        model: settings.model || 'teste',
        timeoutMs: 15_000,
      });
      const models = await provider.testConnection();
      const has = settings.model && models.includes(settings.model);
      setTest({
        ok: true,
        text: `Conectado. ${models.length} modelo(s) disponível(is)${
          settings.model
            ? has
              ? `, incluindo ${settings.model}.`
              : `; "${settings.model}" não apareceu na lista.`
            : '.'
        }`,
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
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Configurações</h1>
          <p className="mt-1.5 text-[14px] text-ink-3">
            Tudo fica neste dispositivo. Sem telemetria.
          </p>
        </div>

        <Card title="Aparência">
          <Segmented<ThemePreference>
            label="Tema"
            value={theme}
            onChange={onTheme}
            options={[
              { value: 'light', label: 'Claro', icon: <Sun size={14} /> },
              { value: 'dark', label: 'Escuro', icon: <Moon size={14} /> },
              { value: 'system', label: 'Sistema', icon: <Monitor size={14} /> },
            ]}
          />
        </Card>

        <Card title="Provedor de IA">
          <div className="grid gap-4">
            <div>
              <Segmented<ProviderSettings['kind']>
                label="Tipo de provedor"
                value={settings.kind}
                onChange={(kind) => onSettings({ kind })}
                options={[
                  { value: 'mock', label: 'Demonstração (offline)' },
                  { value: 'openai', label: 'OpenAI-compatível' },
                ]}
              />
            </div>
            {settings.kind === 'mock' ? (
              <p className="text-[13px] leading-relaxed text-ink-2">
                O modo demonstração percorre o fluxo inteiro sem rede e sem chave. As respostas são
                fixas e rotuladas.
              </p>
            ) : (
              <>
                <Field
                  label="Endereço da API"
                  hint="Qualquer servidor compatível com /chat/completions: OpenAI, OpenRouter, Groq, Ollama, LM Studio… http:// só é aceito para localhost."
                >
                  <TextInput
                    value={settings.baseUrl}
                    onChange={(e) => onSettings({ baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    spellCheck={false}
                  />
                </Field>
                <Field label="Modelo">
                  <TextInput
                    value={settings.model}
                    onChange={(e) => onSettings({ model: e.target.value })}
                    placeholder="nome do modelo no provedor"
                    spellCheck={false}
                  />
                </Field>
                <Field
                  label="Chave de API"
                  hint="Fica só na memória: nunca é salva em disco e some ao fechar o app. É enviada apenas ao endereço acima. O uso é cobrado pelo provedor, separado de qualquer assinatura de chat."
                >
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
                      placeholder="cole sua chave aqui"
                      className="pl-9"
                    />
                  </div>
                </Field>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={runTest} disabled={testing || !settings.baseUrl}>
                    <PlugZap size={15} />
                    {testing ? 'Testando…' : 'Testar conexão'}
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
                    {providerProblem} Enquanto isso, o modo demonstração continua ativo.
                  </p>
                )}
              </>
            )}
          </div>
        </Card>

        <Card title="Dados locais">
          <p className="text-[13px] leading-relaxed text-ink-2">
            Projetos, sessões e conversas ficam salvos neste dispositivo (armazenamento local do
            app). A chave de API nunca é salva.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {confirmReset ? (
              <>
                <span className="text-[12.5px] text-bad">Apagar tudo? Não dá para desfazer.</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    onResetAll();
                    setConfirmReset(false);
                  }}
                >
                  Apagar tudo
                </Button>
              </>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setConfirmReset(true)}>
                <Trash size={14} />
                Apagar dados locais
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
