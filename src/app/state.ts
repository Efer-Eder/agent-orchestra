import type { AgentId } from '../domain/agents.ts';
import type { ChatMessage, Project, Session } from '../domain/types.ts';

export type View =
  | { name: 'home' }
  | { name: 'session'; id: string }
  | { name: 'agents' }
  | { name: 'agent'; id: AgentId }
  | { name: 'projects' }
  | { name: 'settings' };

/** Provider settings that are safe to persist. The API key is never part of this. */
export interface ProviderSettings {
  kind: 'mock' | 'openai';
  baseUrl: string;
  model: string;
}

export interface AppState {
  projects: Project[];
  sessions: Session[];
  chats: Partial<Record<AgentId, ChatMessage[]>>;
  activeProjectId: string | null;
  view: View;
  settings: ProviderSettings;
}

export type AppAction =
  | { type: 'addProject'; project: Project }
  | { type: 'selectProject'; id: string }
  | { type: 'upsertSession'; session: Session }
  | { type: 'deleteSession'; id: string }
  | { type: 'setView'; view: View }
  | { type: 'appendChat'; agentId: AgentId; message: ChatMessage }
  | { type: 'clearChat'; agentId: AgentId }
  | { type: 'updateSettings'; settings: Partial<ProviderSettings> }
  | { type: 'reset' };

export const DEFAULT_SETTINGS: ProviderSettings = {
  kind: 'mock',
  baseUrl: 'https://api.openai.com/v1',
  model: '',
};

export const initialState: AppState = {
  projects: [],
  sessions: [],
  chats: {},
  activeProjectId: null,
  view: { name: 'home' },
  settings: DEFAULT_SETTINGS,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'addProject':
      return {
        ...state,
        projects: [...state.projects, action.project],
        activeProjectId: action.project.id,
      };
    case 'selectProject':
      if (!state.projects.some((p) => p.id === action.id)) return state;
      return { ...state, activeProjectId: action.id };
    case 'upsertSession': {
      const exists = state.sessions.some((s) => s.id === action.session.id);
      return {
        ...state,
        sessions: exists
          ? state.sessions.map((s) => (s.id === action.session.id ? action.session : s))
          : [...state.sessions, action.session],
      };
    }
    case 'deleteSession': {
      const viewing = state.view.name === 'session' && state.view.id === action.id;
      return {
        ...state,
        sessions: state.sessions.filter((s) => s.id !== action.id),
        view: viewing ? { name: 'home' } : state.view,
      };
    }
    case 'setView':
      return { ...state, view: action.view };
    case 'appendChat':
      return {
        ...state,
        chats: {
          ...state.chats,
          [action.agentId]: [...(state.chats[action.agentId] ?? []), action.message],
        },
      };
    case 'clearChat': {
      const chats = { ...state.chats };
      delete chats[action.agentId];
      return { ...state, chats };
    }
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'reset':
      return { ...initialState, view: { name: 'home' } };
  }
}

/** Date of the first event, used to group sessions in the sidebar. */
export function sessionStartedAt(session: Session): string {
  return session.events[0]?.at ?? new Date(0).toISOString();
}
