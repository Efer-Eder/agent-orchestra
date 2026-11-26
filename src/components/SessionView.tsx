import {
  ChevronRight,
  CircleCheck,
  CircleX,
  FileMinus,
  FilePen,
  FilePlus,
  FileSearch,
  PanelRight,
  Trash,
  TriangleExclamationPoint,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { runSummary } from '../app/format.ts';
import { STATUS_TONE, TONE_BADGE } from '../app/labels.ts';
import { runForEvent } from '../domain/cost.ts';
import { agentProfile, type AgentId } from '../domain/agents.ts';
import type { ContextFile, ProposedChange, Session, TimelineEvent } from '../domain/types.ts';
import { useI18n } from '../i18n/I18n.tsx';
import type { Messages } from '../i18n/messages.ts';
import { diffStats } from '../providers/parse.ts';
import { AgentAvatar } from './AgentAvatar.tsx';
import { Composer } from './Composer.tsx';
import { OctoMascot, octoMoodFor, type OctoMood } from './octo/index.ts';
import { Button, cn, IconButton } from './primitives.tsx';

interface Props {
  session: Session;
  busy: boolean;
  /** Model text streaming in for the current step, if any. */
  liveText?: string | undefined;
  providerLabel: string;
  rightOpen: boolean;
  onToggleRight: () => void;
  onApprove: () => void;
  onApproveFinal: () => void;
  onReject: (reason: string) => void;
  onAdjust: (note: string) => string | null;
  onCancel: () => void;
  onDelete: () => void;
  onNewRequest: (text: string) => string | null;
  onOpenChange: (path: string) => void;
}

const WORKING_AGENT: Partial<Record<Session['status'], AgentId>> = {
  planning: 'planner',
  executing: 'builder',
  reviewing: 'reviewer',
};

function AgentTurn({
  agentId,
  meta,
  working,
  mood,
  children,
}: {
  agentId: AgentId;
  meta?: string;
  working?: boolean;
  mood?: OctoMood;
  children: React.ReactNode;
}) {
  const { locale } = useI18n();
  const agent = agentProfile(agentId, locale);
  return (
    <div className="grid animate-fade-up grid-cols-[34px_minmax(0,1fr)] gap-3">
      <AgentAvatar agent={agent} working={working ?? false} {...(mood ? { mood } : {})} />
      <div className="min-w-0 pt-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2 text-[13px] font-semibold">
          {agent.name}
          {meta && <span className="text-[12px] font-normal text-ink-3">{meta}</span>}
        </div>
        <div className="mt-1 text-[14px] leading-relaxed text-ink-2">{children}</div>
      </div>
    </div>
  );
}

function SystemLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pl-[46px] text-[12.5px] text-ink-3">
      {icon}
      <span>{children}</span>
    </div>
  );
}

const KIND_ICON = { create: FilePlus, modify: FilePen, delete: FileMinus } as const;

/** Files given to the Builder, with why any of them was not read. */
export function ContextList({ files }: { files: ContextFile[] }) {
  const { t } = useI18n();
  return (
    <ul className="grid gap-1">
      {files.map((f) => (
        <li key={f.path} className="flex items-center gap-2 text-[12.5px]">
          <FileSearch size={13} className="shrink-0 text-ink-3" />
          <code
            className={cn(
              'min-w-0 flex-1 truncate font-mono text-[12px]',
              f.skipped ? 'text-ink-3 line-through' : 'text-ink-2',
            )}
          >
            {f.path}
          </code>
          {f.skipped ? (
            <span className="shrink-0 text-[11.5px] text-warn">
              {t.files.skipped[f.skipped as keyof typeof t.files.skipped] ?? f.skipped}
            </span>
          ) : (
            <>
              {f.truncated && (
                <span className="shrink-0 text-[11.5px] text-ink-3">{t.files.truncated}</span>
              )}
              {f.redactions > 0 && (
                <span className="shrink-0 text-[11.5px] text-warn">
                  {t.files.redacted(f.redactions)}
                </span>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

function ChangeList({
  changes,
  onOpen,
}: {
  changes: ProposedChange[];
  onOpen: (path: string) => void;
}) {
  return (
    <ul className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface">
      {changes.map((c) => {
        const Icon = KIND_ICON[c.kind];
        const { added, removed } = diffStats(c.diff);
        return (
          <li key={c.path} className="border-b border-line last:border-b-0">
            <button
              type="button"
              onClick={() => onOpen(c.path)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] hover:bg-surface-2"
            >
              <Icon size={15} className="shrink-0 text-ink-3" />
              <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink">
                {c.path}
              </code>
              {added > 0 && <span className="text-[12px] text-ok">+{added}</span>}
              {removed > 0 && <span className="text-[12px] text-bad">−{removed}</span>}
              <ChevronRight size={14} className="text-ink-3" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function PlanCard({
  session,
  awaiting,
  onApprove,
  onReject,
}: {
  session: Session;
  awaiting: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const { t } = useI18n();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  if (!session.plan) return null;
  return (
    <div
      className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface"
      role={awaiting ? 'region' : undefined}
      aria-label={awaiting ? t.session.awaitingAria : undefined}
    >
      <ol className="grid list-decimal gap-1.5 py-3 pr-4 pl-9 text-[14px] leading-snug text-ink marker:text-ink-3">
        {session.plan.tasks.map((task) => (
          <li key={task.id}>
            {task.title}
            {task.detail && <span className="block text-[12.5px] text-ink-3">{task.detail}</span>}
          </li>
        ))}
      </ol>
      {session.plan.files && session.plan.files.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <div className="mb-2 flex items-center gap-1.5 text-[12.5px] font-medium text-ink-2">
            <FileSearch size={14} className="text-ink-3" />
            {t.files.planTitle}
          </div>
          <ul className="grid gap-1">
            {session.plan.files.map((f) => (
              <li key={f}>
                <code className="font-mono text-[12px] text-ink-2">{f}</code>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-3">{t.files.planHint}</p>
        </div>
      )}
      {awaiting && (
        <div className="border-t border-line bg-surface-2 px-3 py-2.5">
          {rejecting ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                onReject(reason);
              }}
            >
              <input
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t.session.reasonPlaceholder}
                aria-label={t.session.reasonAria}
                className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-[13px] focus:border-accent focus:outline-none"
              />
              <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
                {t.common.back}
              </Button>
              <Button size="sm" variant="danger" type="submit">
                {t.session.confirmReject}
              </Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 text-[12.5px] text-ink-2">
                {t.session.approveHint.before}
                <b className="font-semibold">{t.session.approveHint.strong}</b>
                {t.session.approveHint.after}
              </span>
              <Button size="sm" onClick={() => setRejecting(true)}>
                {t.session.reject}
              </Button>
              <Button size="sm" variant="primary" onClick={onApprove}>
                {t.session.approve}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FinalCard({
  session,
  onAccept,
  onReject,
}: {
  session: Session;
  onAccept: () => void;
  onReject: (reason: string) => void;
}) {
  const { t } = useI18n();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const asksChanges = session.review?.verdict === 'request_changes';
  return (
    <div
      role="region"
      aria-label={t.session.finalAria}
      className="ml-[46px] animate-fade-up overflow-hidden rounded-xl border border-warn/40 bg-surface"
    >
      <div className="px-4 py-3">
        <p className="text-[14px] font-semibold text-ink">{t.session.finalTitle}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
          {asksChanges ? t.session.finalHintChanges : t.session.finalHint}
        </p>
      </div>
      <div className="border-t border-line bg-surface-2 px-3 py-2.5">
        {rejecting ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onReject(reason);
            }}
          >
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.session.reasonPlaceholder}
              aria-label={t.session.reasonAria}
              className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-[13px] focus:border-accent focus:outline-none"
            />
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              {t.common.back}
            </Button>
            <Button size="sm" variant="danger" type="submit">
              {t.session.confirmReject}
            </Button>
          </form>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" onClick={() => setRejecting(true)}>
              {t.session.reject}
            </Button>
            <Button size="sm" variant="primary" onClick={onAccept}>
              {t.session.accept}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The end of the answer as it streams in. The structured reply (JSON) is only
 * shown in full once validated; here it is just a sign of progress.
 */
function LiveTail({ text }: { text: string }) {
  const tail = text.length > 600 ? `…${text.slice(-600)}` : text;
  return (
    <pre
      aria-hidden="true"
      className="mt-1 max-h-40 overflow-hidden rounded-lg border border-line bg-code px-3 py-2 font-mono text-[11.5px] leading-[1.55] whitespace-pre-wrap text-ink-3"
    >
      {tail}
      <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-accent align-middle" />
    </pre>
  );
}

function renderEvent(ev: TimelineEvent, props: Props, t: Messages, time: (iso: string) => string) {
  const { session } = props;
  const run = runForEvent(session, ev);
  const extra = run ? ` · ${runSummary(run, t.meta.dateLocale, t.panel.syntheticShort)}` : '';
  switch (ev.kind) {
    case 'request':
      return (
        <div key={ev.id} className="flex animate-fade-up justify-end">
          <div className="max-w-[85%] rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap text-ink">
            {ev.message}
          </div>
        </div>
      );
    case 'plan':
      return (
        <AgentTurn
          key={ev.id}
          agentId="planner"
          meta={`${t.session.planMeta} · ${time(ev.at)}${extra}`}
        >
          {session.plan?.summary}
          <PlanCard
            session={session}
            awaiting={session.status === 'awaiting_approval' && !props.busy}
            onApprove={props.onApprove}
            onReject={props.onReject}
          />
        </AgentTurn>
      );
    case 'approval':
      return (
        <SystemLine key={ev.id} icon={<CircleCheck size={14} className="text-ok" />}>
          {t.session.approved} · {time(ev.at)}
        </SystemLine>
      );
    case 'rejection':
      return (
        <SystemLine key={ev.id} icon={<CircleX size={14} />}>
          {t.session.rejected(ev.detail ?? '')}
        </SystemLine>
      );
    case 'execution':
      return (
        <AgentTurn
          key={ev.id}
          agentId="builder"
          meta={`${t.session.changesMeta} · ${time(ev.at)}${extra}`}
        >
          {t.session.proposed(session.changes?.length ?? 0)}
          {session.context && session.context.length > 0 && (
            <details className="mt-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5">
              <summary className="cursor-pointer text-[12.5px] text-ink-2 select-none">
                {t.files.readTitle(session.context.filter((f) => !f.skipped).length)}
              </summary>
              <div className="mt-2">
                <ContextList files={session.context} />
              </div>
            </details>
          )}
          {session.changes && session.changes.length > 0 && (
            <ChangeList changes={session.changes} onOpen={props.onOpenChange} />
          )}
        </AgentTurn>
      );
    case 'review':
      return (
        <AgentTurn
          key={ev.id}
          agentId="reviewer"
          meta={`${t.session.reviewMeta} · ${time(ev.at)}${extra}`}
        >
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-medium',
              session.review?.verdict === 'approve' ? 'text-ok' : 'text-warn',
            )}
          >
            {session.review?.verdict === 'approve' ? (
              <CircleCheck size={15} />
            ) : (
              <TriangleExclamationPoint size={15} />
            )}
            {session.review?.verdict === 'approve'
              ? t.session.reviewApproved
              : t.session.reviewChanges}
          </span>
          {session.review && session.review.comments.length > 0 && (
            <ul className="mt-1.5 grid list-disc gap-1 pl-5">
              {session.review.comments.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </AgentTurn>
      );
    case 'final_approval':
      return (
        <SystemLine key={ev.id} icon={<CircleCheck size={14} className="text-ok" />}>
          {t.session.finalApproved} · {time(ev.at)}
        </SystemLine>
      );
    case 'cancelled':
      return (
        <SystemLine key={ev.id} icon={<CircleX size={14} />}>
          {t.session.cancelled}
        </SystemLine>
      );
    case 'error':
      return (
        <div
          key={ev.id}
          role="alert"
          className="ml-[46px] flex gap-2.5 rounded-xl border border-bad/30 bg-bad-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-bad"
        >
          <TriangleExclamationPoint size={15} className="mt-0.5 shrink-0" />
          <span>{ev.code === 'interrupted' ? t.session.interrupted : ev.message}</span>
        </div>
      );
  }
}

export function SessionView(props: Props) {
  const { session, busy } = props;
  const { t, locale } = useI18n();
  const feedRef = useRef<HTMLDivElement>(null);
  // A brand-new session is saved as a draft and only becomes `planning` when the
  // provider answers; while the call is in flight, show it as planning.
  const status = busy && session.status === 'draft' ? 'planning' : session.status;
  const working = busy ? WORKING_AGENT[status] : undefined;
  const tone = STATUS_TONE[status];
  // Octo follows what the agents are doing.
  const mood = octoMoodFor(status, busy);
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(t.meta.dateLocale, { hour: '2-digit', minute: '2-digit' });

  const streaming = Boolean(props.liveText);
  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [session.events.length, busy, streaming]);

  const awaitingFinal = session.status === 'awaiting_final_approval';
  const awaiting = session.status === 'awaiting_approval' || awaitingFinal;
  const terminal = ['completed', 'rejected', 'cancelled', 'failed'].includes(session.status);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <OctoMascot size={30} mood={mood} label={t.session.octoLabel(t.octoMood[mood])} />
        <h1 className="min-w-0 truncate text-[14px] font-semibold">{session.title}</h1>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold',
            TONE_BADGE[tone],
          )}
        >
          {t.status[status]}
        </span>
        <span className="flex-1" />
        <IconButton label={t.session.delete} onClick={props.onDelete}>
          <Trash size={15} />
        </IconButton>
        <IconButton
          label={props.rightOpen ? t.session.closePanel : t.session.openPanel}
          active={props.rightOpen}
          onClick={props.onToggleRight}
        >
          <PanelRight size={16} />
        </IconButton>
      </header>

      <div ref={feedRef} className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        <div className="mx-auto grid max-w-[720px] gap-5 px-6 pt-6 pb-8">
          {session.events.slice(0, 1).map((ev) => renderEvent(ev, props, t, time))}
          <AgentTurn agentId="orchestra" meta={t.session.maestro} mood={mood}>
            {t.session.orchestraIntro}
          </AgentTurn>
          {session.events.slice(1).map((ev) => renderEvent(ev, props, t, time))}
          {awaitingFinal && !busy && (
            <FinalCard
              session={session}
              onAccept={props.onApproveFinal}
              onReject={props.onReject}
            />
          )}
          {working && (
            <AgentTurn
              agentId={working}
              meta={
                props.liveText
                  ? t.session.receiving(props.liveText.length.toLocaleString(t.meta.dateLocale))
                  : t.session.working
              }
              working
            >
              {props.liveText ? (
                <LiveTail text={props.liveText} />
              ) : (
                <div className="grid gap-2 pt-1" aria-label={t.common.loading}>
                  <span className="h-3 w-3/4 animate-pulse rounded bg-surface-3" />
                  <span className="h-3 w-1/2 animate-pulse rounded bg-surface-3" />
                </div>
              )}
            </AgentTurn>
          )}
        </div>
      </div>

      <div className="shrink-0 px-6 pt-1 pb-4">
        <Composer
          agent={agentProfile('orchestra', locale)}
          busy={busy}
          onStop={props.onCancel}
          placeholder={
            awaiting
              ? t.session.placeholderAdjust
              : terminal
                ? t.session.placeholderNew
                : t.session.placeholderWait
          }
          disabled={!awaiting && !terminal && !busy}
          onSubmit={(text) => (awaiting ? props.onAdjust(text) : props.onNewRequest(text))}
          meta={
            <>
              <span>{props.providerLabel}</span>
              <span>{t.common.manualApproval}</span>
            </>
          }
        />
      </div>
    </div>
  );
}
