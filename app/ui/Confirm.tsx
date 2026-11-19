import { useEffect, useRef, useState } from 'preact/hooks';
import { Button, type ButtonProps } from './Button.tsx';

export interface ConfirmActionProps {
  label: string;
  prompt: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  icon?: ButtonProps['icon'];
  hint?: string;
  initialAsking?: boolean;
  onConfirm: () => void;
}

/**
 * A button that asks in place before it acts: it becomes the question with a confirm and a cancel, focus going to the cancel, Escape cancelling, and focus returning to the trigger.
 */
export function ConfirmAction({ label, prompt, confirmLabel, cancelLabel, variant = 'secondary', size = 'md', icon, hint, initialAsking = false, onConfirm }: ConfirmActionProps) {
  const [asking, setAsking] = useState(initialAsking);
  const root = useRef<HTMLSpanElement>(null);
  const returning = useRef(false);
  useEffect(() => {
    if (asking) {
      root.current?.querySelector<HTMLElement>('[data-cancel] button')?.focus();
    } else if (returning.current) {
      returning.current = false;
      root.current?.querySelector<HTMLElement>('button')?.focus();
    }
  }, [asking]);
  return (
    <span class="lg-confirm" ref={root}>
      {asking ? (
        <span
          role="group"
          aria-label={prompt}
          class="lg-confirm__ask"
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            returning.current = true;
            setAsking(false);
          }}
        >
          <span class="lg-confirm__text">{prompt}</span>
          <span data-confirm-wrap>
            <button type="button" data-confirm class="lg-btn lg-btn--danger lg-btn--md" onClick={() => { setAsking(false); onConfirm(); }}>
              {confirmLabel}
            </button>
          </span>
          <span data-cancel>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                returning.current = true;
                setAsking(false);
              }}
            >
              {cancelLabel}
            </Button>
          </span>
        </span>
      ) : (
        <>
          <Button variant={variant} size={size} icon={icon} onClick={() => setAsking(true)}>
            {label}
          </Button>
          {hint ? <span class="lg-muted">{hint}</span> : null}
        </>
      )}
    </span>
  );
}
