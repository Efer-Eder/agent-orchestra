// @vitest-environment jsdom
import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIdle } from './useIdle.ts';

afterEach(() => vi.useRealTimers());

describe('useIdle', () => {
  it('turns idle after the timeout and wakes on input', () => {
    vi.useFakeTimers();
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const seen: boolean[] = [];
    function Probe() {
      const idle = useIdle(1000);
      useEffect(() => {
        seen.push(idle);
      }, [idle]);
      return null;
    }
    const root = createRoot(document.createElement('div'));
    act(() => root.render(<Probe />));
    expect(seen.at(-1)).toBe(false);
    act(() => vi.advanceTimersByTime(1001));
    expect(seen.at(-1)).toBe(true);
    act(() => window.dispatchEvent(new Event('keydown')));
    expect(seen.at(-1)).toBe(false);
    act(() => root.unmount());
  });
});
