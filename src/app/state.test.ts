import { describe, expect, it } from 'vitest';
import { sequentialIds } from '../domain/ids.ts';
import { createProject, createSession } from '../domain/workflow.ts';
import { deserialize, loadState, saveState, serialize, STORAGE_KEY } from './persistence.ts';
import { appReducer, initialState, type AppState } from './state.ts';

const deps = () => ({ ids: sequentialIds(), clock: () => new Date(0) });

function withSession(): AppState {
  const project = createProject('Demo', 'C:/demo', deps());
  const session = createSession(project, 'Algo', deps());
  let state = appReducer(initialState, { type: 'addProject', project });
  state = appReducer(state, { type: 'upsertSession', session });
  return state;
}

describe('appReducer', () => {
  it('selects a newly added project', () => {
    const project = createProject('Demo', '', deps());
    const state = appReducer(initialState, { type: 'addProject', project });
    expect(state.activeProjectId).toBe(project.id);
  });

  it('ignores selection of unknown projects', () => {
    expect(appReducer(initialState, { type: 'selectProject', id: 'nope' })).toBe(initialState);
  });

  it('inserts then replaces sessions by id', () => {
    let state = withSession();
    const session = state.sessions[0]!;
    state = appReducer(state, {
      type: 'upsertSession',
      session: { ...session, status: 'planning' },
    });
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]?.status).toBe('planning');
  });

  it('leaves the session view when the session is deleted', () => {
    let state = withSession();
    const id = state.sessions[0]!.id;
    state = appReducer(state, { type: 'setView', view: { name: 'session', id } });
    state = appReducer(state, { type: 'deleteSession', id });
    expect(state.sessions).toHaveLength(0);
    expect(state.view).toEqual({ name: 'home' });
  });

  it('appends and clears agent chats', () => {
    const msg = { id: 'm1', from: 'user' as const, content: 'oi', at: '' };
    let state = appReducer(initialState, { type: 'appendChat', agentId: 'planner', message: msg });
    expect(state.chats.planner).toEqual([msg]);
    state = appReducer(state, { type: 'clearChat', agentId: 'planner' });
    expect(state.chats.planner).toBeUndefined();
  });
});

describe('persistence', () => {
  it('round-trips projects, sessions, chats and settings', () => {
    let state = withSession();
    state = appReducer(state, {
      type: 'updateSettings',
      settings: { kind: 'openai', model: 'gpt-x' },
    });
    const restored = deserialize(serialize(state));
    expect(restored.projects).toEqual(state.projects);
    expect(restored.sessions).toEqual(state.sessions);
    expect(restored.settings).toEqual(state.settings);
    expect(restored.activeProjectId).toBe(state.activeProjectId);
  });

  it('keeps per-agent models and prices, dropping junk', () => {
    const pricing = {
      inputPerMillion: 2,
      outputPerMillion: 8,
      currency: 'USD',
      asOf: '2026-11-21',
    };
    const state = appReducer(initialState, {
      type: 'updateSettings',
      settings: { agentModels: { planner: ' big-model ', builder: '' }, pricing },
    });
    const restored = deserialize(serialize(state));
    expect(restored.settings.agentModels).toEqual({ planner: 'big-model' });
    expect(restored.settings.pricing).toEqual(pricing);

    const odd = deserialize(
      JSON.stringify({
        version: 1,
        settings: { agentModels: { hacker: 'x', planner: 42 }, pricing: { inputPerMillion: '1' } },
      }),
    );
    expect(odd.settings.agentModels).toEqual({});
    expect(odd.settings.pricing).toBeNull();
  });

  it('never writes an API key, even if one sneaks into settings', () => {
    const state = appReducer(initialState, {
      type: 'updateSettings',
      settings: { apiKey: 'sk-secret' } as never,
    });
    expect(serialize(state)).not.toContain('sk-secret');
  });

  it('marks sessions that were running as failed', () => {
    const state = withSession();
    const running = {
      ...state,
      sessions: [{ ...state.sessions[0]!, status: 'executing' as const }],
    };
    expect(deserialize(serialize(running)).sessions[0]?.status).toBe('failed');
  });

  it('ignores corrupt or foreign data', () => {
    expect(deserialize('{not json')).toBe(initialState);
    expect(deserialize(JSON.stringify({ version: 99 }))).toBe(initialState);
    const odd = deserialize(
      JSON.stringify({
        version: 1,
        projects: [{ id: 'p', name: 'P' }, 42],
        sessions: [{ id: 's', projectId: 'other', status: 'draft', events: [], usage: [] }],
        chats: { hacker: [], planner: [{ id: 'm', from: 'system', content: 'x' }] },
        settings: { kind: 'evil' },
      }),
    );
    expect(odd.projects).toHaveLength(1);
    expect(odd.sessions).toHaveLength(0);
    expect(odd.chats).toEqual({ planner: [] });
    expect(odd.settings.kind).toBe('mock');
  });

  it('survives unavailable storage', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(loadState(broken)).toBe(initialState);
    expect(saveState(initialState, broken)).toBe(false);
  });

  it('uses a versioned storage key', () => {
    const store = new Map<string, string>();
    saveState(withSession(), { setItem: (k, v) => store.set(k, v) });
    expect([...store.keys()]).toEqual([STORAGE_KEY]);
  });
});
