import type { ChangeKind, Plan, ProposedChange, Review } from '../domain/types.ts';

/**
 * Model output is untrusted. These helpers turn text into typed data and reject
 * anything that does not match, instead of guessing.
 */

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

const MAX_TASKS = 8;
/** Same cap as the desktop shell (MAX_READ_FILES). */
export const MAX_CONTEXT_FILES = 12;
const MAX_CHANGES = 20;
const MAX_DIFF_LENGTH = 40_000;
const MAX_TEXT = 500;

/** Extracts the first JSON object from text, accepting ```json fences. */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new ParseError('A resposta do modelo não contém JSON.');
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    throw new ParseError('A resposta do modelo tem JSON inválido.');
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function text(v: unknown, field: string, max = MAX_TEXT): string {
  if (typeof v !== 'string' || !v.trim())
    throw new ParseError(`Campo "${field}" ausente ou vazio.`);
  const t = v.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export function parsePlan(raw: unknown): Plan {
  if (!isRecord(raw) || !Array.isArray(raw.tasks))
    throw new ParseError('Plano sem lista de tarefas.');
  if (raw.tasks.length === 0) throw new ParseError('O plano veio sem tarefas.');
  const tasks = raw.tasks.slice(0, MAX_TASKS).map((t, i) => {
    if (!isRecord(t)) throw new ParseError(`Tarefa ${i + 1} inválida.`);
    return {
      id: `task-${i + 1}`,
      title: text(t.title, 'title', 120),
      detail: typeof t.detail === 'string' ? t.detail.trim().slice(0, MAX_TEXT) : '',
    };
  });
  const files = Array.isArray(raw.files)
    ? [
        ...new Set(
          raw.files
            .filter((f): f is string => typeof f === 'string')
            .slice(0, MAX_CONTEXT_FILES)
            .flatMap((f) => {
              try {
                return [safeRelativePath(f)];
              } catch {
                return []; // unsafe paths are dropped, never read
              }
            }),
        ),
      ]
    : [];
  return {
    summary: text(raw.summary, 'summary', 200),
    tasks,
    ...(files.length ? { files } : {}),
  };
}

/**
 * Accepts only relative paths inside the project: no absolute paths, drive
 * letters, `..` segments, NUL bytes or home shortcuts. Returns a normalized
 * forward-slash path. Real enforcement on disk will also happen in Rust.
 */
export function safeRelativePath(input: string): string {
  const p = input.trim().replace(/\\/g, '/');
  if (!p || p.includes('\0')) throw new ParseError('Caminho vazio ou inválido.');
  if (p.startsWith('/') || p.startsWith('~') || /^[a-zA-Z]:/.test(p) || p.startsWith('//')) {
    throw new ParseError(`Caminho fora do projeto recusado: ${p.slice(0, 80)}`);
  }
  const parts = p.split('/').filter((s) => s !== '' && s !== '.');
  if (parts.length === 0 || parts.some((s) => s === '..')) {
    throw new ParseError(`Caminho fora do projeto recusado: ${p.slice(0, 80)}`);
  }
  return parts.join('/');
}

const KINDS: readonly ChangeKind[] = ['create', 'modify', 'delete'];

export function parseChanges(raw: unknown): ProposedChange[] {
  if (!isRecord(raw) || !Array.isArray(raw.changes)) {
    throw new ParseError('Resposta do Builder sem lista de alterações.');
  }
  return raw.changes.slice(0, MAX_CHANGES).map((c, i) => {
    if (!isRecord(c)) throw new ParseError(`Alteração ${i + 1} inválida.`);
    const kind = c.kind;
    if (typeof kind !== 'string' || !KINDS.includes(kind as ChangeKind)) {
      throw new ParseError(`Alteração ${i + 1} com tipo desconhecido.`);
    }
    const diff = typeof c.diff === 'string' ? c.diff : '';
    if (diff.length > MAX_DIFF_LENGTH) throw new ParseError(`Diff ${i + 1} grande demais.`);
    return { path: safeRelativePath(text(c.path, 'path', 300)), kind: kind as ChangeKind, diff };
  });
}

export function parseReview(raw: unknown): Review {
  if (!isRecord(raw)) throw new ParseError('Revisão inválida.');
  const verdict = raw.verdict;
  if (verdict !== 'approve' && verdict !== 'request_changes') {
    throw new ParseError('Revisão sem veredito válido.');
  }
  const comments = Array.isArray(raw.comments)
    ? raw.comments
        .filter((c): c is string => typeof c === 'string' && c.trim() !== '')
        .slice(0, 10)
        .map((c) => c.trim().slice(0, MAX_TEXT))
    : [];
  return { verdict, comments };
}

/** Counts added/removed lines in a unified diff (headers excluded). */
export function diffStats(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) added++;
    else if (line.startsWith('-')) removed++;
  }
  return { added, removed };
}
