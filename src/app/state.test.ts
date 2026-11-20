import { describe, expect, it } from 'vitest';
import { sequentialIds } from '../domain/ids.ts';
import { createProject, createSession } from '../domain/workflow.ts';
import { appReducer, initialState } from './state.ts';

const deps = () => ({ ids: sequentialIds(), clock: () => new Date(0) });

describe('appReducer', () => {
  it('selects a newly added project', () => {
    const project = createProject('Demo', '', deps());
    const state = appReducer(initialState, { type: 'addProject', project });
    expect(state.activeProjectId).toBe(project.id);
    expect(state.projects).toHaveLength(1);
  });

  it('ignores selection of unknown projects', () => {
    expect(appReducer(initialState, { type: 'selectProject', id: 'nope' })).toBe(initialState);
  });

  it('inserts then replaces sessions by id', () => {
    const project = createProject('Demo', '', deps());
    const session = createSession(project, 'Algo', deps());
    let state = appReducer(initialState, { type: 'upsertSession', session });
    state = appReducer(state, {
      type: 'upsertSession',
      session: { ...session, status: 'planning' },
    });
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]?.status).toBe('planning');
  });
});
