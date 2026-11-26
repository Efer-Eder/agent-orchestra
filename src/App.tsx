import { Menu } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTheme } from './app/theme.ts';
import { useOrchestra } from './app/useOrchestra.ts';
import { AgentChatView, AgentsView } from './components/AgentsView.tsx';
import { HomeView } from './components/HomeView.tsx';
import { cn, IconButton } from './components/primitives.tsx';
import { ProjectsView } from './components/ProjectsView.tsx';
import { RightPanel } from './components/RightPanel.tsx';
import { SessionView } from './components/SessionView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { useI18n } from './i18n/I18n.tsx';

function useMedia(query: string) {
  const [match, setMatch] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

export default function App() {
  const { locale, t } = useI18n();
  const o = useOrchestra(locale, t);
  const { state } = o;
  const { preference, setPreference } = useTheme();
  const wide = useMedia('(min-width: 1100px)');
  const narrow = useMedia('(max-width: 759px)');
  const [rightOpen, setRightOpen] = useState(true);
  const [sideOpen, setSideOpen] = useState(false);
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [searchTick, setSearchTick] = useState(0);

  const view = state.view;
  const project = state.projects.find((p) => p.id === state.activeProjectId) ?? null;
  const session =
    view.name === 'session' ? (state.sessions.find((s) => s.id === view.id) ?? null) : null;
  const offline = o.provider.offline;
  const providerLabel = offline ? t.common.demoOffline : o.provider.label;

  // Reset transient panels when the view changes (derived-state pattern, no effect).
  const viewKey = JSON.stringify(view);
  const [seenView, setSeenView] = useState(viewKey);
  if (seenView !== viewKey) {
    setSeenView(viewKey);
    setOpenPath(null);
    if (narrow) setSideOpen(false);
  }

  const { setView } = o;
  useEffect(() => {
    if (view.name === 'session' && !session) setView({ name: 'home' });
  }, [view, session, setView]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        setView({ name: 'home' });
      } else if (key === 'k') {
        e.preventDefault();
        setSideOpen(true);
        setSearchTick((t) => t + 1);
      } else if (key === '.') {
        e.preventDefault();
        setRightOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setView]);

  const showRight = view.name === 'session' && session && rightOpen;

  let main: React.ReactNode;
  if (view.name === 'session' && session) {
    main = (
      <SessionView
        session={session}
        busy={o.busySessions.has(session.id)}
        providerLabel={providerLabel}
        rightOpen={rightOpen}
        onToggleRight={() => setRightOpen((v) => !v)}
        onApprove={() => o.approve(session)}
        onApproveFinal={() => o.acceptFinal(session)}
        onReject={(r) => o.reject(session, r)}
        onAdjust={(note) => o.requestAdjustment(session, note)}
        onCancel={() => o.cancel(session)}
        onDelete={() => o.deleteSession(session.id)}
        onNewRequest={o.startSession}
        onOpenChange={(path) => {
          setOpenPath(path);
          setRightOpen(true);
        }}
      />
    );
  } else if (view.name === 'agents') {
    main = <AgentsView chats={state.chats} onOpen={(id) => o.setView({ name: 'agent', id })} />;
  } else if (view.name === 'agent') {
    main = (
      <AgentChatView
        agentId={view.id}
        messages={state.chats[view.id] ?? []}
        busy={o.busyAgents.has(view.id)}
        providerLabel={providerLabel}
        onBack={() => o.setView({ name: 'agents' })}
        onSend={(text) => o.sendChat(view.id, text)}
        onStop={() => o.stopChat(view.id)}
        onClear={() => o.dispatch({ type: 'clearChat', agentId: view.id })}
      />
    );
  } else if (view.name === 'projects') {
    main = (
      <ProjectsView
        projects={state.projects}
        sessions={state.sessions}
        activeId={state.activeProjectId}
        onSelect={(id) => {
          o.dispatch({ type: 'selectProject', id });
          o.setView({ name: 'home' });
        }}
        onCreate={async (name, root) => {
          const err = await o.addProject(name, root);
          if (!err) o.setView({ name: 'home' });
          return err;
        }}
      />
    );
  } else if (view.name === 'settings') {
    main = (
      <SettingsView
        theme={preference}
        onTheme={setPreference}
        settings={state.settings}
        onSettings={(s) => o.dispatch({ type: 'updateSettings', settings: s })}
        apiKey={o.apiKey}
        onApiKey={o.setApiKey}
        providerProblem={o.providerProblem}
        onResetAll={o.resetAll}
        vault={o.vault}
        onApplyKey={() => void o.applyKey()}
        onTestConnection={() => o.testConnection()}
        onSaveToVault={() => void o.saveKeyToVault()}
        onRemoveFromVault={() => void o.removeKeyFromVault()}
      />
    );
  } else {
    main = (
      <HomeView
        project={project}
        providerLabel={providerLabel}
        onCreateProject={o.addProject}
        onStart={o.startSession}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {narrow && sideOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setSideOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        aria-label={t.shell.sidebar}
        className={cn(
          'w-[264px] shrink-0 border-r border-line bg-sidebar',
          narrow && 'fixed inset-y-0 left-0 z-40 transition-transform duration-200',
          narrow && !sideOpen && '-translate-x-full',
        )}
      >
        <Sidebar
          state={state}
          providerLabel={providerLabel}
          onNavigate={o.setView}
          searchTick={searchTick}
        />
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col bg-app">
        {narrow && (
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-2">
            <IconButton label={t.shell.openMenu} onClick={() => setSideOpen(true)}>
              <Menu size={17} />
            </IconButton>
            <span className="text-[13.5px] font-semibold">Agent Orchestra</span>
          </div>
        )}
        <div className="min-h-0 flex-1">{main}</div>
      </main>

      {showRight && (
        <>
          {!wide && (
            <div
              className="fixed inset-0 z-20 bg-black/30"
              onClick={() => setRightOpen(false)}
              aria-hidden="true"
            />
          )}
          <aside
            aria-label={t.shell.details}
            className={cn(
              'shrink-0 border-l border-line bg-sidebar',
              openPath ? 'w-[min(560px,100vw)]' : 'w-[300px]',
              !wide && 'fixed inset-y-0 right-0 z-30 shadow-2xl',
            )}
          >
            <RightPanel
              project={project}
              session={session}
              providerLabel={providerLabel}
              pricing={state.settings.pricing}
              openPath={openPath}
              onOpenPath={setOpenPath}
              onClose={() => {
                setOpenPath(null);
                setRightOpen(false);
              }}
            />
          </aside>
        </>
      )}
    </div>
  );
}
