import { ArrowLeft, Eraser, MessageCircle } from 'lucide-react';
import { useEffect, useRef, type CSSProperties } from 'react';
import { AGENT_LIST, AGENTS, type AgentId, type AgentProfile } from '../domain/agents.ts';
import type { ChatMessage } from '../domain/types.ts';
import { AgentAvatar } from './AgentAvatar.tsx';
import { Composer } from './Composer.tsx';
import { Button, cn, IconButton } from './primitives.tsx';

function Stage({ agent, lead }: { agent: AgentProfile; lead?: boolean }) {
  return (
    <div
      className="relative grid h-40 place-items-center overflow-hidden rounded-xl bg-surface-2"
      style={
        {
          background: `radial-gradient(ellipse at 50% 115%, color-mix(in srgb, ${agent.hue} 38%, transparent), transparent 70%), var(--surface-2)`,
        } as CSSProperties
      }
    >
      <AgentAvatar agent={agent} size={lead ? 108 : 88} className="animate-breathe" />
      {!agent.mascot && (
        <span className="absolute top-2 right-2 rounded-full border border-line bg-surface px-2 py-0.5 text-[10.5px] text-ink-3">
          mascote em breve
        </span>
      )}
    </div>
  );
}

export function AgentsView({
  chats,
  onOpen,
}: {
  chats: Partial<Record<AgentId, ChatMessage[]>>;
  onOpen: (id: AgentId) => void;
}) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-[1080px] px-6 py-8">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Agentes</h1>
        <p className="mt-1.5 max-w-xl text-[14px] leading-relaxed text-ink-3">
          Converse direto com cada agente. O Orchestra conduz as sessões; os outros três trabalham
          sob a batuta dele.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr_1fr]">
          {AGENT_LIST.map((a, i) => {
            const count = chats[a.id]?.length ?? 0;
            return (
              <article
                key={a.id}
                className={cn(
                  'flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4',
                  i === 0 && 'sm:col-span-2 xl:col-span-1',
                )}
              >
                <Stage agent={a} lead={i === 0} />
                <div>
                  <h2 className="text-[15px] font-semibold">{a.name}</h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{a.tagline}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
                    {a.responsibility}
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant={i === 0 ? 'primary' : 'secondary'}
                    onClick={() => onOpen(a.id)}
                  >
                    <MessageCircle size={14} />
                    Conversar
                  </Button>
                  {count > 0 && <span className="text-[12px] text-ink-3">{count} mensagens</span>}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AgentChatView({
  agentId,
  messages,
  busy,
  providerLabel,
  onBack,
  onSend,
  onStop,
  onClear,
}: {
  agentId: AgentId;
  messages: ChatMessage[];
  busy: boolean;
  providerLabel: string;
  onBack: () => void;
  onSend: (text: string) => Promise<void>;
  onStop: () => void;
  onClear: () => void;
}) {
  const agent = AGENTS[agentId];
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, busy]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-line px-3">
        <IconButton label="Voltar para Agentes" onClick={onBack}>
          <ArrowLeft size={16} />
        </IconButton>
        <AgentAvatar agent={agent} size={24} />
        <h1 className="text-[14px] font-semibold">{agent.name}</h1>
        <span className="truncate text-[12.5px] text-ink-3">{agent.tagline}</span>
        <span className="flex-1" />
        {messages.length > 0 && (
          <IconButton label="Limpar conversa" onClick={onClear}>
            <Eraser size={15} />
          </IconButton>
        )}
      </header>
      <div ref={feedRef} className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
        <div className="mx-auto grid max-w-[720px] gap-5 px-6 pt-6 pb-8">
          {messages.length === 0 && (
            <div className="flex flex-col items-center py-10 text-center">
              <AgentAvatar agent={agent} size={72} className="animate-breathe" />
              <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-ink-2">
                {agent.responsibility}
              </p>
              <p className="mt-1 text-[12.5px] text-ink-3">Diga oi para começar.</p>
            </div>
          )}
          {messages.map((m) =>
            m.from === 'user' ? (
              <div key={m.id} className="flex animate-fade-up justify-end">
                <div className="max-w-[85%] rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="grid animate-fade-up grid-cols-[34px_minmax(0,1fr)] gap-3">
                <AgentAvatar agent={agent} />
                <div className="min-w-0 pt-0.5">
                  <div className="text-[13px] font-semibold">{agent.name}</div>
                  <div
                    className={cn(
                      'mt-1 text-[14px] leading-relaxed whitespace-pre-wrap',
                      m.error ? 'text-bad' : 'text-ink-2',
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            ),
          )}
          {busy && (
            <div className="grid grid-cols-[34px_minmax(0,1fr)] gap-3">
              <AgentAvatar agent={agent} working />
              <div className="grid gap-2 pt-2" aria-label="Carregando">
                <span className="h-3 w-2/3 animate-pulse rounded bg-surface-3" />
                <span className="h-3 w-1/3 animate-pulse rounded bg-surface-3" />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0 px-6 pt-1 pb-4">
        <Composer
          agent={agent}
          busy={busy}
          onStop={onStop}
          autoFocus
          placeholder={`Mensagem para ${agent.name}…`}
          onSubmit={onSend}
          meta={
            <>
              <span>{providerLabel}</span>
              <span>Conversa salva neste dispositivo</span>
            </>
          }
        />
      </div>
    </div>
  );
}
