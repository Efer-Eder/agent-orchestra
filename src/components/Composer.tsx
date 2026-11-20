import { ArrowUp, Square } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AgentProfile } from '../domain/agents.ts';
import { useI18n } from '../i18n/I18n.tsx';
import { AgentAvatar } from './AgentAvatar.tsx';
import { cn } from './primitives.tsx';

interface Props {
  agent: AgentProfile;
  placeholder: string;
  busy?: boolean;
  disabled?: boolean;
  meta?: React.ReactNode;
  autoFocus?: boolean;
  /** Return an error message to keep the text, or null on success. */
  onSubmit: (text: string) => string | null | Promise<void>;
  onStop?: () => void;
}

/** Rounded message box (DESIGN.md › Composer). Enter sends, Shift+Enter breaks lines. */
export function Composer({
  agent,
  placeholder,
  busy,
  disabled,
  meta,
  autoFocus,
  onSubmit,
  onStop,
}: Props) {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || disabled || !text.trim()) return;
    const result = await onSubmit(text);
    if (typeof result === 'string') {
      setError(result);
    } else {
      setError(null);
      setText('');
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-[720px]">
      <div
        className={cn(
          'rounded-[18px] border border-line bg-surface px-4 pt-3 pb-2.5 shadow-[0_1px_0_rgb(0_0_0/0.03),0_8px_24px_rgb(0_0_0/0.06)] transition-colors focus-within:border-line-strong',
          disabled && 'opacity-60',
        )}
      >
        <textarea
          ref={ref}
          value={text}
          rows={1}
          autoFocus={autoFocus}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="block max-h-[220px] min-h-[44px] w-full resize-none bg-transparent text-[14px] leading-relaxed text-ink placeholder:text-ink-3 focus:outline-none"
        />
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 py-0.5 pr-2.5 pl-0.5 text-[12.5px] text-ink-2">
            <AgentAvatar agent={agent} size={20} />
            {agent.name}
          </span>
          <span className="flex-1" />
          {busy && onStop ? (
            <button
              type="button"
              onClick={onStop}
              aria-label={t.composer.stop}
              title={t.composer.stop}
              className="grid h-8 w-8 place-items-center rounded-full bg-ink text-app transition-opacity hover:opacity-85"
            >
              <Square size={12} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              aria-label={t.composer.send}
              title={t.composer.sendHint}
              disabled={!text.trim() || busy || disabled}
              className="grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-ink transition-opacity hover:bg-accent-hover disabled:opacity-40"
            >
              <ArrowUp size={16} strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 px-1 text-[12.5px] text-bad">
          {error}
        </p>
      )}
      {meta && (
        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[12px] text-ink-3">
          {meta}
        </div>
      )}
    </form>
  );
}
