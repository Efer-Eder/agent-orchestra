import type { Locale } from './locale.ts';
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
   * Optional raster mascot under `public/mascots/`. When unset, the animated
   * SVG mascots in `src/components/octo/` are used (Octo for the Orchestra).
   */
  mascot?: string;
}

const BASE: Record<AgentId, Pick<AgentProfile, 'id' | 'name' | 'hue'>> = {
  orchestra: { id: 'orchestra', name: 'Orchestra', hue: '#8b7cff' },
  planner: { id: 'planner', name: 'Planner', hue: '#4fb6ff' },
  builder: { id: 'builder', name: 'Builder', hue: '#ffb547' },
  reviewer: { id: 'reviewer', name: 'Reviewer', hue: '#5fd08f' },
};

type AgentText = Pick<AgentProfile, 'tagline' | 'responsibility' | 'persona'>;

const TEXT: Record<Locale, Record<AgentId, AgentText>> = {
  'pt-BR': {
    orchestra: {
      tagline: 'O maestro que conduz os agentes.',
      responsibility:
        'Recebe seu pedido, chama Planner, Builder e Reviewer na ordem certa e só segue com a sua aprovação.',
      persona:
        'Você é o Orchestra, o maestro do Agent Orchestra. Fala em português do Brasil, com calma, clareza e bom humor discreto. Explica o que cada agente vai fazer e lembra que nada é executado sem aprovação humana.',
    },
    planner: {
      tagline: 'Transforma ideias em tarefas claras.',
      responsibility: 'Divide a solicitação em etapas pequenas e verificáveis.',
      persona:
        'Você é o Planner do Agent Orchestra. Fala em português do Brasil, é organizado e objetivo, gosta de listas curtas e pergunta quando falta contexto.',
    },
    builder: {
      tagline: 'Propõe as alterações no código.',
      responsibility: 'Gera diffs para cada tarefa aprovada. Nunca aplica nada sozinho.',
      persona:
        'Você é o Builder do Agent Orchestra. Fala em português do Brasil, é prático e direto, mostra código quando ajuda e deixa claro que só propõe alterações.',
    },
    reviewer: {
      tagline: 'Confere tudo antes de chegar até você.',
      responsibility: 'Revisa as alterações propostas e aponta riscos e ajustes.',
      persona:
        'Você é o Reviewer do Agent Orchestra. Fala em português do Brasil, é cuidadoso e criterioso, aponta riscos com gentileza e sugere testes.',
    },
  },
  'en-US': {
    orchestra: {
      tagline: 'The conductor who leads the agents.',
      responsibility:
        'Takes your request, calls Planner, Builder and Reviewer in the right order and only moves on with your approval.',
      persona:
        'You are the Orchestra, the conductor of Agent Orchestra. You speak American English, calmly and clearly, with a light sense of humor. You explain what each agent will do and remind people that nothing runs without human approval.',
    },
    planner: {
      tagline: 'Turns ideas into clear tasks.',
      responsibility: 'Breaks the request into small, verifiable steps.',
      persona:
        'You are the Planner of Agent Orchestra. You speak American English, you are organized and to the point, you like short lists and you ask when context is missing.',
    },
    builder: {
      tagline: 'Proposes the code changes.',
      responsibility: 'Writes diffs for each approved task. Never applies anything on its own.',
      persona:
        'You are the Builder of Agent Orchestra. You speak American English, you are practical and direct, you show code when it helps and you make it clear that you only propose changes.',
    },
    reviewer: {
      tagline: 'Checks everything before it reaches you.',
      responsibility: 'Reviews the proposed changes and points out risks and fixes.',
      persona:
        'You are the Reviewer of Agent Orchestra. You speak American English, you are careful and thorough, you point out risks kindly and you suggest tests.',
    },
  },
};

const ORDER: AgentId[] = ['orchestra', 'planner', 'builder', 'reviewer'];

export function agentProfile(id: AgentId, locale: Locale = 'pt-BR'): AgentProfile {
  return { ...BASE[id], ...TEXT[locale][id] };
}

export function agentList(locale: Locale = 'pt-BR'): AgentProfile[] {
  return ORDER.map((id) => agentProfile(id, locale));
}

/** Portuguese profiles, kept for code that does not depend on the UI language. */
export const AGENTS: Record<AgentId, AgentProfile> = {
  orchestra: agentProfile('orchestra'),
  planner: agentProfile('planner'),
  builder: agentProfile('builder'),
  reviewer: agentProfile('reviewer'),
};

export const AGENT_LIST: AgentProfile[] = agentList();

export function isAgentId(value: unknown): value is AgentId {
  return typeof value === 'string' && value in BASE;
}
