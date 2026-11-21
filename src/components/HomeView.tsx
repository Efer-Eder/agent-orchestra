import { FolderPlus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { isDesktop } from '../app/secrets.ts';
import { useIdle } from '../app/useIdle.ts';
import { agentProfile } from '../domain/agents.ts';
import type { Project } from '../domain/types.ts';
import { useI18n } from '../i18n/I18n.tsx';
import { Composer } from './Composer.tsx';
import { OctoMascot } from './octo/index.ts';
import { Button, Field, TextInput } from './primitives.tsx';

export function ProjectForm({
  onCreate,
  compact,
}: {
  onCreate: (name: string, root: string) => Promise<string | null>;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [root, setRoot] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const desktop = isDesktop();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await onCreate(name, root);
    setBusy(false);
    setError(err);
    if (!err) {
      setName('');
      setRoot('');
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-3" aria-label={t.projectForm.aria}>
      <div className={compact ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2'}>
        <Field label={t.projectForm.name}>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="meu-saas"
          />
        </Field>
        <Field
          label={t.projectForm.folder}
          hint={desktop ? t.files.folderHintDesktop : t.files.folderHintWeb}
        >
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
        <Button type="submit" variant="primary" disabled={busy}>
          <FolderPlus size={15} />
          {t.projectForm.create}
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
  onCreateProject: (name: string, root: string) => Promise<string | null>;
  onStart: (text: string) => string | null;
}) {
  const { t, locale } = useI18n();
  const orchestra = agentProfile('orchestra', locale);
  // Octo naps after a few quiet minutes and wakes on the next input.
  const idle = useIdle(3 * 60_000);
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col justify-center px-6 py-10">
        <div className="mb-7 flex flex-col items-center text-center">
          {/* Without a project Octo waves hello; with one it waits for the task. */}
          <OctoMascot
            size={112}
            mood={!project ? 'waving' : idle ? 'sleeping' : 'idle'}
            label={t.home.octoLabel}
          />
          <h1 className="mt-4 text-[26px] font-semibold tracking-[-0.02em] text-ink">
            {project ? t.home.prompt : t.home.welcome}
          </h1>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-ink-3">
            {project ? t.home.withProject(project.name) : t.home.withoutProject}
          </p>
        </div>

        {project ? (
          <>
            <Composer
              agent={orchestra}
              autoFocus
              placeholder={t.home.placeholder}
              onSubmit={onStart}
              meta={
                <>
                  <span>{providerLabel}</span>
                  <span>{t.home.keys}</span>
                </>
              }
            />
            <div className="mt-5 grid gap-2">
              {t.home.suggestions.map((s) => (
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
