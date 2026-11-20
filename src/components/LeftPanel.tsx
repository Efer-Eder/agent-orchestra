import { useState, type FormEvent } from 'react';
import { ROLE_DESCRIPTION, ROLE_LABEL } from '../app/labels.ts';
import { AGENT_ROLES, type Project, type Session } from '../domain/types.ts';
import { Button, EmptyState, PanelSection, StatusBadge } from './ui.tsx';

interface Props {
  projects: Project[];
  sessions: Session[];
  activeProjectId: string | null;
  activeSessionId: string | null;
  providerLabel: string;
  onCreateProject: (name: string, rootLabel: string) => string | null;
  onSelectProject: (id: string) => void;
  onSelectSession: (id: string | null) => void;
}

export function LeftPanel(props: Props) {
  const [name, setName] = useState('');
  const [root, setRoot] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = props.onCreateProject(name, root);
    setError(err);
    if (!err) {
      setName('');
      setRoot('');
    }
  };

  const projectSessions = props.sessions.filter((s) => s.projectId === props.activeProjectId);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <PanelSection title="Projetos">
        <form onSubmit={submit} className="mb-3 space-y-2" aria-label="Novo projeto">
          <label className="block text-xs text-slate-600 dark:text-slate-400">
            Nome
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="meu-projeto"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="block text-xs text-slate-600 dark:text-slate-400">
            Pasta (apenas rótulo nesta versão)
            <input
              value={root}
              onChange={(e) => setRoot(e.target.value)}
              placeholder="C:\projetos\meu-projeto"
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          {error && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" className="w-full">
            Criar projeto
          </Button>
        </form>
        {props.projects.length === 0 ? (
          <EmptyState title="Nenhum projeto ainda">Crie o primeiro acima.</EmptyState>
        ) : (
          <ul className="space-y-1">
            {props.projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => props.onSelectProject(p.id)}
                  aria-current={p.id === props.activeProjectId ? 'true' : undefined}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    p.id === props.activeProjectId
                      ? 'bg-indigo-50 font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {p.name}
                  {p.rootLabel && (
                    <span className="block truncate text-xs font-normal text-slate-500 dark:text-slate-400">
                      {p.rootLabel}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>

      <PanelSection
        title="Sessões"
        action={
          props.activeProjectId && (
            <Button
              variant="ghost"
              className="px-2 py-1 text-xs"
              onClick={() => props.onSelectSession(null)}
            >
              + Nova
            </Button>
          )
        }
      >
        {!props.activeProjectId ? (
          <EmptyState title="Selecione um projeto" />
        ) : projectSessions.length === 0 ? (
          <EmptyState title="Nenhuma sessão">
            Descreva uma solicitação no painel central.
          </EmptyState>
        ) : (
          <ul className="space-y-1">
            {projectSessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => props.onSelectSession(s.id)}
                  aria-current={s.id === props.activeSessionId ? 'true' : undefined}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                    s.id === props.activeSessionId
                      ? 'bg-slate-200/70 dark:bg-slate-800'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="truncate">{s.title}</span>
                  <StatusBadge status={s.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>

      <PanelSection title="Agentes">
        <ul className="space-y-2">
          {AGENT_ROLES.map((role) => (
            <li key={role} className="rounded-md border border-slate-200 p-2 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{ROLE_LABEL[role]}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {props.providerLabel}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {ROLE_DESCRIPTION[role]}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Provedores reais ainda não estão disponíveis.
        </p>
      </PanelSection>
    </div>
  );
}
