import { useEffect, useId, useRef } from 'react';
import { EmberCrest, OrnamentFrame } from '../exhibition/ExhibitionOrnaments';
export function ExperienceTransition({
  onComplete,
  onCancel,
}: {
  onComplete: () => void;
  onCancel: () => void;
}) {
  const skipRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => {
    skipRef.current?.focus();
  }, []);
  return (
    <div
      className="experience-transition"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.repeat && (event.key === 'Enter' || event.key === ' '))
          event.preventDefault();
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
        if (event.key !== 'Tab') return;
        if (event.shiftKey && document.activeElement === skipRef.current) {
          event.preventDefault();
          cancelRef.current?.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === cancelRef.current
        ) {
          event.preventDefault();
          skipRef.current?.focus();
        }
      }}
    >
      <section className="entry-confirmation">
        <OrnamentFrame />
        <EmberCrest />
        <h2 id={titleId}>山河之间，开启征程。</h2>
        <p>点击“立即进入”，开启沙盘探索。</p>
        <button
          ref={skipRef}
          className="entry-confirm-button"
          onClick={onComplete}
        >
          立即进入
        </button>
        <button ref={cancelRef} className="quiet-button" onClick={onCancel}>
          返回首页
        </button>
      </section>
    </div>
  );
}
