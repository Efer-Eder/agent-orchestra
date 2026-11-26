import { ArrowLeft, Cpu, FileMinus, FilePen, FilePlus, Folder, X } from 'lucide-react';
import { agentList, agentProfile } from '../domain/agents.ts';
import { estimateCost, type Pricing } from '../domain/cost.ts';
import type { Project, Session } from '../domain/types.ts';
import { totalUsage } from '../domain/workflow.ts';
import { useI18n } from '../i18n/I18n.tsx';
import { diffStats } from '../providers/parse.ts';
import { formatDuration, formatMoney } from '../app/format.ts';
import { isDesktop } from '../app/secrets.ts';
import { AgentAvatar } from './AgentAvatar.tsx';
import { CodeText } from './code/Code.tsx';
import { languageForPath } from './code/lang.ts';
import { ContextList } from './SessionView.tsx';
import { cn, IconButton, SectionTitle } from './primitives.tsx';

const KIND_ICON = { create: FilePlus, modify: FilePen, delete: FileMinus } as const;
/** Rough reference size for the context bar; real limits depend on the model. */
const CONTEXT_REFERENCE_TOKENS = 128_000;

function lineClass(line: string): string {
  if (line.startsWith('+++') || line.startsWith('---')) return 'text-ink-3';
  if (line.startsWith('+')) return 'bg-ok-soft text-ok';
  if (line.startsWith('-')) return 'bg-bad-soft text-bad';
  if (line.startsWith('@@')) return 'text-accent';
  return 'text-ink-2';
}

/** Diff markers keep their colour; the code after them is highlighted. */
function DiffLine({ line, language }: { line: string; language: string | null }) {
  if (!line) return <> </>;
  const header = line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@');
  const marker = line[0];
  if (header || (marker !== '+' && marker !== '-' && marker !== ' ')) return <>{line}</>;
  return (
    <>
      <span className="select-none">{marker}</span>
      <CodeText code={line.slice(1)} language={language} />
    </>
  );
}

type AgentState = 'working' | 'done' | 'waiting' | 'leading' | null;

function agentState(session: Session | null, id: string): AgentState {
  if (!session) return null;
  const done = (kind: string) => session.events.some((e) => e.kind === kind);
  const s = session.status;
  if (id === 'planner') return s === 'planning' ? 'working' : done('plan') ? 'done' : 'waiting';
  if (id === 'builder')
    return s === 'executing' ? 'working' : done('execution') ? 'done' : 'waiting';
  if (id === 'reviewer') return s === 'reviewing' ? 'working' : done('review') ? 'done' : 'waiting';
  return 'leading';
}

export function RightPanel({
  project,
  session,
  providerLabel,
  pricing,
  openPath,
  onOpenPath,
  onClose,
}: {
  project: Project | null;
  session: Session | null;
  providerLabel: string;
  pricing: Pricing | null;
  openPath: string | null;
  onOpenPath: (path: string | null) => void;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const change = openPath ? session?.changes?.find((c) => c.path === openPath) : undefined;

  if (change) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-12 shrink-0 items-center gap-1.5 border-b border-line px-2">
          <IconButton label={t.panel.back} onClick={() => onOpenPath(null)}>
            <ArrowLeft size={16} />
          </IconButton>
          <code className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{change.path}</code>
          <IconButton label={t.session.closePanel} onClick={onClose}>
            <X size={16} />
          </IconButton>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto bg-code py-2 font-mono text-[12px] leading-[1.6]">
          {change.diff.split('\n').map((line, i) => (
            <div key={i} className={cn('px-3 whitespace-pre', lineClass(line))}>
              <DiffLine line={line} language={languageForPath(change.path)} />
            </div>
          ))}
        </pre>
        <p className="border-t border-line px-4 py-2.5 text-[12px] text-ink-3">
          {t.panel.readOnly}
        </p>
      </div>
    );
  }

  const usage = session ? totalUsage(session) : null;
  const used = usage ? usage.inputTokens + usage.outputTokens : 0;
  const pct = Math.min(100, Math.round((used / CONTEXT_REFERENCE_TOKENS) * 100));
  const cost = session ? estimateCost(session.usage, pricing) : null;
  const loc = t.meta.dateLocale;
  const costLine = usage?.synthetic
    ? t.panel.syntheticCost
    : cost !== null && pricing
      ? t.panel.estimate(formatMoney(cost, pricing.currency, loc), pricing.asOf)
      : t.panel.noCost;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-line pr-2 pl-4">
        <span className="text-[13px] font-semibold">{t.panel.details}</span>
        <IconButton label={t.session.closePanel} onClick={onClose}>
          <X size={16} />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <section className="border-b border-line px-4 py-3.5">
          <SectionTitle>{t.panel.environment}</SectionTitle>
          <dl className="grid grid-cols-[minmax(0,1fr)] gap-2 text-[13px]">
            <div className="flex min-w-0 items-center gap-2.5 text-ink-2">
              <Folder size={15} className="text-ink-3" />
              <dt className="sr-only">{t.panel.project}</dt>
              <dd className="min-w-0 flex-1 truncate">{project?.name ?? '—'}</dd>
              <dd
                className="max-w-[55%] min-w-0 truncate text-[12px] text-ink-3"
                title={project?.rootLabel}
              >
                {project?.rootLabel || t.panel.noFolder}
              </dd>
            </div>
            <div className="flex min-w-0 items-center gap-2.5 text-ink-2">
              <Cpu size={15} className="text-ink-3" />
              <dt>{t.panel.provider}</dt>
              <dd className="ml-auto max-w-[60%] truncate text-[12.5px] text-ink">
                {providerLabel}
              </dd>
            </div>
          </dl>
        </section>

        <section className="border-b border-line px-4 py-3.5">
          <SectionTitle>{t.panel.context}</SectionTitle>
          {!usage || session?.usage.length === 0 ? (
            <p className="text-[12.5px] text-ink-3">{t.panel.noCalls}</p>
          ) : (
            <>
              <div className="flex justify-between text-[13px] text-ink-2">
                <span>
                  {t.panel.tokens(
                    usage.inputTokens.toLocaleString(t.meta.dateLocale),
                    usage.outputTokens.toLocaleString(t.meta.dateLocale),
                  )}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-ink-3">
                {usage.synthetic ? t.panel.synthetic : t.panel.reported} {costLine}
              </p>
            </>
          )}
        </section>

        <section className="border-b border-line px-4 py-3.5">
          <SectionTitle>{t.panel.runs}</SectionTitle>
          {!session?.runs?.length ? (
            <p className="text-[12.5px] text-ink-3">{t.panel.noRuns}</p>
          ) : (
            <ol className="grid gap-2.5">
              {session.runs.map((r) => {
                const tokens = r.usage ? r.usage.inputTokens + r.usage.outputTokens : null;
                return (
                  <li key={r.id} className="min-w-0 text-[12.5px]">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-medium text-ink">
                        {agentProfile(r.role, locale).name}
                      </span>
                      <code className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink-3">
                        {r.model}
                      </code>
                      <span
                        className={cn(
                          'shrink-0 text-[11.5px]',
                          r.status === 'ok'
                            ? 'text-ok'
                            : r.status === 'failed'
                              ? 'text-bad'
                              : 'text-ink-3',
                        )}
                      >
                        {t.panel.runStatus[r.status]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-ink-3">
                      {formatDuration(r.durationMs, loc)}
                      {tokens !== null &&
                        ` · ${tokens.toLocaleString(loc)} tokens${r.usage?.synthetic ? ` ${t.panel.syntheticShort}` : ''}`}
                      {r.tools.map((tool) => (
                        <span key={tool.tool}>
                          {' · '}
                          {t.panel.tool[tool.tool](tool.count.toLocaleString(loc))}
                          {tool.skipped > 0 &&
                            `, ${t.panel.toolSkipped(tool.skipped.toLocaleString(loc))}`}
                        </span>
                      ))}
                    </p>
                    {r.error && (
                      <p className="mt-0.5 line-clamp-2 text-bad" title={r.error}>
                        {r.error}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="border-b border-line px-4 py-3.5">
          <SectionTitle>{t.files.panelTitle}</SectionTitle>
          {session?.context?.length ? (
            <ContextList files={session.context} />
          ) : (
            <p className="text-[12.5px] text-ink-3">
              {isDesktop() ? t.files.panelEmpty : t.files.webOnly}
            </p>
          )}
        </section>

        <section className="border-b border-line px-4 py-3.5">
          <SectionTitle>{t.panel.changes}</SectionTitle>
          {!session?.changes?.length ? (
            <p className="text-[12.5px] text-ink-3">
              {session?.status === 'awaiting_approval' ? t.panel.awaitingPlan : t.panel.noChanges}
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {session.changes.map((c) => {
                const Icon = KIND_ICON[c.kind];
                const { added, removed } = diffStats(c.diff);
                return (
                  <li key={c.path}>
                    <button
                      type="button"
                      onClick={() => onOpenPath(c.path)}
                      className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-[12.5px] hover:bg-surface-2"
                    >
                      <Icon size={14} className="shrink-0 text-ink-3" />
                      <code className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-2">
                        {c.path}
                      </code>
                      {added > 0 && <span className="text-ok">+{added}</span>}
                      {removed > 0 && <span className="text-bad">−{removed}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="px-4 py-3.5">
          <SectionTitle>{t.panel.agents}</SectionTitle>
          <ul className="grid gap-2.5">
            {agentList(locale).map((a) => {
              const st = agentState(session, a.id);
              return (
                <li key={a.id} className="flex items-center gap-2.5 text-[13px]">
                  <AgentAvatar
                    agent={a}
                    size={26}
                    working={st === 'working'}
                    done={st === 'done'}
                  />
                  {a.name}
                  <span className="ml-auto text-[12px] text-ink-3">
                    {st ? t.panel.agentState[st] : '·'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
