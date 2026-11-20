import type { Project, Session } from '../domain/types.ts';
import { totalUsage } from '../domain/workflow.ts';
import { EmptyState, PanelSection } from './ui.tsx';

function lineClass(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---')) return 'text-slate-500';
  if (line.startsWith('+'))
    return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
  if (line.startsWith('-'))
    return 'bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300';
  if (line.startsWith('@@')) return 'text-sky-700 dark:text-sky-400';
  return '';
}

export function RightPanel({
  project,
  session,
}: {
  project: Project | null;
  session: Session | null;
}) {
  const usage = session ? totalUsage(session) : null;
  const changes = session?.changes ?? [];

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <PanelSection title="Alterações propostas">
        {changes.length === 0 ? (
          <EmptyState title="Nenhuma alteração">
            Os diffs do Builder aparecem aqui após a aprovação do plano.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {changes.map((c) => (
              <li
                key={c.path}
                className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800"
              >
                <p className="flex items-center justify-between gap-2 bg-slate-100 px-2 py-1 text-xs dark:bg-slate-900">
                  <span className="truncate font-mono">{c.path}</span>
                  <span className="text-slate-500">{c.kind}</span>
                </p>
                <pre className="overflow-x-auto py-1 font-mono text-[11px] leading-5">
                  {c.diff.split('\n').map((line, i) => (
                    <div key={i} className={`px-2 ${lineClass(line)}`}>
                      {line || ' '}
                    </div>
                  ))}
                </pre>
              </li>
            ))}
          </ul>
        )}
        {changes.length > 0 && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Somente visualização: aplicar alterações ao disco ainda não existe.
          </p>
        )}
      </PanelSection>

      <PanelSection title="Uso e custo">
        {!usage || session?.usage.length === 0 ? (
          <EmptyState title="Sem chamadas ainda" />
        ) : (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500 dark:text-slate-400">Tokens de entrada</dt>
            <dd className="text-right tabular-nums">{usage.inputTokens}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Tokens de saída</dt>
            <dd className="text-right tabular-nums">{usage.outputTokens}</dd>
            <dt className="text-slate-500 dark:text-slate-400">Custo estimado</dt>
            <dd className="text-right">—</dd>
          </dl>
        )}
        {usage?.synthetic && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            Números sintéticos do provedor mock (≈ 4 caracteres por token). Não há preços
            configurados, então nenhum custo é estimado.
          </p>
        )}
      </PanelSection>

      <PanelSection title="Contexto">
        {project ? (
          <dl className="space-y-1 text-sm">
            <dt className="text-xs text-slate-500 dark:text-slate-400">Diretório informado</dt>
            <dd className="font-mono text-xs break-all">
              {project.rootLabel || '(não informado)'}
            </dd>
          </dl>
        ) : (
          <EmptyState title="Nenhum projeto selecionado" />
        )}
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Nesta versão nenhum arquivo é lido ou gravado: tudo fica em memória e some ao recarregar.
        </p>
      </PanelSection>
    </div>
  );
}
