import { useState, type FormEvent } from 'react';
import { ROLE_LABEL } from '../app/labels.ts';
import type { Project, Session, TimelineEvent } from '../domain/types.ts';
import { Button, EmptyState, StatusBadge } from './ui.tsx';

interface Props {
  project: Project | null;
  session: Session | null;
  busy: boolean;
  onStart: (request: string) => string | null;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onCancel: () => void;
}

const EVENT_DOT: Record<TimelineEvent['kind'], string> = {
  request: 'bg-slate-400',
  plan: 'bg-sky-500',
  approval: 'bg-emerald-500',
  rejection: 'bg-rose-500',
  execution: 'bg-indigo-500',
  review: 'bg-violet-500',
  cancelled: 'bg-slate-500',
  error: 'bg-rose-600',
};

function NewSessionForm({ onStart }: { onStart: Props['onStart'] }) {
  const [request, setRequest] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = onStart(request);
    setError(err);
    if (!err) setRequest('');
  };

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-2xl space-y-3">
      <label htmlFor="request" className="block text-sm font-medium">
        O que você quer que os agentes façam?
      </label>
      <textarea
        id="request"
        value={request}
        onChange={(e) => setRequest(e.target.value)}
        rows={5}
        placeholder={'Ex.: Criar página de login. Adicionar testes de validação.'}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e);
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          O Planner propõe um plano; nada é executado sem a sua aprovação. Ctrl+Enter envia.
        </p>
        <Button type="submit" variant="primary">
          Enviar ao Planner
        </Button>
      </div>
    </form>
  );
}

function ApprovalCard({
  session,
  onApprove,
  onReject,
}: Pick<Props, 'onApprove' | 'onReject'> & { session: Session }) {
  const [reason, setReason] = useState('');
  return (
    <div
      role="region"
      aria-label="Aprovação do plano"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40"
    >
      <h3 className="text-sm font-semibold">Plano aguardando sua aprovação</h3>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
        {session.plan?.tasks.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
        Aprovar permite ao Builder propor alterações. Nada é gravado no disco nesta versão.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={onApprove}>
          Aprovar plano
        </Button>
        <input
          aria-label="Motivo da rejeição"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <Button variant="danger" onClick={() => onReject(reason)}>
          Rejeitar
        </Button>
      </div>
    </div>
  );
}

export function CenterPanel(props: Props) {
  const { project, session, busy } = props;

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md">
          <EmptyState title="Crie ou selecione um projeto para começar">
            O fluxo é: solicitação → plano → aprovação → execução → revisão.
          </EmptyState>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <NewSessionForm onStart={props.onStart} />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
        <h2 className="truncate text-sm font-semibold">{session.title}</h2>
        <div className="flex items-center gap-2">
          <StatusBadge status={session.status} />
          {busy && (
            <Button variant="danger" className="px-2 py-1 text-xs" onClick={props.onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4" aria-live="polite">
        <ol className="space-y-3">
          {session.events.map((ev) => (
            <li key={ev.id} className="flex gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${EVENT_DOT[ev.kind]}`} />
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {ev.role ? ROLE_LABEL[ev.role] : 'Você'} ·{' '}
                  {new Date(ev.at).toLocaleTimeString('pt-BR')}
                </p>
                <p
                  className={`text-sm break-words whitespace-pre-wrap ${ev.kind === 'error' ? 'text-rose-700 dark:text-rose-300' : ''}`}
                >
                  {ev.message}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {busy && (
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-500" />
            Trabalhando…
          </p>
        )}

        {session.status === 'awaiting_approval' && !busy && (
          <ApprovalCard session={session} onApprove={props.onApprove} onReject={props.onReject} />
        )}

        {session.status === 'awaiting_approval' && !busy && (
          <Button variant="ghost" className="text-xs" onClick={props.onCancel}>
            Cancelar sessão
          </Button>
        )}
      </div>
    </div>
  );
}
