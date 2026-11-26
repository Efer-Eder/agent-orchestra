import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { agentProfile, type AgentId } from '../domain/agents.ts';
import type { AgentProvider } from '../domain/provider.ts';
import type { ChatMessage, Session } from '../domain/types.ts';
import { defaultIdFactory } from '../domain/ids.ts';
import type { Locale } from '../domain/locale.ts';
import {
  approveFinal,
  approvePlan,
  cancelSession,
  createProject,
  createSession,
  recordApply,
  rejectPlan,
  MAX_REQUEST_LENGTH,
  runExecution,
  runPlanning,
  runReview,
  WorkflowError,
} from '../domain/workflow.ts';
import type { Messages } from '../i18n/messages.ts';
import { createMockProvider } from '../providers/mock.ts';
import { createOpenAICompatibleProvider, isLocalUrl } from '../providers/openai-compatible.ts';
import { createTauriTransport } from '../providers/tauri-transport.ts';
import { clearSavedState, loadState, saveState } from './persistence.ts';
import { createProjectFiles, ProjectFsError } from './projectFiles.ts';
import { accountFor, createSecretStore, isDesktop } from './secrets.ts';
import { appReducer, type View } from './state.ts';
import { useLiveText } from './useLiveText.ts';

type Step = (
  session: Session,
  signal: AbortSignal,
  onDelta: (text: string) => void,
) => Promise<Session>;

/** Where the API key lives right now. */
export interface VaultState {
  available: boolean;
  /** Saved in the Windows Credential Manager. */
  saved: boolean;
  /** Typed in this session and held by Rust. */
  session: boolean;
  busy: boolean;
  message: string | null;
}

export interface ProviderStatus {
  provider: AgentProvider;
  /** Why the real provider is not active, when the user selected it. */
  problem: string | null;
}

function errorText(e: unknown, t?: Messages): string {
  if (t && e instanceof ProjectFsError) return t.files.errors[e.code](e.message);
  if (t && e instanceof WorkflowError && e.reason) {
    if (e.reason === 'empty_project_name') return t.errors.emptyProjectName;
    if (e.reason === 'empty_request') return t.errors.emptyRequest;
    if (e.reason === 'request_too_long') return t.errors.requestTooLong(MAX_REQUEST_LENGTH);
  }
  return e instanceof Error ? e.message : String(e);
}

/**
 * Central hook: app state (persisted), the active provider, and the actions
 * that drive the approval-gated workflow and the agent chats.
 */
export function useOrchestra(locale: Locale, t: Messages) {
  const [state, dispatch] = useReducer(appReducer, undefined, loadState);
  // Browser: the key lives only here, in memory. Desktop: this is only the draft
  // typed in Settings; "Use key" hands it to Rust and clears it.
  const [apiKey, setApiKey] = useState('');
  const [busySessions, setBusySessions] = useState<ReadonlySet<string>>(new Set());
  const [busyAgents, setBusyAgents] = useState<ReadonlySet<AgentId>>(new Set());
  const controllers = useRef(new Map<string, AbortController>());
  const secretStore = useMemo(() => createSecretStore(), []);
  const projectFiles = useMemo(() => createProjectFiles(), []);
  const desktop = useMemo(() => isDesktop(), []);
  const [vault, setVault] = useState<VaultState>({
    available: desktop,
    saved: false,
    session: false,
    busy: false,
    message: null,
  });
  const live = useLiveText();

  // Desktop only: ask Rust whether a key exists for this provider (it never
  // sends the key back).
  const account = state.settings.kind === 'openai' ? accountFor(state.settings.baseUrl) : null;
  const refreshKeyStatus = useCallback(async () => {
    if (!desktop || !account) return;
    try {
      const status = await secretStore.status(account);
      setVault((v) => ({ ...v, saved: status.vault, session: status.session, message: null }));
    } catch (e) {
      setVault((v) => ({ ...v, saved: false, message: errorText(e) }));
    }
  }, [desktop, account, secretStore]);
  useEffect(() => {
    void refreshKeyStatus();
  }, [refreshKeyStatus]);

  useEffect(() => {
    const t = setTimeout(() => saveState(state), 250);
    return () => clearTimeout(t);
  }, [state]);

  const mock = useMemo(() => createMockProvider({ latencyMs: 650, locale }), [locale]);

  const providerStatus = useMemo<ProviderStatus>(() => {
    const s = state.settings;
    if (s.kind === 'mock') return { provider: mock, problem: null };
    // Local servers (Ollama, LM Studio) usually need no key.
    const hasKey = desktop ? vault.session || vault.saved : Boolean(apiKey.trim());
    if (!hasKey && !isLocalUrl(s.baseUrl)) {
      return { provider: mock, problem: t.settings.needKey };
    }
    try {
      return {
        provider: createOpenAICompatibleProvider({
          baseUrl: s.baseUrl,
          model: s.model,
          agentModels: s.agentModels,
          locale,
          // Desktop: Rust makes the call with the key it holds.
          ...(desktop
            ? { transport: createTauriTransport({ baseUrl: s.baseUrl, locale }) }
            : { apiKey }),
        }),
        problem: null,
      };
    } catch (e) {
      return { provider: mock, problem: errorText(e) };
    }
  }, [state.settings, apiKey, mock, locale, t, desktop, vault.session, vault.saved]);
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
      const onDelta = (text: string) => live.append(start.id, text);
      try {
        for (const step of steps) {
          const before = current.status;
          live.clear(start.id);
          current = await step(current, ctrl.signal, onDelta);
          save(current);
          if (current.status === before || ['failed', 'cancelled'].includes(current.status)) break;
        }
      } finally {
        controllers.current.delete(start.id);
        live.clear(start.id);
        setBusy(start.id, false);
      }
    },
    [save, setBusy, live],
  );

  const setView = useCallback((view: View) => dispatch({ type: 'setView', view }), []);

  /**
   * On desktop, a folder makes the project "authorized": Rust validates it and
   * returns the canonical path, which becomes the only place files are read from.
   */
  const addProject = useCallback(
    async (name: string, root: string): Promise<string | null> => {
      try {
        const folder =
          projectFiles.available && root.trim() ? await projectFiles.checkRoot(root) : root;
        dispatch({ type: 'addProject', project: createProject(name, folder) });
        return null;
      } catch (e) {
        return errorText(e, t);
      }
    },
    [t, projectFiles],
  );

  const projectRoot = useCallback(
    (projectId: string): string | null => {
      if (!projectFiles.available) return null;
      const root = state.projects.find((p) => p.id === projectId)?.rootLabel.trim();
      return root ? root : null;
    },
    [state.projects, projectFiles],
  );

  /** Rust errors become messages in the user's language before reaching the session. */
  const localized = useCallback(
    async <T>(work: () => Promise<T>): Promise<T> => {
      try {
        return await work();
      } catch (e) {
        throw new Error(errorText(e, t), { cause: e });
      }
    },
    [t],
  );

  const startSession = useCallback(
    (request: string): string | null => {
      const project = state.projects.find((p) => p.id === state.activeProjectId);
      if (!project) return t.errors.selectProject;
      let draft: Session;
      try {
        draft = createSession(project, request);
      } catch (e) {
        return errorText(e, t);
      }
      save(draft);
      setView({ name: 'session', id: draft.id });
      const root = projectRoot(project.id);
      const loadTree = root
        ? () => localized(async () => (await projectFiles.list(root)).files)
        : undefined;
      void runSteps(draft, [
        (s, signal, onDelta) =>
          runPlanning(s, provider, { signal, onDelta, ...(loadTree ? { loadTree } : {}) }),
      ]);
      return null;
    },
    [
      state.projects,
      state.activeProjectId,
      save,
      setView,
      runSteps,
      provider,
      t,
      projectRoot,
      projectFiles,
      localized,
    ],
  );

  const approve = useCallback(
    (session: Session) => {
      const approved = approvePlan(session);
      save(approved);
      const root = projectRoot(session.projectId);
      // Only metadata comes back: Rust reads the contents again when it builds
      // the Builder's prompt, so they never pass through the UI.
      const loadFiles = root
        ? (paths: string[]) => localized(() => projectFiles.inspect(root, paths))
        : undefined;
      void runSteps(approved, [
        (s, signal, onDelta) =>
          runExecution(s, provider, {
            signal,
            onDelta,
            ...(loadFiles && root ? { loadFiles, projectRoot: root } : {}),
          }),
        (s, signal, onDelta) => runReview(s, provider, { signal, onDelta }),
      ]);
    },
    [save, runSteps, provider, projectRoot, projectFiles, localized],
  );

  const acceptFinal = useCallback((session: Session) => save(approveFinal(session)), [save]);

  /** Writes the ticked changes to disk (desktop, authorized folder only). */
  const applyChanges = useCallback(
    async (session: Session, paths: string[]): Promise<string | null> => {
      const root = projectRoot(session.projectId);
      if (!root) return t.apply.noFolder;
      const chosen = (session.changes ?? []).filter((c) => paths.includes(c.path));
      if (!chosen.length) return null;
      try {
        const results = await projectFiles.apply(root, chosen);
        save(recordApply(session, results));
        return null;
      } catch (e) {
        return errorText(e, t);
      }
    },
    [projectRoot, projectFiles, save, t],
  );

  const reject = useCallback(
    (session: Session, reason: string) => save(rejectPlan(session, reason)),
    [save],
  );

  /** Rejects the current plan with the user's note and starts a revised session. */
  const requestAdjustment = useCallback(
    (session: Session, note: string): string | null => {
      const trimmed = note.trim();
      if (!trimmed) return t.errors.describeAdjust;
      save(rejectPlan(session, t.session.adjustReason(trimmed)));
      return startSession(`${session.request}\n\n${t.session.adjustRequest(trimmed)}`);
    },
    [save, startSession, t],
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
      const liveId = `chat:${agentId}`;
      live.clear(liveId);
      try {
        const { output, usage } = await provider.chat(
          agentProfile(agentId, locale),
          history,
          ctrl.signal,
          { onDelta: (text) => live.append(liveId, text) },
        );
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
            content: aborted ? t.agents.replyCancelled : errorText(e, t),
            at: now(),
            error: true,
          },
        });
      } finally {
        controllers.current.delete(`chat:${agentId}`);
        live.clear(liveId);
        setBusyAgents((prev) => {
          const next = new Set(prev);
          next.delete(agentId);
          return next;
        });
      }
    },
    [provider, state.chats, locale, t, live],
  );

  const stopChat = useCallback((agentId: AgentId) => {
    controllers.current.get(`chat:${agentId}`)?.abort();
  }, []);

  /** Desktop: hands the typed key to Rust and forgets it on this side. */
  const applyKey = useCallback(async () => {
    if (!desktop || !account || !apiKey.trim()) return;
    setVault((v) => ({ ...v, busy: true, message: null }));
    try {
      await secretStore.use(account, apiKey);
      setApiKey('');
      await refreshKeyStatus();
      setVault((v) => ({ ...v, busy: false }));
    } catch (e) {
      setVault((v) => ({ ...v, busy: false, message: errorText(e, t) }));
    }
  }, [desktop, account, apiKey, secretStore, refreshKeyStatus, t]);

  const saveKeyToVault = useCallback(async () => {
    if (!account) return;
    setVault((v) => ({ ...v, busy: true, message: null }));
    try {
      // A key still in the field goes to Rust first; Rust copies it to Windows.
      if (apiKey.trim()) {
        await secretStore.use(account, apiKey);
        setApiKey('');
      }
      await secretStore.save(account);
      await refreshKeyStatus();
      setVault((v) => ({ ...v, busy: false }));
    } catch (e) {
      setVault((v) => ({ ...v, busy: false, message: errorText(e, t) }));
    }
  }, [account, apiKey, secretStore, refreshKeyStatus, t]);

  const removeKeyFromVault = useCallback(async () => {
    if (!account) return;
    setVault((v) => ({ ...v, busy: true, message: null }));
    try {
      await secretStore.remove(account);
      setApiKey('');
      await refreshKeyStatus();
      setVault((v) => ({ ...v, busy: false }));
    } catch (e) {
      setVault((v) => ({ ...v, busy: false, message: errorText(e) }));
    }
  }, [account, secretStore, refreshKeyStatus]);

  /** Lists the provider's models with the current settings (through Rust on desktop). */
  const testConnection = useCallback(
    async (signal?: AbortSignal): Promise<string[]> => {
      const s = state.settings;
      if (desktop && apiKey.trim() && account) {
        await secretStore.use(account, apiKey);
        setApiKey('');
        await refreshKeyStatus();
      }
      const tester = createOpenAICompatibleProvider({
        baseUrl: s.baseUrl,
        model: s.model || 'test',
        timeoutMs: 15_000,
        locale,
        ...(desktop
          ? { transport: createTauriTransport({ baseUrl: s.baseUrl, timeoutMs: 15_000, locale }) }
          : { apiKey }),
      });
      return tester.testConnection(signal);
    },
    [state.settings, desktop, apiKey, account, secretStore, refreshKeyStatus, locale],
  );

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
    acceptFinal,
    applyChanges,
    reject,
    requestAdjustment,
    cancel,
    deleteSession,
    sendChat,
    stopChat,
    resetAll,
    vault,
    applyKey,
    testConnection,
    liveText: live.texts,
    saveKeyToVault,
    removeKeyFromVault,
    filesAvailable: projectFiles.available,
  };
}

export type Orchestra = ReturnType<typeof useOrchestra>;
