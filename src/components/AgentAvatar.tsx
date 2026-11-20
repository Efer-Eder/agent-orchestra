import type { CSSProperties } from 'react';
import type { AgentProfile } from '../domain/agents.ts';
import { AgentMascot, OctoMascot, type OctoMood } from './octo/index.ts';
import { cn } from './primitives.tsx';

/**
 * Agent avatar. The Orchestra is Octo, the animated octopus, whose mood can
 * follow the session; Planner, Builder and Reviewer are simpler mascots in
 * their own color that animate while working (see DESIGN.md, "Agentes e mascotes").
 * A raster mascot (`agent.mascot`) still wins when one is set.
 */
export function AgentAvatar({
  agent,
  size = 34,
  working = false,
  done = false,
  mood,
  className,
}: {
  agent: AgentProfile;
  size?: number;
  working?: boolean;
  /** The agent finished its part (workers show a happy face). */
  done?: boolean;
  /** Only for the Orchestra (Octo). */
  mood?: OctoMood;
  className?: string;
}) {
  const style = {
    width: size,
    height: size,
    '--h': agent.hue,
    background: agent.mascot
      ? undefined
      : agent.id === 'orchestra'
        ? 'var(--accent-soft)'
        : `color-mix(in srgb, ${agent.hue} 22%, var(--surface))`,
  } as CSSProperties;
  const inner = Math.round(size * 1.04);

  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center rounded-full',
        agent.mascot && 'overflow-hidden',
        working && 'ring-2 ring-[var(--h)] ring-offset-2 ring-offset-app',
        className,
      )}
      style={style}
      aria-hidden="true"
    >
      {agent.mascot ? (
        <img src={agent.mascot} alt="" className="h-full w-full object-cover" />
      ) : agent.id === 'orchestra' ? (
        <OctoMascot size={inner} mood={mood ?? 'idle'} label={null} />
      ) : (
        <AgentMascot
          agent={agent.id}
          hue={agent.hue}
          size={inner}
          mood={working ? 'working' : done ? 'done' : 'idle'}
          label={null}
        />
      )}
    </span>
  );
}
