import type { AgentProfile } from './agents.ts';
import type { ChatMessage, Plan, ProposedChange, Review, Usage } from './types.ts';

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
  plan(request: string, signal?: AbortSignal): Promise<ProviderResult<Plan>>;
  build(plan: Plan, signal?: AbortSignal): Promise<ProviderResult<ProposedChange[]>>;
  review(changes: ProposedChange[], signal?: AbortSignal): Promise<ProviderResult<Review>>;
  /** Direct conversation with one agent, using its persona. */
  chat(
    agent: AgentProfile,
    history: ChatMessage[],
    signal?: AbortSignal,
  ): Promise<ProviderResult<string>>;
}
