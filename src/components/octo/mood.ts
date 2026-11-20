import type { SessionStatus } from '../../domain/types.ts';

export const OCTO_MOODS = [
  'idle',
  'waving',
  'thinking',
  'working',
  'happy',
  'worried',
  'sleeping',
] as const;
export type OctoMood = (typeof OCTO_MOODS)[number];

/** Nome do humor para leitor de tela. */
export const OCTO_MOOD_LABEL: Record<OctoMood, string> = {
  idle: 'aguardando',
  waving: 'acenando',
  thinking: 'pensando',
  working: 'trabalhando',
  happy: 'comemorando',
  worried: 'preocupado',
  sleeping: 'descansando',
};

/** Humor do Octo para o estado real da sessão. */
export function octoMoodFor(status: SessionStatus, busy: boolean): OctoMood {
  if (busy) {
    if (status === 'planning') return 'thinking';
    if (status === 'executing' || status === 'reviewing') return 'working';
  }
  switch (status) {
    case 'completed':
      return 'happy';
    case 'failed':
      return 'worried';
    case 'cancelled':
    case 'rejected':
      return 'sleeping';
    default:
      return 'idle';
  }
}

/** Os agentes que o Octo coordena e os três humores deles. */
export type WorkerId = 'planner' | 'builder' | 'reviewer';
export const AGENT_MOODS = ['idle', 'working', 'done'] as const;
export type AgentMood = (typeof AGENT_MOODS)[number];
