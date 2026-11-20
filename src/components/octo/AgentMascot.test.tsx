import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AgentMascot } from './AgentMascot.tsx';
import { AGENT_MOODS } from './mood.ts';

describe('AgentMascot', () => {
  it('nomeia o agente e o humor para leitor de tela', () => {
    const html = renderToStaticMarkup(<AgentMascot agent="builder" hue="#ffb547" mood="working" />);
    expect(html).toContain('aria-label="Builder, trabalhando"');
    expect(html).toContain('--agm-hue:#ffb547');
  });

  it('cada agente tem o seu acessório', () => {
    expect(renderToStaticMarkup(<AgentMascot agent="planner" hue="#4fb6ff" />)).toContain(
      'agm-board',
    );
    expect(renderToStaticMarkup(<AgentMascot agent="builder" hue="#ffb547" />)).toContain(
      'agm-hat',
    );
    expect(renderToStaticMarkup(<AgentMascot agent="reviewer" hue="#5fd08f" />)).toContain(
      'agm-lens',
    );
  });

  it('marca humor e movimento nas classes e pode ser decorativo', () => {
    for (const mood of AGENT_MOODS) {
      expect(
        renderToStaticMarkup(<AgentMascot agent="planner" hue="#4fb6ff" mood={mood} />),
      ).toContain(`agm--${mood}`);
    }
    const deco = renderToStaticMarkup(<AgentMascot agent="reviewer" hue="#5fd08f" label={null} />);
    expect(deco).toContain('aria-hidden="true"');
    expect(deco).toContain('agm--live');
  });
});
