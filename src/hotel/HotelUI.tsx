import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { statusLabel } from './utils';

export function Status({ value }: { value: string }) {
  return (
    <span className={`hotel-status hotel-status-${value.toLowerCase()}`}>{statusLabel(value)}</span>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="hotel-empty">{children}</p>;
}
export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <article className="hotel-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        ) ?? [],
      ).filter((el) => !el.closest('[hidden]'));
    (focusable()[0] ?? ref.current)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const elements = focusable(),
        first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div className="hotel-modal-backdrop">
      <section
        ref={ref}
        tabIndex={-1}
        className={`hotel-modal${wide ? ' hotel-modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header>
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="hotel-icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <i className="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function HotelForm({
  children,
  save,
  label = 'Save',
  afterSave,
}: {
  children: ReactNode;
  save: () => Promise<unknown>;
  label?: string;
  afterSave?: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError('');
        try {
          await save();
          afterSave?.();
        } catch (caught) {
          setError(
            caught instanceof Error ? caught.message : 'Unable to save this change. Try again.',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {error && (
        <p className="hotel-error" role="alert">
          {error}
        </p>
      )}
      <fieldset disabled={busy}>
        {children}
        <div className="hotel-form-actions">
          <button className="hotel-primary" type="submit">
            {busy ? 'Saving…' : label}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="hotel-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function useCommandId() {
  const ref = useRef<{ fingerprint: string; id: string } | undefined>(undefined);
  return (body: unknown) => {
    const fingerprint = JSON.stringify(body);
    if (ref.current?.fingerprint !== fingerprint)
      ref.current = { fingerprint, id: crypto.randomUUID() };
    return ref.current.id;
  };
}
