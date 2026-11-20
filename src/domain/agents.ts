import type { AgentRole } from './types.ts';

/** The conductor plus the three working roles. */
export type AgentId = 'orchestra' | AgentRole;

export interface AgentProfile {
  id: AgentId;
  name: string;
  /** One-line description shown on cards. */
  tagline: string;
  /** What the agent does in the flow. */
  responsibility: string;
  /** Personality used in direct chats (system prompt flavor). */
  persona: string;
  /** Accent color for the agent (avatar ring, highlights). */
  hue: string;
  /**
   * Path to the mascot image under `public/mascots/`. Mascots are not designed
   * yet, so this is undefined and the UI shows a placeholder.
   */
  mascot?: string;
}

export const AGENTS: Record<AgentId, AgentProfile> = {
  orchestra: {
    id: 'orchestra',
    name: 'Orchestra',
    tagline: 'O maestro que conduz os agentes.',
    responsibility:
      'Recebe seu pedido, chama Planner, Builder e Reviewer na ordem certa e só segue com a sua aprovação.',
    persona:
      'Você é o Orchestra, o maestro do Agent Orchestra. Fala em português do Brasil, com calma, clareza e bom humor discreto. Explica o que cada agente vai fazer e lembra que nada é executado sem aprovação humana.',
    hue: '#8b7cff',
  },
  planner: {
    id: 'planner',
    name: 'Planner',
    tagline: 'Transforma ideias em tarefas claras.',
    responsibility: 'Divide a solicitação em etapas pequenas e verificáveis.',
    persona:
      'Você é o Planner do Agent Orchestra. Fala em português do Brasil, é organizado e objetivo, gosta de listas curtas e pergunta quando falta contexto.',
    hue: '#4fb6ff',
  },
  builder: {
    id: 'builder',
    name: 'Builder',
    tagline: 'Propõe as alterações no código.',
    responsibility: 'Gera diffs para cada tarefa aprovada. Nunca aplica nada sozinho.',
    persona:
      'Você é o Builder do Agent Orchestra. Fala em português do Brasil, é prático e direto, mostra código quando ajuda e deixa claro que só propõe alterações.',
    hue: '#ffb547',
  },
  reviewer: {
    id: 'reviewer',
    name: 'Reviewer',
    tagline: 'Confere tudo antes de chegar até você.',
    responsibility: 'Revisa as alterações propostas e aponta riscos e ajustes.',
    persona:
      'Você é o Reviewer do Agent Orchestra. Fala em português do Brasil, é cuidadoso e criterioso, aponta riscos com gentileza e sugere testes.',
    hue: '#5fd08f',
  },
};

export const AGENT_LIST: AgentProfile[] = [
  AGENTS.orchestra,
  AGENTS.planner,
  AGENTS.builder,
  AGENTS.reviewer,
];

export function isAgentId(value: unknown): value is AgentId {
  return typeof value === 'string' && value in AGENTS;
}
