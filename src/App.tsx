import { useCallback, useMemo, useReducer, useRef, useState } from 'react';
import { appReducer, initialState } from './app/state.ts';
import { useTheme, type ThemePreference } from './app/theme.ts';
import { CenterPanel } from './components/CenterPanel.tsx';
import { LeftPanel } from './components/LeftPanel.tsx';
import { RightPanel } from './components/RightPanel.tsx';
import { Button } from './components/ui.tsx';
import type { Session } from './domain/types.ts';
import {
  approvePlan,
  cancelSession,
  createProject,
  createSession,
  rejectPlan,
  runExecution,
  runPlanning,
  runReview,
} from './domain/workflow.ts';
import { createMockProvider } from './providers/mock.ts';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'system', label: 'Sistema' },
];

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [busy, setBusy] = useState(false);
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const { preference, setPreference } = useTheme();
  const controller = useRef<AbortController | null>(null);
  // Small artificial latency so loading and cancel states are visible.
  const provider = useMemo(() => createMockProvider({ latencyMs: 700 }), []);

  const project = state.projects.find((p) => p.id === state.activeProjectId) ?? null;
  const session = state.sessions.find((s) => s.id === state.activeSessionId) ?? null;

  const save = useCallback((s: Session) => dispatch({ type: 'upsertSession', session: s }), []);

  /** Runs async workflow steps one after another, stopping on any non-expected status. */
  const runSteps = useCallback(
    async (start: Session, steps: ((s: Session, signal: AbortSignal) => Promise<Session>)[]) => {
      const ctrl = new AbortController();
      controller.current = ctrl;
      setBusy(true);
      let current = start;
      try {
        for (const step of steps) {
          const before = current.status;
          current = await step(current, ctrl.signal);
          save(current);
          if (current.status === before || ['failed', 'cancelled'].includes(current.status)) break;
        }
      } finally {
        controller.current = null;
        setBusy(false);
      }
    },
    [save],
  );

  const handleCreateProject = (name: string, root: string): string | null => {
    try {
      dispatch({ type: 'addProject', project: createProject(name, root) });
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  };

  const handleStart = (request: string): string | null => {
    if (!project) return 'Selecione um projeto.';
    let draft: Session;
    try {
      draft = createSession(project, request);
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
    save(draft);
    dispatch({ type: 'selectSession', id: draft.id });
    void runSteps(draft, [(s, signal) => runPlanning(s, provider, { signal })]);
    return null;
  };

  const handleApprove = () => {
    if (!session) return;
    const approved = approvePlan(session);
    save(approved);
    void runSteps(approved, [
      (s, signal) => runExecution(s, provider, { signal }),
      (s, signal) => runReview(s, provider, { signal }),
    ]);
  };

  const handleReject = (reason: string) => {
    if (session) save(rejectPlan(session, reason));
  };

  const handleCancel = () => {
    if (controller.current) {
      controller.current.abort();
    } else if (session) {
      save(cancelSession(session));
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-6 w-6" />
          <h1 className="text-sm font-semibold">Agent Orchestra</h1>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            em desenvolvimento · mock offline
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            aria-pressed={showLeft}
            onClick={() => setShowLeft((v) => !v)}
          >
            {showLeft ? 'Ocultar' : 'Mostrar'} esquerda
          </Button>
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            aria-pressed={showRight}
            onClick={() => setShowRight((v) => !v)}
          >
            {showRight ? 'Ocultar' : 'Mostrar'} direita
          </Button>
          <label className="ml-2 flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
            Tema
            <select
              value={preference}
              onChange={(e) => setPreference(e.target.value as ThemePreference)}
              className="rounded-md border border-slate-300 bg-white px-1.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-900"
            >
              {THEME_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {showLeft && (
          <aside
            aria-label="Projetos, sessões e agentes"
            className="border-b border-slate-200 bg-white lg:w-72 lg:shrink-0 lg:border-r lg:border-b-0 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <LeftPanel
              projects={state.projects}
              sessions={state.sessions}
              activeProjectId={state.activeProjectId}
              activeSessionId={state.activeSessionId}
              providerLabel={provider.label}
              onCreateProject={handleCreateProject}
              onSelectProject={(id) => dispatch({ type: 'selectProject', id })}
              onSelectSession={(id) => dispatch({ type: 'selectSession', id })}
            />
          </aside>
        )}
        <section aria-label="Execução da sessão" className="min-h-[24rem] min-w-0 flex-1">
          <CenterPanel
            project={project}
            session={session}
            busy={busy}
            onStart={handleStart}
            onApprove={handleApprove}
            onReject={handleReject}
            onCancel={handleCancel}
          />
        </section>
        {showRight && (
          <aside
            aria-label="Alterações, uso e contexto"
            className="border-t border-slate-200 bg-white lg:w-80 lg:shrink-0 lg:border-t-0 lg:border-l dark:border-slate-800 dark:bg-slate-900/60"
          >
            <RightPanel project={project} session={session} />
          </aside>
        )}
      </main>
    </div>
  );
}
