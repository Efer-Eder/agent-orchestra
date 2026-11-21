import { isAgentId, type AgentId } from '../domain/agents.ts';
import type { Pricing } from '../domain/cost.ts';
import {
  AGENT_ROLES,
  type AgentRole,
  type ChatMessage,
  type Project,
  type Session,
} from '../domain/types.ts';
import { recoverInterrupted } from '../domain/workflow.ts';
import { DEFAULT_SETTINGS, initialState, type AppState, type ProviderSettings } from './state.ts';

/**
 * Local persistence in the webview's localStorage (also used inside Tauri).
 * Only projects, sessions, chats and non-secret settings are saved: the API
 * key is never written. SQLite in the Rust shell is a later milestone.
 */

export const STORAGE_KEY = 'agent-orchestra.data.v1';
const VERSION = 1;

interface Snapshot {
  version: number;
  projects: Project[];
  sessions: Session[];
  chats: Partial<Record<AgentId, ChatMessage[]>>;
  activeProjectId: string | null;
  settings: ProviderSettings;
}

export function serialize(state: AppState): string {
  const snapshot: Snapshot = {
    version: VERSION,
    projects: state.projects,
    sessions: state.sessions,
    chats: state.chats,
    activeProjectId: state.activeProjectId,
    settings: {
      kind: state.settings.kind,
      baseUrl: state.settings.baseUrl,
      model: state.settings.model,
      agentModels: state.settings.agentModels,
      pricing: state.settings.pricing,
    },
  };
  return JSON.stringify(snapshot);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function readAgentModels(v: unknown): Partial<Record<AgentRole, string>> {
  const out: Partial<Record<AgentRole, string>> = {};
  if (!isRecord(v)) return out;
  for (const role of AGENT_ROLES) {
    const model = v[role];
    if (typeof model === 'string' && model.trim()) out[role] = model.trim().slice(0, 200);
  }
  return out;
}

function readPricing(v: unknown): Pricing | null {
  if (!isRecord(v)) return null;
  const { inputPerMillion, outputPerMillion, currency, asOf } = v;
  if (typeof inputPerMillion !== 'number' || typeof outputPerMillion !== 'number') return null;
  if (typeof currency !== 'string' || typeof asOf !== 'string') return null;
  return { inputPerMillion, outputPerMillion, currency, asOf };
}

function looksLikeProject(v: unknown): v is Project {
  return isRecord(v) && typeof v.id === 'string' && typeof v.name === 'string';
}

function looksLikeSession(v: unknown): v is Session {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    typeof v.projectId === 'string' &&
    typeof v.status === 'string' &&
    Array.isArray(v.events) &&
    Array.isArray(v.usage)
  );
}

function looksLikeMessage(v: unknown): v is ChatMessage {
  return (
    isRecord(v) &&
    typeof v.id === 'string' &&
    (v.from === 'user' || v.from === 'agent') &&
    typeof v.content === 'string'
  );
}

/** Parses saved data defensively; anything unrecognized is dropped. */
export function deserialize(text: string | null): AppState {
  if (!text) return initialState;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return initialState;
  }
  if (!isRecord(raw) || raw.version !== VERSION) return initialState;

  const projects = Array.isArray(raw.projects) ? raw.projects.filter(looksLikeProject) : [];
  const ids = new Set(projects.map((p) => p.id));
  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions
        .filter(looksLikeSession)
        .filter((s) => ids.has(s.projectId))
        .map((s) => recoverInterrupted(s))
    : [];

  const chats: Partial<Record<AgentId, ChatMessage[]>> = {};
  if (isRecord(raw.chats)) {
    for (const [key, list] of Object.entries(raw.chats)) {
      if (isAgentId(key) && Array.isArray(list)) chats[key] = list.filter(looksLikeMessage);
    }
  }

  const s = isRecord(raw.settings) ? raw.settings : {};
  const settings: ProviderSettings = {
    kind: s.kind === 'openai' ? 'openai' : 'mock',
    baseUrl: typeof s.baseUrl === 'string' ? s.baseUrl : DEFAULT_SETTINGS.baseUrl,
    model: typeof s.model === 'string' ? s.model : DEFAULT_SETTINGS.model,
    agentModels: readAgentModels(s.agentModels),
    pricing: readPricing(s.pricing),
  };

  const active = typeof raw.activeProjectId === 'string' ? raw.activeProjectId : null;
  return {
    projects,
    sessions,
    chats,
    activeProjectId: active && ids.has(active) ? active : (projects[0]?.id ?? null),
    view: { name: 'home' },
    settings,
  };
}

export function loadState(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): AppState {
  try {
    return deserialize(storage?.getItem(STORAGE_KEY) ?? null);
  } catch {
    return initialState;
  }
}

export function saveState(
  state: AppState,
  storage: Pick<Storage, 'setItem'> | undefined = safeStorage(),
): boolean {
  try {
    storage?.setItem(STORAGE_KEY, serialize(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedState(storage: Pick<Storage, 'removeItem'> | undefined = safeStorage()) {
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
