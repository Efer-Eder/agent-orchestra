import type { SessionStatus } from '../../domain/types.ts';

export const OCTO_MOODS = [
  'idle',
  'waving',
  'thinking',
  'working',
  'happy',
  'worried',
  'sleeping',
  'conducting',
  'reviewing',
  'downloading',
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
  conducting: 'regendo',
  reviewing: 'revisando',
  downloading: 'baixando',
};

/**
 * Humor do Octo para o estado real da sessão (controle central dos estados).
 * planejando → pensando, Builder → coordenando (working), Reviewer → lupa,
 * concluída → reverência, falha → aponta o problema, encerrada → descansa.
 */
export function octoMoodFor(status: SessionStatus, busy: boolean): OctoMood {
  if (busy) {
    if (status === 'draft') return 'conducting';
    if (status === 'planning') return 'thinking';
    if (status === 'executing') return 'working';
    if (status === 'reviewing') return 'reviewing';
  }
  switch (status) {
    case 'completed':
    case 'awaiting_final_approval':
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
