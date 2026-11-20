import { FolderPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { AGENTS } from '../domain/agents.ts';
import type { Project } from '../domain/types.ts';
import { Composer } from './Composer.tsx';
import { OctoMascot } from './octo/index.ts';
import { Button, Field, TextInput } from './primitives.tsx';

const SUGGESTIONS = [
  'Adicionar login com Google mantendo o login por senha. Cobrir com testes.',
  'Criar endpoint de exportação CSV dos pedidos com paginação.',
  'Revisar o tratamento de erros da API de pagamentos.',
];

export function ProjectForm({
  onCreate,
  compact,
}: {
  onCreate: (name: string, root: string) => string | null;
  compact?: boolean;
}) {
  const [name, setName] = useState('');
  const [root, setRoot] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = onCreate(name, root);
    setError(err);
    if (!err) {
      setName('');
      setRoot('');
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-3" aria-label="Novo projeto">
      <div className={compact ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2'}>
        <Field label="Nome do projeto">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="meu-saas"
          />
        </Field>
        <Field label="Pasta" hint="Por enquanto é só um rótulo: nada é lido do disco.">
          <TextInput
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            placeholder="C:\dev\meu-saas"
          />
        </Field>
      </div>
      {error && (
        <p role="alert" className="text-[12.5px] text-bad">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" variant="primary">
          <FolderPlus size={15} />
          Criar projeto
        </Button>
      </div>
    </form>
  );
}

export function HomeView({
  project,
  providerLabel,
  onCreateProject,
  onStart,
}: {
  project: Project | null;
  providerLabel: string;
  onCreateProject: (name: string, root: string) => string | null;
  onStart: (text: string) => string | null;
}) {
  const orchestra = AGENTS.orchestra;
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center px-6 py-10">
        <div className="mb-7 flex flex-col items-center text-center">
          {/* Sem projeto, o Octo acena dando as boas-vindas; com projeto, espera a tarefa. */}
          <OctoMascot
            size={112}
            mood={project ? 'idle' : 'waving'}
            label="Octo, o maestro do Agent Orchestra"
          />
          <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.02em] text-ink">
            {project ? 'O que vamos orquestrar hoje?' : 'Bem-vindo ao Agent Orchestra'}
          </h1>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-3">
            {project
              ? `Descreva a tarefa em ${project.name}. O Planner propõe um plano e nada segue sem a sua aprovação.`
              : 'Comece criando um projeto. Depois é só descrever o que você quer e acompanhar os agentes.'}
          </p>
        </div>

        {project ? (
          <>
            <Composer
              agent={orchestra}
              autoFocus
              placeholder="Descreva o que você quer construir…"
              onSubmit={onStart}
              meta={
                <>
                  <span>{providerLabel}</span>
                  <span>Enter envia · Shift+Enter quebra linha</span>
                </>
              }
            />
            <div className="mt-5 grid gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onStart(s)}
                  className="rounded-xl border border-line bg-surface/60 px-3.5 py-2.5 text-left text-[13px] text-ink-2 transition-colors hover:bg-surface hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-line bg-surface p-5">
            <ProjectForm onCreate={onCreateProject} />
          </div>
        )}
      </div>
    </div>
  );
}
