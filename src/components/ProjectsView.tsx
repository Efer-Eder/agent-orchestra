import { Check, Folder } from 'lucide-react';
import type { Project, Session } from '../domain/types.ts';
import { useI18n } from '../i18n/I18n.tsx';
import { ProjectForm } from './HomeView.tsx';
import { cn } from './primitives.tsx';

export function ProjectsView({
  projects,
  sessions,
  activeId,
  onSelect,
  onCreate,
}: {
  projects: Project[];
  sessions: Session[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string, root: string) => Promise<string | null>;
}) {
  const { t } = useI18n();
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-[720px] gap-5 px-6 py-8">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">{t.projects.title}</h1>
          <p className="mt-1.5 text-[14px] text-ink-3">{t.projects.subtitle}</p>
        </div>
        {projects.length > 0 && (
          <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
            {projects.map((p) => {
              const count = sessions.filter((s) => s.projectId === p.id).length;
              const active = p.id === activeId;
              return (
                <li key={p.id} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onSelect(p.id)}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2',
                      active && 'bg-accent-soft/50',
                    )}
                  >
                    <Folder size={17} className="text-ink-3" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium">{p.name}</span>
                      <span className="block truncate text-[12px] text-ink-3">
                        {p.rootLabel || t.projects.noFolder} · {t.projects.sessions(count)}
                      </span>
                    </span>
                    {active && <Check size={16} className="text-accent" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-4 text-[15px] font-semibold">{t.projects.newProject}</h2>
          <ProjectForm onCreate={onCreate} />
        </section>
      </div>
    </div>
  );
}
