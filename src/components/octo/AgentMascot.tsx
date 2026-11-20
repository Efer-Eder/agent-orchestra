import './agents.css';
import type { AgentMood, WorkerId } from './mood.ts';
import { FORCE_FROM_URL } from './motion.ts';

const NAME: Record<WorkerId, string> = {
  planner: 'Planner',
  builder: 'Builder',
  reviewer: 'Reviewer',
};
const MOOD_LABEL: Record<AgentMood, string> = {
  idle: 'aguardando',
  working: 'trabalhando',
  done: 'concluiu',
};

export interface AgentMascotProps {
  agent: WorkerId;
  /** Cor do agente (AGENTS[id].hue). */
  hue: string;
  size?: number;
  mood?: AgentMood;
  animated?: boolean;
  /** `always` ignora "reduzir movimento" do sistema. Só para laboratório e demonstrações. */
  motion?: 'auto' | 'always';
  className?: string;
  /** Texto para leitor de tela. Use `null` quando for só decorativo. */
  label?: string | null;
}

/**
 * Os agentes que o Octo coordena. De propósito mais simples que ele: um corpo
 * redondo na cor do agente, olhos simples e um único acessório que conta o que
 * cada um faz. Três humores: aguardando, trabalhando e concluiu.
 */
export function AgentMascot({
  agent,
  hue,
  size = 96,
  mood = 'idle',
  animated = true,
  motion = 'auto',
  className = '',
  label,
}: AgentMascotProps) {
  const classes = [
    'agm',
    `agm--${agent}`,
    `agm--${mood}`,
    animated ? 'agm--live' : '',
    motion === 'always' || FORCE_FROM_URL ? 'agm--force' : '',
    size < 40 ? 'agm--small' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const name = label === undefined ? `${NAME[agent]}, ${MOOD_LABEL[mood]}` : label;
  const a11y = name === null ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name };
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={classes}
      style={{ '--agm-hue': hue } as React.CSSProperties}
      {...a11y}
    >
      <g className="agm-float">
        {agent === 'builder' && (
          <g className="agm-tool agm-wrench">
            <path d="M64 72L79 57" />
            <path className="agm-metal" d="M76.6 49.4A6 6 0 1 0 84.6 57.4L80.9 56.6L79.4 53.1Z" />
          </g>
        )}
        <rect className="agm-body" x="27" y="30" width="46" height="46" rx="19" />
        {agent === 'builder' && (
          <g className="agm-hat">
            <path d="M32 35Q32 18 50 18Q68 18 68 35Z" />
            <rect x="27.5" y="32.5" width="45" height="5" rx="2.5" />
            <path className="agm-hat-line" d="M50 19V31" />
          </g>
        )}

        <g className="agm-look">
          <g className="agm-eyes agm-blink">
            <rect x="40.8" y="47.5" width="4.4" height="7.6" rx="2.2" />
            <rect x="54.8" y="47.5" width="4.4" height="7.6" rx="2.2" />
          </g>
        </g>
        <path
          className="agm-line agm-eyes-done"
          d="M39.5 52.5Q43 47.5 46.5 52.5M53.5 52.5Q57 47.5 60.5 52.5"
        />
        {agent === 'reviewer' && (
          <g className="agm-glasses">
            <circle cx="43" cy="51.3" r="6.6" />
            <circle cx="57" cy="51.3" r="6.6" />
            <path d="M49.6 50.5Q50 49.3 50.4 50.5" />
          </g>
        )}
        <path className="agm-line agm-mouth" d="M46.5 62Q50 64.6 53.5 62" />

        {agent === 'planner' && (
          <g className="agm-tool agm-board">
            <rect className="agm-paper" x="59" y="50" width="22" height="27" rx="3" />
            <rect className="agm-clip" x="65" y="47.5" width="10" height="5" rx="2" />
            {[0, 1, 2].map((i) => (
              <g key={i} className={`agm-row agm-row-${i}`}>
                <rect className="agm-box" x="62.5" y={56 + i * 6.5} width="4" height="4" rx="1" />
                <path className="agm-tick" d={`M63 ${58 + i * 6.5}l1.3 1.3l2.6-3`} />
                <path className="agm-text" d={`M69.5 ${58 + i * 6.5}H${i === 1 ? 75 : 78}`} />
              </g>
            ))}
          </g>
        )}
        {agent === 'reviewer' && (
          <g className="agm-tool agm-lens">
            <path className="agm-halo" d="M80 66.5L85.5 74" />
            <circle className="agm-halo" cx="76" cy="60.5" r="6" />
            <path className="agm-handle" d="M80 66.5L85.5 74" />
            <circle className="agm-glass" cx="76" cy="60.5" r="6" />
          </g>
        )}
      </g>
    </svg>
  );
}
