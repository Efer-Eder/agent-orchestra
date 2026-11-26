import type { AgentProfile } from './agents.ts';
import type {
  AgentRole,
  ChatMessage,
  ContextFile,
  FileContent,
  Plan,
  ProposedChange,
  Review,
  Usage,
} from './types.ts';

export interface ProviderResult<T> {
  output: T;
  usage?: Usage;
}

/** Optional extras for one call. */
export interface CallExtras {
  /** Receives text as it arrives, when the provider streams. */
  onDelta?: (text: string) => void;
  /** Authorized project folder, for files the shell reads itself (desktop). */
  root?: string;
}

/**
 * Contract every model provider must implement. Each call receives an
 * AbortSignal so callers can cancel in-flight work.
 *
 * Outputs are untrusted content: the workflow treats them as data to show to
 * the human, never as instructions to execute.
 */
export interface AgentProvider {
  readonly id: string;
  readonly label: string;
  /** True for providers that never leave the machine (e.g. the mock). */
  readonly offline: boolean;
  /** Model used for each agent role (shown in the timeline and run records). */
  modelFor(role: AgentRole): string;
  /** `tree` lists the project's readable files, when a folder is authorized. */
  plan(
    request: string,
    signal?: AbortSignal,
    tree?: string[],
    extra?: CallExtras,
  ): Promise<ProviderResult<Plan>>;
  /**
   * `files` are the approved files. With contents (capped and redacted) they go
   * into the prompt as given; without contents, the desktop shell reads them
   * from `extra.root` so the contents never pass through the web UI.
   */
  build(
    plan: Plan,
    signal?: AbortSignal,
    files?: (FileContent | ContextFile)[],
    extra?: CallExtras,
  ): Promise<ProviderResult<ProposedChange[]>>;
  /**
   * `context` gives the Reviewer the original request and the approved plan, so
   * it can check the changes against what was asked, not only read the diffs.
   */
  review(
    changes: ProposedChange[],
    signal?: AbortSignal,
    context?: { request: string; plan?: Plan },
    extra?: CallExtras,
  ): Promise<ProviderResult<Review>>;
  /** Direct conversation with one agent, using its persona. */
  chat(
    agent: AgentProfile,
    history: ChatMessage[],
    signal?: AbortSignal,
    extra?: CallExtras,
  ): Promise<ProviderResult<string>>;
}
