import { useEffect, useState } from 'react';

const EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'focus'] as const;

/** True after `ms` without any input, back to false on the next input. */
export function useIdle(ms: number): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer = setTimeout(() => setIdle(true), ms);
    const wake = () => {
      clearTimeout(timer);
      setIdle(false);
      timer = setTimeout(() => setIdle(true), ms);
    };
    for (const e of EVENTS) window.addEventListener(e, wake, { passive: true });
    return () => {
      clearTimeout(timer);
      for (const e of EVENTS) window.removeEventListener(e, wake);
    };
  }, [ms]);
  return idle;
}
