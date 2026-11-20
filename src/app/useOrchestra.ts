import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { AGENTS, type AgentId } from '../domain/agents.ts';
import type { AgentProvider } from '../domain/provider.ts';
import type { ChatMessage, Session } from '../domain/types.ts';
import { defaultIdFactory } from '../domain/ids.ts';
import {
  approvePlan,
  cancelSession,
  createProject,
  createSession,
  rejectPlan,
  runExecution,
  runPlanning,
  runReview,
} from '../domain/workflow.ts';
import { createMockProvider } from '../providers/mock.ts';
import { createOpenAICompatibleProvider } from '../providers/openai-compatible.ts';
import { clearSavedState, loadState, saveState } from './persistence.ts';
import { accountFor, createSecretStore, isDesktop } from './secrets.ts';
import { appReducer, type View } from './state.ts';

type Step = (session: Session, signal: AbortSignal) => Promise<Session>;

/** Where the API key lives right now. */
export interface VaultState {
  available: boolean;
  saved: boolean;
  busy: boolean;
  message: string | null;
}

export interface ProviderStatus {
  provider: AgentProvider;
  /** Why the real provider is not active, when the user selected it. */
  problem: string | null;
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Central hook: app state (persisted), the active provider, and the actions
 * that drive the approval-gated workflow and the agent chats.
 */
export function useOrchestra() {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState);
  // API key lives only in memory: never persisted, gone when the app closes.
  const [apiKey, setApiKey] = useState('');
  const [busySessions, setBusySessions] = useState<ReadonlySet<string>>(new Set());
  const [busyAgents, setBusyAgents] = useState<ReadonlySet<AgentId>>(new Set());
  const controllers = useRef(new Map<string, AbortController>());
  const secretStore = useMemo(() => createSecretStore(), []);
  const desktop = useMemo(() => isDesktop(), []);
  const [vault, setVault] = useState<VaultState>({
    available: desktop,
    saved: false,
    busy: false,
    message: null,
  });
  const loadedAccount = useRef<string | null>(null);

  // Desktop only: load the key for the configured provider from the Windows
  // Credential Manager, once per provider address.
  const account = state.settings.kind === 'openai' ? accountFor(state.settings.baseUrl) : null;
  useEffect(() => {
    if (!desktop || !account || loadedAccount.current === account) return;
    loadedAccount.current = account;
    let alive = true;
    secretStore
      .load(account)
      .then((key) => {
        if (!alive) return;
        if (key) setApiKey(key);
        setVault((v) => ({ ...v, saved: Boolean(key), message: null }));
      })
      .catch((e: unknown) => {
        if (alive) setVault((v) => ({ ...v, saved: false, message: errorText(e) }));
      });
    return () => {
      alive = false;
    };
  }, [desktop, account, secretStore]);

  useEffect(() => {
    const t = setTimeout(() => saveState(state), 250);
    return () => clearTimeout(t);
  }, [state]);

  const mock = useMemo(() => createMockProvider({ latencyMs: 650 }), []);

  const providerStatus = useMemo<ProviderStatus>(() => {
    const s = state.settings;
    if (s.kind === 'mock') return { provider: mock, problem: null };
    if (!apiKey.trim()) {
      return { provider: mock, problem: 'Informe a chave de API para usar o provedor real.' };
    }
    try {
      return {
        provider: createOpenAICompatibleProvider({ baseUrl: s.baseUrl, apiKey, model: s.model }),
        problem: null,
      };
    } catch (e) {
      return { provider: mock, problem: errorText(e) };
    }
  }, [state.settings, apiKey, mock]);
  const provider = providerStatus.provider;

  const save = useCallback((s: Session) => dispatch({ type: 'upsertSession', session: s }), []);

  const setBusy = useCallback((id: string, on: boolean) => {
    setBusySessions((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const runSteps = useCallback(
    async (start: Session, steps: Step[]) => {
      const ctrl = new AbortController();
      controllers.current.set(start.id, ctrl);
      setBusy(start.id, true);
      let current = start;
      try {
        for (const step of steps) {
          const before = current.status;
          current = await step(current, ctrl.signal);
          save(current);
          if (current.status === before || ['failed', 'cancelled'].includes(current.status)) break;
        }
      } finally {
        controllers.current.delete(start.id);
        setBusy(start.id, false);
      }
    },
    [save, setBusy],
  );

  const setView = useCallback((view: View) => dispatch({ type: 'setView', view }), []);

  const addProject = useCallback((name: string, root: string): string | null => {
    try {
      dispatch({ type: 'addProject', project: createProject(name, root) });
      return null;
    } catch (e) {
      return errorText(e);
    }
  }, []);

  const startSession = useCallback(
    (request: string): string | null => {
      const project = state.projects.find((p) => p.id === state.activeProjectId);
      if (!project) return 'Crie ou selecione um projeto primeiro.';
      let draft: Session;
      try {
        draft = createSession(project, request);
      } catch (e) {
        return errorText(e);
      }
      save(draft);
      setView({ name: 'session', id: draft.id });
      void runSteps(draft, [(s, signal) => runPlanning(s, provider, { signal })]);
      return null;
    },
    [state.projects, state.activeProjectId, save, setView, runSteps, provider],
  );

  const approve = useCallback(
    (session: Session) => {
      const approved = approvePlan(session);
      save(approved);
      void runSteps(approved, [
        (s, signal) => runExecution(s, provider, { signal }),
        (s, signal) => runReview(s, provider, { signal }),
      ]);
    },
    [save, runSteps, provider],
  );

  const reject = useCallback(
    (session: Session, reason: string) => save(rejectPlan(session, reason)),
    [save],
  );

  /** Rejects the current plan with the user's note and starts a revised session. */
  const requestAdjustment = useCallback(
    (session: Session, note: string): string | null => {
      const trimmed = note.trim();
      if (!trimmed) return 'Descreva o ajuste.';
      save(rejectPlan(session, `pediu ajuste: ${trimmed}`));
      return startSession(`${session.request}\n\nAjuste pedido: ${trimmed}`);
    },
    [save, startSession],
  );

  const cancel = useCallback(
    (session: Session) => {
      const ctrl = controllers.current.get(session.id);
      if (ctrl) ctrl.abort();
      else save(cancelSession(session));
    },
    [save],
  );

  const deleteSession = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    dispatch({ type: 'deleteSession', id });
  }, []);

  const sendChat = useCallback(
    async (agentId: AgentId, text: string) => {
      const content = text.trim();
      if (!content) return;
      const now = () => new Date().toISOString();
      const userMsg: ChatMessage = { id: defaultIdFactory(), from: 'user', content, at: now() };
      dispatch({ type: 'appendChat', agentId, message: userMsg });
      const history = [...(state.chats[agentId] ?? []), userMsg];
      const ctrl = new AbortController();
      controllers.current.set(`chat:${agentId}`, ctrl);
      setBusyAgents((prev) => new Set(prev).add(agentId));
      try {
        const { output, usage } = await provider.chat(AGENTS[agentId], history, ctrl.signal);
        dispatch({
          type: 'appendChat',
          agentId,
          message: {
            id: defaultIdFactory(),
            from: 'agent',
            content: output,
            at: now(),
            ...(usage ? { usage } : {}),
          },
        });
      } catch (e) {
        const aborted = ctrl.signal.aborted;
        dispatch({
          type: 'appendChat',
          agentId,
          message: {
            id: defaultIdFactory(),
            from: 'agent',
            content: aborted ? 'Resposta cancelada.' : errorText(e),
            at: now(),
            error: true,
          },
        });
      } finally {
        controllers.current.delete(`chat:${agentId}`);
        setBusyAgents((prev) => {
          const next = new Set(prev);
          next.delete(agentId);
          return next;
        });
      }
    },
    [provider, state.chats],
  );

  const stopChat = useCallback((agentId: AgentId) => {
    controllers.current.get(`chat:${agentId}`)?.abort();
  }, []);

  const saveKeyToVault = useCallback(async () => {
    if (!account) return;
    setVault((v) => ({ ...v, busy: true, message: null }));
    try {
      await secretStore.save(account, apiKey);
      setVault((v) => ({ ...v, busy: false, saved: true }));
    } catch (e) {
      setVault((v) => ({ ...v, busy: false, message: errorText(e) }));
    }
  }, [account, apiKey, secretStore]);

  const removeKeyFromVault = useCallback(async () => {
    if (!account) return;
    setVault((v) => ({ ...v, busy: true, message: null }));
    try {
      await secretStore.remove(account);
      setApiKey('');
      setVault((v) => ({ ...v, busy: false, saved: false }));
    } catch (e) {
      setVault((v) => ({ ...v, busy: false, message: errorText(e) }));
    }
  }, [account, secretStore]);

  const resetAll = useCallback(() => {
    for (const c of controllers.current.values()) c.abort();
    clearSavedState();
    dispatch({ type: 'reset' });
  }, []);

  return {
    state,
    dispatch,
    apiKey,
    setApiKey,
    provider,
    providerProblem: providerStatus.problem,
    busySessions,
    busyAgents,
    setView,
    addProject,
    startSession,
    approve,
    reject,
    requestAdjustment,
    cancel,
    deleteSession,
    sendChat,
    stopChat,
    resetAll,
    vault,
    saveKeyToVault,
    removeKeyFromVault,
  };
}

export type Orchestra = ReturnType<typeof useOrchestra>;
