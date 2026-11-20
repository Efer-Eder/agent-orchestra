import type { AgentRole, SessionStatus } from '../domain/types.ts';

export const STATUS_LABEL: Record<SessionStatus, string> = {
  draft: 'Rascunho',
  planning: 'Planejando',
  awaiting_approval: 'Aguardando aprovação',
  executing: 'Executando',
  reviewing: 'Revisando',
  completed: 'Concluída',
  rejected: 'Rejeitada',
  cancelled: 'Cancelada',
  failed: 'Falhou',
};

export const ROLE_LABEL: Record<AgentRole, string> = {
  planner: 'Planner',
  builder: 'Builder',
  reviewer: 'Reviewer',
};

export const ROLE_DESCRIPTION: Record<AgentRole, string> = {
  planner: 'Divide a solicitação em tarefas.',
  builder: 'Propõe alterações (diffs).',
  reviewer: 'Revisa as alterações propostas.',
};
