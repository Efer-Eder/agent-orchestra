import {
  ChevronRight,
  CircleCheck,
  CircleX,
  FileMinus,
  FilePen,
  FilePlus,
  PanelRight,
  Trash,
  TriangleExclamationPoint,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { STATUS_LABEL, STATUS_TONE, TONE_BADGE } from '../app/labels.ts';
import { AGENTS, type AgentId } from '../domain/agents.ts';
import type { ProposedChange, Session, TimelineEvent } from '../domain/types.ts';
import { diffStats } from '../providers/parse.ts';
import { AgentAvatar } from './AgentAvatar.tsx';
import { Composer } from './Composer.tsx';
import { OctoMascot, octoMoodFor, type OctoMood } from './octo/index.ts';
import { Button, cn, IconButton } from './primitives.tsx';

interface Props {
  session: Session;
  busy: boolean;
  providerLabel: string;
  rightOpen: boolean;
  onToggleRight: () => void;
  onApprove: () => void;
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

function time(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

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
  const agent = AGENTS[agentId];
  return (
    <div className="grid animate-fade-up grid-cols-[34px_minmax(0,1fr)] gap-3">
      <AgentAvatar agent={agent} working={working ?? false} {...(mood ? { mood } : {})} />
      <div className="min-w-0 pt-0.5">
        <div className="flex items-baseline gap-2 text-[13px] font-semibold">
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
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  if (!session.plan) return null;
  return (
    <div
      className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface"
      role={awaiting ? 'region' : undefined}
      aria-label={awaiting ? 'Plano aguardando aprovação' : undefined}
    >
      <ol className="grid list-decimal gap-1.5 py-3 pr-4 pl-9 text-[14px] leading-snug text-ink marker:text-ink-3">
        {session.plan.tasks.map((t) => (
          <li key={t.id}>
            {t.title}
            {t.detail && <span className="block text-[12.5px] text-ink-3">{t.detail}</span>}
          </li>
        ))}
      </ol>
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
                placeholder="Motivo (opcional)"
                aria-label="Motivo da rejeição"
                className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-[13px] focus:border-accent focus:outline-none"
              />
              <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
                Voltar
              </Button>
              <Button size="sm" variant="danger" type="submit">
                Confirmar rejeição
              </Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 text-[12.5px] text-ink-2">
                Aprovar libera o Builder para <b className="font-semibold">propor</b> alterações.
                Nada é gravado no disco.
              </span>
              <Button size="sm" onClick={() => setRejecting(true)}>
                Rejeitar
              </Button>
              <Button size="sm" variant="primary" onClick={onApprove}>
                Aprovar plano
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function renderEvent(ev: TimelineEvent, props: Props) {
  const { session } = props;
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
        <AgentTurn key={ev.id} agentId="planner" meta={`plano · ${time(ev.at)}`}>
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
          Você aprovou o plano · {time(ev.at)}
        </SystemLine>
      );
    case 'rejection':
      return (
        <SystemLine key={ev.id} icon={<CircleX size={14} />}>
          {ev.message}
        </SystemLine>
      );
    case 'execution':
      return (
        <AgentTurn key={ev.id} agentId="builder" meta={`alterações · ${time(ev.at)}`}>
          {ev.message}
          {session.changes && session.changes.length > 0 && (
            <ChangeList changes={session.changes} onOpen={props.onOpenChange} />
          )}
        </AgentTurn>
      );
    case 'review':
      return (
        <AgentTurn key={ev.id} agentId="reviewer" meta={`revisão · ${time(ev.at)}`}>
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
            {session.review?.verdict === 'approve' ? 'Aprovado pelo Reviewer' : 'Pede ajustes'}
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
    case 'cancelled':
      return (
        <SystemLine key={ev.id} icon={<CircleX size={14} />}>
          {ev.message}
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
          <span>{ev.message}</span>
        </div>
      );
  }
}

export function SessionView(props: Props) {
  const { session, busy } = props;
  const feedRef = useRef<HTMLDivElement>(null);
  const working = busy ? WORKING_AGENT[session.status] : undefined;
  const tone = STATUS_TONE[session.status];
  // O Octo acompanha o que os agentes estão fazendo.
  const mood = octoMoodFor(session.status, busy);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [session.events.length, busy]);

  const awaiting = session.status === 'awaiting_approval';
  const terminal = ['completed', 'rejected', 'cancelled', 'failed'].includes(session.status);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <OctoMascot size={30} mood={mood} />
        <h1 className="min-w-0 truncate text-[14px] font-semibold">{session.title}</h1>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[11.5px] font-semibold',
            TONE_BADGE[tone],
          )}
        >
          {STATUS_LABEL[session.status]}
        </span>
        <span className="flex-1" />
        <IconButton label="Apagar sessão" onClick={props.onDelete}>
          <Trash size={15} />
        </IconButton>
        <IconButton
          label={props.rightOpen ? 'Fechar painel' : 'Abrir painel'}
          active={props.rightOpen}
          onClick={props.onToggleRight}
        >
          <PanelRight size={16} />
        </IconButton>
      </header>

      <div ref={feedRef} className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        <div className="mx-auto grid max-w-[720px] gap-5 px-6 pt-6 pb-8">
          {session.events.slice(0, 1).map((ev) => renderEvent(ev, props))}
          <AgentTurn agentId="orchestra" meta="maestro" mood={mood}>
            Vou pedir um plano ao Planner. Nada é alterado antes da sua aprovação.
          </AgentTurn>
          {session.events.slice(1).map((ev) => renderEvent(ev, props))}
          {working && (
            <AgentTurn agentId={working} meta="trabalhando…" working>
              <div className="grid gap-2 pt-1" aria-label="Carregando">
                <span className="h-3 w-3/4 animate-pulse rounded bg-surface-3" />
                <span className="h-3 w-1/2 animate-pulse rounded bg-surface-3" />
              </div>
            </AgentTurn>
          )}
        </div>
      </div>

      <div className="shrink-0 px-6 pt-1 pb-4">
        <Composer
          agent={AGENTS.orchestra}
          busy={busy}
          onStop={props.onCancel}
          placeholder={
            awaiting
              ? 'Peça um ajuste no plano…'
              : terminal
                ? 'Nova solicitação neste projeto…'
                : 'Aguarde os agentes terminarem…'
          }
          disabled={!awaiting && !terminal && !busy}
          onSubmit={(text) => (awaiting ? props.onAdjust(text) : props.onNewRequest(text))}
          meta={
            <>
              <span>{props.providerLabel}</span>
              <span>Aprovação manual</span>
            </>
          }
        />
      </div>
    </div>
  );
}
