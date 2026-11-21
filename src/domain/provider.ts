import type { AgentProfile } from './agents.ts';
import type {
  AgentRole,
  ChatMessage,
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
  plan(request: string, signal?: AbortSignal, tree?: string[]): Promise<ProviderResult<Plan>>;
  /** `files` are the approved files' contents, already capped and redacted. */
  build(
    plan: Plan,
    signal?: AbortSignal,
    files?: FileContent[],
  ): Promise<ProviderResult<ProposedChange[]>>;
  /**
   * `context` gives the Reviewer the original request and the approved plan, so
   * it can check the changes against what was asked, not only read the diffs.
   */
  review(
    changes: ProposedChange[],
    signal?: AbortSignal,
    context?: { request: string; plan?: Plan },
  ): Promise<ProviderResult<Review>>;
  /** Direct conversation with one agent, using its persona. */
  chat(
    agent: AgentProfile,
    history: ChatMessage[],
    signal?: AbortSignal,
  ): Promise<ProviderResult<string>>;
}
