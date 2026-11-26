import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Text streaming in from the model, per session or chat. Deltas are batched
 * every ~80 ms so a fast stream does not re-render the screen per token.
 * Nothing here is persisted: the final answer is saved by the workflow.
 */
export function useLiveText() {
  const [texts, setTexts] = useState<Readonly<Record<string, string>>>({});
  const pending = useRef(new Map<string, string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    timer.current = null;
    if (!pending.current.size) return;
    const batch = new Map(pending.current);
    pending.current.clear();
    setTexts((prev) => {
      const next = { ...prev };
      for (const [id, text] of batch) next[id] = (next[id] ?? '') + text;
      return next;
    });
  }, []);

  const append = useCallback(
    (id: string, delta: string) => {
      pending.current.set(id, (pending.current.get(id) ?? '') + delta);
      timer.current ??= setTimeout(flush, 80);
    },
    [flush],
  );

  const clear = useCallback((id: string) => {
    pending.current.delete(id);
    setTexts((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useMemo(() => ({ texts, append, clear }), [texts, append, clear]);
}
