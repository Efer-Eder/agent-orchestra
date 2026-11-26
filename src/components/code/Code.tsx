import { useEffect, useState } from 'react';
import { cn } from '../primitives.tsx';
import { splitFences } from './lang.ts';

type Highlight = (code: string, language: string | null) => string | null;

/**
 * highlight.js lives in its own chunk, loaded the first time some code is on
 * screen. Until then (and if it fails to load) the code shows as plain text.
 */
let loaded: Highlight | null = null;
let loading: Promise<Highlight> | null = null;

function loadHighlighter(): Promise<Highlight> {
  loading ??= import('./highlighter.ts').then((m) => (loaded = m.highlight));
  return loading;
}

function useHighlighter(enabled: boolean): Highlight | null {
  const [fn, setFn] = useState<Highlight | null>(() => loaded);
  useEffect(() => {
    if (!enabled || fn) return;
    let alive = true;
    loadHighlighter()
      .then((h) => alive && setFn(() => h))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [enabled, fn]);
  return fn;
}

/** A piece of code, highlighted when the language is known. */
export function CodeText({ code, language }: { code: string; language: string | null }) {
  const highlight = useHighlighter(Boolean(language));
  const html = highlight ? highlight(code, language) : null;
  // highlight.js escapes its input, so this HTML is safe even for model output.
  if (html === null) return <>{code}</>;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function CodeBlock({ code, language }: { code: string; language: string | null }) {
  return (
    <pre className="my-2 overflow-x-auto rounded-lg border border-line bg-code px-3 py-2.5 font-mono text-[12.5px] leading-[1.6] whitespace-pre text-ink">
      <code>
        <CodeText code={code} language={language} />
      </code>
    </pre>
  );
}

/** Chat text with highlighted code blocks; prose keeps its line breaks. */
export function MessageText({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('whitespace-pre-wrap', className)}>
      {splitFences(content).map((p, i) =>
        p.kind === 'text' ? (
          <span key={i}>{p.text}</span>
        ) : (
          <CodeBlock key={i} code={p.code} language={p.language} />
        ),
      )}
    </div>
  );
}
