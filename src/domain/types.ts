/**
 * Core domain types for Agent Orchestra.
 *
 * Everything here is plain data (serializable) so it can later be persisted
 * by the Rust/SQLite layer without changes. No I/O happens in this module.
 */

export type AgentRole = 'planner' | 'builder' | 'reviewer';

export const AGENT_ROLES: readonly AgentRole[] = ['planner', 'builder', 'reviewer'];

export interface Project {
  id: string;
  name: string;
  /**
   * Directory the user intends to authorize. In the browser-only foundation this
   * is just a label: nothing reads or writes the file system yet.
   */
  rootLabel: string;
  createdAt: string;
}

export type SessionStatus =
  | 'draft'
  | 'planning'
  | 'awaiting_approval'
  | 'executing'
  | 'reviewing'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'failed';

export interface PlanTask {
  id: string;
  title: string;
  detail: string;
}

export interface Plan {
  summary: string;
  tasks: PlanTask[];
  /**
   * Project files the Planner wants the Builder to read (relative paths).
   * Shown to the human before approval; read only after approval.
   */
  files?: string[];
}

/** A project file as read by the desktop shell (already size-capped and redacted). */
export interface FileContent {
  path: string;
  content: string;
  bytes: number;
  truncated: boolean;
  redactions: number;
  /** Why the file was not read: denied, outside, missing, binary, budget. */
  skipped: string | null;
}

/** What the Builder actually received, kept on the session (no contents). */
export type ContextFile = Omit<FileContent, 'content'>;

export type ChangeKind = 'create' | 'modify' | 'delete';

/**
 * A change *proposed* by the Builder. It is never applied by the domain layer:
 * applying changes to disk is a future, approval-gated responsibility of the
 * desktop shell.
 */
export interface ProposedChange {
  path: string;
  kind: ChangeKind;
  /** Unified diff text, for display only. */
  diff: string;
}

export type ReviewVerdict = 'approve' | 'request_changes';

export interface Review {
  verdict: ReviewVerdict;
  comments: string[];
}

/** Token usage as reported by a provider. The mock provider reports synthetic numbers. */
export interface Usage {
  inputTokens: number;
  outputTokens: number;
  /** True when the numbers are not from a real provider. */
  synthetic: boolean;
}

export type TimelineEventKind =
  'request' | 'plan' | 'approval' | 'rejection' | 'execution' | 'review' | 'cancelled' | 'error';

export interface TimelineEvent {
  id: string;
  at: string;
  kind: TimelineEventKind;
  role?: AgentRole;
  message: string;
  /** Free text attached to the event (e.g. the rejection reason). */
  detail?: string;
  /** Stable code the UI can translate (e.g. `interrupted`, `cancelled`). */
  code?: 'interrupted' | 'cancelled';
}

export interface Session {
  id: string;
  projectId: string;
  title: string;
  request: string;
  status: SessionStatus;
  plan?: Plan;
  changes?: ProposedChange[];
  review?: Review;
  /** Files read for the Builder, without their contents. */
  context?: ContextFile[];
  usage: Usage[];
  events: TimelineEvent[];
  error?: string;
}

/** A message in a direct chat with one agent (Agents section). */
export interface ChatMessage {
  id: string;
  from: 'user' | 'agent';
  content: string;
  at: string;
  usage?: Usage;
  error?: boolean;
}
