import { FolderClosed, Plus, Search, Settings, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { dayLabel, STATUS_TONE, TONE_DOT } from '../app/labels.ts';
import { sessionStartedAt, type AppState, type View } from '../app/state.ts';
import { useI18n } from '../i18n/I18n.tsx';
import { cn, IconButton, Kbd, Logo } from './primitives.tsx';

interface Props {
  state: AppState;
  providerLabel: string;
  onNavigate: (view: View) => void;
  /** Incremented by the app (Ctrl+K) to open and focus the search box. */
  searchTick?: number;
}

function NavItem({
  icon,
  label,
  active,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13.5px] transition-colors',
        active
          ? 'bg-surface-3 font-medium text-ink'
          : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
      )}
    >
      <span className="text-ink-3">{icon}</span>
      {label}
      {shortcut && (
        <span className="ml-auto">
          <Kbd>{shortcut}</Kbd>
        </span>
      )}
    </button>
  );
}

export function Sidebar({ state, providerLabel, onNavigate, searchTick = 0 }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const view = state.view;
  const project = state.projects.find((p) => p.id === state.activeProjectId);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = state.sessions
      .filter((s) => s.projectId === state.activeProjectId)
      .filter((s) => !q || s.title.toLowerCase().includes(q) || s.request.toLowerCase().includes(q))
      .sort((a, b) => sessionStartedAt(b).localeCompare(sessionStartedAt(a)));
    const map = new Map<string, typeof list>();
    for (const s of list) {
      const label = dayLabel(sessionStartedAt(s), t.days, t.meta.dateLocale);
      map.set(label, [...(map.get(label) ?? []), s]);
    }
    return [...map.entries()];
  }, [state.sessions, state.activeProjectId, query, t]);

  const openSearch = () => {
    setSearching(true);
    inputRef.current?.focus();
  };

  // Ctrl+K from the app shell bumps searchTick (derived-state pattern, no effect).
  const [seenTick, setSeenTick] = useState(searchTick);
  if (seenTick !== searchTick) {
    setSeenTick(searchTick);
    setSearching(true);
  }
  useEffect(() => {
    if (searching) inputRef.current?.focus();
  }, [searching, searchTick]);

  return (
    <div className="flex h-full flex-col px-2.5 pt-3 pb-2.5">
      <div className="flex items-center gap-2.5 px-2 pb-4">
        <Logo />
        <span className="text-[15px] font-semibold tracking-[-0.01em]">Agent Orchestra</span>
      </div>

      <nav aria-label={t.sidebar.mainNav} className="grid gap-0.5">
        <NavItem
          icon={<Plus size={16} />}
          label={t.sidebar.newSession}
          shortcut="Ctrl N"
          active={view.name === 'home'}
          onClick={() => onNavigate({ name: 'home' })}
        />
        <NavItem
          icon={<Search size={16} />}
          label={t.sidebar.search}
          shortcut="Ctrl K"
          onClick={openSearch}
        />
        <NavItem
          icon={<Users size={16} />}
          label={t.sidebar.agents}
          active={view.name === 'agents' || view.name === 'agent'}
          onClick={() => onNavigate({ name: 'agents' })}
        />
        <NavItem
          icon={<FolderClosed size={16} />}
          label={t.sidebar.projects}
          active={view.name === 'projects'}
          onClick={() => onNavigate({ name: 'projects' })}
        />
      </nav>

      {(searching || query) && (
        <div className="relative mt-3">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-3"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQuery('');
                setSearching(false);
              }
            }}
            placeholder={t.sidebar.searchPlaceholder}
            aria-label={t.sidebar.searchPlaceholder}
            className="h-8 w-full rounded-lg border border-line bg-surface pr-8 pl-8 text-[13px] text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none"
          />
          <IconButton
            label={t.sidebar.closeSearch}
            className="absolute top-0 right-0"
            onClick={() => {
              setQuery('');
              setSearching(false);
            }}
          >
            <X size={14} />
          </IconButton>
        </div>
      )}

      <div
        className="mt-2 min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
        aria-label={t.sidebar.sessions}
      >
        {!project ? (
          <p className="px-2.5 pt-4 text-[12.5px] leading-relaxed text-ink-3">
            {t.sidebar.noProject}
          </p>
        ) : groups.length === 0 ? (
          <p className="px-2.5 pt-4 text-[12.5px] leading-relaxed text-ink-3">
            {query ? t.sidebar.noResults : t.sidebar.empty}
          </p>
        ) : (
          groups.map(([label, sessions]) => (
            <div key={label}>
              <h2 className="mx-2.5 mt-4 mb-1 text-[11.5px] font-semibold text-ink-3">{label}</h2>
              <ul className="flex flex-col gap-px">
                {sessions.map((s) => {
                  const active = view.name === 'session' && view.id === s.id;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => onNavigate({ name: 'session', id: s.id })}
                        aria-current={active ? 'page' : undefined}
                        title={`${s.title} — ${t.status[s.status]}`}
                        className={cn(
                          'flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] transition-colors',
                          active
                            ? 'bg-surface-3 text-ink'
                            : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                        )}
                      >
                        <span
                          className={cn(
                            'h-[7px] w-[7px] shrink-0 rounded-full',
                            TONE_DOT[STATUS_TONE[s.status]],
                          )}
                        />
                        <span className="truncate">{s.title}</span>
                        <span className="sr-only">({t.status[s.status]})</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="mt-2 flex items-center gap-2.5 border-t border-line px-1.5 pt-2.5">
        <button
          type="button"
          onClick={() => onNavigate({ name: 'projects' })}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1 text-left hover:bg-surface-2"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] font-bold text-accent">
            {(project?.name ?? '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] text-ink">
              {project?.name ?? t.sidebar.withoutProject}
            </span>
            <span className="block truncate text-[11.5px] text-ink-3">{providerLabel}</span>
          </span>
        </button>
        <IconButton
          label={t.sidebar.settings}
          active={view.name === 'settings'}
          onClick={() => onNavigate({ name: 'settings' })}
        >
          <Settings size={16} />
        </IconButton>
      </div>
    </div>
  );
}
