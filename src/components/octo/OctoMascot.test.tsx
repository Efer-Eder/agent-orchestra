import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OctoMascot } from './OctoMascot.tsx';
import { OCTO_MOODS, octoMoodFor } from './mood.ts';

describe('OctoMascot', () => {
  it('tem nome acessível com o humor e oito tentáculos', () => {
    const html = renderToStaticMarkup(<OctoMascot mood="thinking" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Octo, pensando"');
    expect(html.match(/class="octo-arm/g)).toHaveLength(8);
  });

  it('fica escondido do leitor de tela quando é decorativo', () => {
    const html = renderToStaticMarkup(<OctoMascot label={null} />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="img"');
  });

  it('marca o humor, o movimento e o tamanho de ícone nas classes', () => {
    for (const mood of OCTO_MOODS) {
      expect(renderToStaticMarkup(<OctoMascot mood={mood} />)).toContain(`octo--${mood}`);
    }
    expect(renderToStaticMarkup(<OctoMascot />)).toContain('octo--live');
    expect(renderToStaticMarkup(<OctoMascot animated={false} />)).not.toContain('octo--live');
    expect(renderToStaticMarkup(<OctoMascot motion="always" />)).toContain('octo--force');
    const small = renderToStaticMarkup(<OctoMascot size={24} />);
    expect(small).toContain('octo--small');
    expect(small).not.toContain('octo-thought');
  });
});

describe('octoMoodFor', () => {
  it('acompanha o que os agentes estão fazendo', () => {
    expect(octoMoodFor('planning', true)).toBe('thinking');
    expect(octoMoodFor('executing', true)).toBe('working');
    expect(octoMoodFor('reviewing', true)).toBe('working');
    expect(octoMoodFor('awaiting_approval', false)).toBe('idle');
    expect(octoMoodFor('completed', false)).toBe('happy');
    expect(octoMoodFor('failed', false)).toBe('worried');
    expect(octoMoodFor('cancelled', false)).toBe('sleeping');
    expect(octoMoodFor('rejected', false)).toBe('sleeping');
  });
});
