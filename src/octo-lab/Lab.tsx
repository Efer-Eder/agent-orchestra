import { useEffect, useState } from 'react';
import { AGENTS } from '../domain/agents.ts';
import {
  AGENT_MOODS,
  AgentMascot,
  OCTO_MOODS,
  OCTO_MOOD_LABEL,
  OctoMascot,
  type WorkerId,
} from '../components/octo/index.ts';

const WORKERS: WorkerId[] = ['planner', 'builder', 'reviewer'];
const AGENT_MOOD_LABEL = { idle: 'aguardando', working: 'trabalhando', done: 'concluiu' } as const;

/** Laboratório do Octo: o mascote nos lugares onde ele vai morar no app. */
export function Lab() {
  const [dark, setDark] = useState(
    () => new URLSearchParams(location.search).get('theme') === 'dark',
  );
  const [animated, setAnimated] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-app text-ink">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12.5px] text-ink-3">Agent Orchestra · laboratório</p>
            <h1 className="text-[28px] font-semibold">Octo</h1>
            <p className="mt-1 max-w-xl text-[14px] text-ink-2">
              O Clássico, refinado: oito tentáculos (dois atrás, num tom mais escuro), cor de
              destaque do tema e sete humores que acompanham o que os agentes estão fazendo.
            </p>
          </div>
          <div className="flex gap-2">
            <Toggle on={dark} onClick={() => setDark((v) => !v)}>
              Tema escuro
            </Toggle>
            <Toggle on={animated} onClick={() => setAnimated((v) => !v)}>
              Animado
            </Toggle>
          </div>
        </header>

        <section className="mt-8 flex justify-center rounded-xl border border-line bg-surface py-10">
          <OctoMascot size={240} animated={animated} motion="always" />
        </section>

        <h2 className="mt-10 text-[15px] font-semibold">Humores</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {OCTO_MOODS.map((m) => (
            <figure
              key={m}
              className="flex flex-col items-center gap-1 rounded-xl border border-line bg-surface p-3"
            >
              <OctoMascot size={110} mood={m} animated={animated} motion="always" />
              <figcaption className="text-center text-[12.5px]">
                <span className="block font-medium">{m}</span>
                <span className="block text-ink-3">{OCTO_MOOD_LABEL[m]}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <h2 className="mt-10 text-[15px] font-semibold">Os agentes que ele coordena</h2>
        <p className="mt-1 text-[13.5px] text-ink-2">
          Mais simples que o Octo: corpo redondo na cor do agente, um acessório e três humores.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {WORKERS.map((id) => (
            <article key={id} className="rounded-xl border border-line bg-surface p-4">
              <h3 className="text-[14px] font-semibold">{AGENTS[id].name}</h3>
              <p className="text-[12.5px] text-ink-3">{AGENTS[id].tagline}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {AGENT_MOODS.map((m) => (
                  <figure
                    key={m}
                    className="flex flex-col items-center gap-1 rounded-lg bg-app py-2"
                  >
                    <AgentMascot
                      agent={id}
                      hue={AGENTS[id].hue}
                      size={84}
                      mood={m}
                      animated={animated}
                      motion="always"
                    />
                    <figcaption className="text-[12px] text-ink-3">
                      {AGENT_MOOD_LABEL[m]}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </article>
          ))}
        </div>

        <h2 className="mt-10 text-[15px] font-semibold">No app</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {/* Card de agente, no estilo "companions" do DESIGN.md */}
          <article className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex justify-center bg-accent-soft py-6">
              <OctoMascot size={120} animated={animated} motion="always" label={null} />
            </div>
            <div className="p-4">
              <h3 className="text-[15px] font-semibold">Orchestra</h3>
              <p className="mt-0.5 text-[13.5px] text-ink-2">O maestro que conduz os agentes.</p>
              <button
                type="button"
                className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-[13.5px] font-medium text-accent-ink hover:bg-accent-hover"
              >
                Conversar
              </button>
            </div>
          </article>

          {/* Turno de agente no chat */}
          <article className="rounded-xl border border-line bg-surface p-4">
            <div className="flex gap-3">
              <span className="grid size-[34px] flex-none place-items-center rounded-full bg-accent-soft">
                <OctoMascot size={30} animated={animated} motion="always" label={null} />
              </span>
              <div>
                <p className="text-[13.5px] font-medium">
                  Orchestra <span className="font-normal text-ink-3">· agora</span>
                </p>
                <p className="mt-1 text-[14px] text-ink-2">
                  Vou pedir ao Planner para dividir a tarefa em etapas. Nada roda sem a sua
                  aprovação.
                </p>
              </div>
            </div>
          </article>

          {/* Estado vazio */}
          <article className="flex flex-col items-center rounded-xl border border-line bg-surface p-6 text-center">
            <OctoMascot size={96} animated={animated} motion="always" label={null} />
            <h3 className="mt-2 text-[15px] font-semibold">Nenhuma sessão ainda</h3>
            <p className="mt-1 text-[13.5px] text-ink-2">
              Conte o que você quer construir e o Octo chama os agentes.
            </p>
            <button
              type="button"
              className="mt-3 rounded-lg border border-line px-3 py-1.5 text-[13.5px] hover:bg-surface-2"
            >
              Nova sessão
            </button>
          </article>
        </div>

        <h2 className="mt-10 text-[15px] font-semibold">Tamanhos</h2>
        <div className="mt-3 flex flex-wrap items-end gap-8 rounded-xl border border-line bg-surface p-6">
          {[16, 24, 32, 48, 72].map((n) => (
            <div key={n} className="flex flex-col items-center gap-2">
              <OctoMascot size={n} animated={animated} motion="always" />
              <span className="text-[12px] text-ink-3">{n} px</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-[13.5px] ${on ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-ink-2 hover:bg-surface-2'}`}
    >
      {children}
    </button>
  );
}
