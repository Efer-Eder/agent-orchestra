import { Eye, ListChecks, Wrench } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { AgentId, AgentProfile } from '../domain/agents.ts';
import { OctoMascot, type OctoMood } from './octo/index.ts';
import { cn, OrchestraMark } from './primitives.tsx';

const ICONS: Record<AgentId, (p: { size: number }) => React.ReactNode> = {
  orchestra: ({ size }) => <OrchestraMark width={size} height={size} />,
  planner: ({ size }) => <ListChecks size={size} strokeWidth={1.9} aria-hidden="true" />,
  builder: ({ size }) => <Wrench size={size} strokeWidth={1.9} aria-hidden="true" />,
  reviewer: ({ size }) => <Eye size={size} strokeWidth={1.9} aria-hidden="true" />,
};

/**
 * Agent avatar. Shows the mascot when it exists; until then a gradient disc in
 * the agent's color with a placeholder icon (see DESIGN.md, "Agentes e mascotes").
 * The Orchestra is drawn by Octo, the animated octopus, whose mood can follow the session.
 */
export function AgentAvatar({
  agent,
  size = 34,
  working = false,
  mood,
  className,
}: {
  agent: AgentProfile;
  size?: number;
  working?: boolean;
  /** Only for the Orchestra (Octo). */
  mood?: OctoMood;
  className?: string;
}) {
  const octo = agent.id === 'orchestra' && !agent.mascot;
  const style = {
    width: size,
    height: size,
    '--h': agent.hue,
    background: octo
      ? 'var(--accent-soft)'
      : agent.mascot
        ? undefined
        : `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${agent.hue} 72%, #fff), ${agent.hue} 55%, color-mix(in srgb, ${agent.hue} 60%, #000))`,
  } as CSSProperties;

  if (octo) {
    return (
      <span
        className={cn(
          'relative grid shrink-0 place-items-center rounded-full',
          working && 'ring-2 ring-[var(--h)] ring-offset-2 ring-offset-app',
          className,
        )}
        style={style}
        aria-hidden="true"
      >
        <OctoMascot size={Math.round(size * 1.04)} mood={mood ?? 'idle'} label={null} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden rounded-full text-white',
        working && 'ring-2 ring-[var(--h)] ring-offset-2 ring-offset-app',
        className,
      )}
      style={style}
      aria-hidden="true"
    >
      {agent.mascot ? (
        <img src={agent.mascot} alt="" className="h-full w-full object-cover" />
      ) : (
        ICONS[agent.id]({ size: Math.round(size * 0.48) })
      )}
      {working && (
        <span className="absolute inset-0 animate-pulse rounded-full bg-white/15 motion-reduce:hidden" />
      )}
    </span>
  );
}
