import type { AgentProfile } from '../domain/agents.ts';
import type { AgentProvider, ProviderResult } from '../domain/provider.ts';
import type { Plan, PlanTask, ProposedChange, Review, Usage } from '../domain/types.ts';

export interface MockProviderOptions {
  /** Artificial latency per call, to exercise loading and cancel states in the UI. */
  latencyMs?: number;
  /** Makes the given step throw, to exercise error handling. */
  failOn?: 'plan' | 'build' | 'review' | 'chat';
}

const MAX_TASKS = 5;

/** Rough, clearly synthetic token estimate (~4 characters per token). */
function syntheticUsage(input: string, output: string): Usage {
  return {
    inputTokens: Math.ceil(input.length / 4),
    outputTokens: Math.ceil(output.length / 4),
    synthetic: true,
  };
}

function abortError(): Error {
  const err = new Error('A operação foi cancelada.');
  err.name = 'AbortError';
  return err;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(abortError());
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function slug(text: string): string {
  const s = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
  return s || 'tarefa';
}

export function splitIntoTasks(request: string): PlanTask[] {
  const parts = request
    .split(/\n|(?<=[.;!?])\s+/)
    .map((p) => p.replace(/^[-*\d.)\s]+/, '').trim())
    .filter((p) => p.length > 0)
    .slice(0, MAX_TASKS);
  return parts.map((title, i) => ({
    id: `task-${i + 1}`,
    title: title.length > 80 ? `${title.slice(0, 80)}…` : title,
    detail: `Etapa ${i + 1} gerada pelo provedor mock a partir da solicitação.`,
  }));
}

const MOCK_REPLIES: Record<AgentProfile['id'], string> = {
  orchestra:
    'Sou o Orchestra, o maestro. Quando você abrir uma sessão, eu chamo o Planner, espero a sua aprovação e só então passo a vez ao Builder e ao Reviewer.',
  planner:
    'Sou o Planner. Me conte o objetivo e eu devolvo uma lista curta de etapas verificáveis.',
  builder:
    'Sou o Builder. Eu proponho alterações em forma de diff. Aplicar no disco é sempre decisão sua.',
  reviewer:
    'Sou o Reviewer. Eu confiro as alterações propostas e aponto riscos, casos de borda e testes que faltam.',
};

/** Canned, clearly-labelled reply used by the offline mock. */
export function mockReply(agent: AgentProfile, lastUserMessage: string): string {
  const quote = lastUserMessage.trim().slice(0, 120);
  return [
    MOCK_REPLIES[agent.id],
    '',
    `(Resposta do modo demonstração, sem modelo de IA. Você disse: "${quote}". Configure um provedor real em Configurações para respostas de verdade.)`,
  ].join('\n');
}

function changeFor(task: PlanTask, index: number): ProposedChange {
  const path = `notes/${String(index + 1).padStart(2, '0')}-${slug(task.title)}.md`;
  const diff = [
    '--- /dev/null',
    `+++ b/${path}`,
    '@@ -0,0 +1,3 @@',
    `+# ${task.title}`,
    '+',
    '+Conteúdo de exemplo gerado pelo provedor mock (não aplicado ao disco).',
  ].join('\n');
  return { path, kind: 'create', diff };
}

/**
 * Deterministic, fully offline provider. It never touches the network or the
 * file system; it exists so the whole flow can be exercised without API keys.
 */
export function createMockProvider(options: MockProviderOptions = {}): AgentProvider {
  const latency = options.latencyMs ?? 0;

  async function step<T>(
    name: 'plan' | 'build' | 'review' | 'chat',
    signal: AbortSignal | undefined,
    produce: () => { output: T; input: string; text: string },
  ): Promise<ProviderResult<T>> {
    await delay(latency, signal);
    if (options.failOn === name) throw new Error(`Falha simulada do provedor mock em "${name}".`);
    const { output, input, text } = produce();
    return { output, usage: syntheticUsage(input, text) };
  }

  return {
    id: 'mock',
    label: 'Mock (offline)',
    offline: true,
    plan: (request, signal) =>
      step<Plan>('plan', signal, () => {
        const plan: Plan = {
          summary: 'Plano mock gerado a partir da solicitação',
          tasks: splitIntoTasks(request),
        };
        return { output: plan, input: request, text: JSON.stringify(plan) };
      }),
    build: (plan, signal) =>
      step<ProposedChange[]>('build', signal, () => {
        const changes = plan.tasks.map(changeFor);
        return { output: changes, input: JSON.stringify(plan), text: JSON.stringify(changes) };
      }),
    review: (changes, signal) =>
      step<Review>('review', signal, () => {
        const review: Review =
          changes.length > 0
            ? {
                verdict: 'approve',
                comments: [`${changes.length} alteração(ões) conferida(s) pelo revisor mock.`],
              }
            : { verdict: 'request_changes', comments: ['Nenhuma alteração para revisar.'] };
        return { output: review, input: JSON.stringify(changes), text: JSON.stringify(review) };
      }),
    chat: (agent, history, signal) =>
      step<string>('chat', signal, () => {
        const last = [...history].reverse().find((m) => m.from === 'user')?.content ?? '';
        const reply = mockReply(agent, last);
        const input = history.map((m) => m.content).join('\n');
        return { output: reply, input, text: reply };
      }),
  };
}
