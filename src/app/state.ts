import type { Project, Session } from '../domain/types.ts';

/** In-memory UI state. Persistence (SQLite via Tauri) is a later milestone. */
export interface AppState {
  projects: Project[];
  sessions: Session[];
  activeProjectId: string | null;
  activeSessionId: string | null;
}

export type AppAction =
  | { type: 'addProject'; project: Project }
  | { type: 'selectProject'; id: string }
  | { type: 'upsertSession'; session: Session }
  | { type: 'selectSession'; id: string | null };

export const initialState: AppState = {
  projects: [],
  sessions: [],
  activeProjectId: null,
  activeSessionId: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'addProject':
      return {
        ...state,
        projects: [...state.projects, action.project],
        activeProjectId: action.project.id,
        activeSessionId: null,
      };
    case 'selectProject':
      if (!state.projects.some((p) => p.id === action.id)) return state;
      return { ...state, activeProjectId: action.id, activeSessionId: null };
    case 'upsertSession': {
      const exists = state.sessions.some((s) => s.id === action.session.id);
      return {
        ...state,
        sessions: exists
          ? state.sessions.map((s) => (s.id === action.session.id ? action.session : s))
          : [...state.sessions, action.session],
      };
    }
    case 'selectSession':
      return { ...state, activeSessionId: action.id };
  }
}
