import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export default function CommercialFormSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const invalidField = useRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>(
    null,
  );

  useEffect(() => {
    if (!expanded || !invalidField.current) return;
    const field = invalidField.current;
    invalidField.current = null;
    field.focus();
    field.reportValidity();
  }, [expanded]);

  return (
    <section
      className="commercial-form-section wide-field"
      data-expanded={expanded}
      onInvalidCapture={(event) => {
        if (expanded || !window.matchMedia('(max-width: 920px)').matches) return;
        event.preventDefault();
        invalidField.current = event.target as HTMLInputElement;
        setExpanded(true);
      }}
    >
      <button
        className="commercial-section-toggle"
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((current) => !current)}
      >
        <span>
          <strong>{title}</strong>
          {summary ? <small>{summary}</small> : null}
        </span>
        <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`} aria-hidden="true" />
      </button>
      <div className="commercial-section-fields" id={contentId}>
        {children}
      </div>
    </section>
  );
}
