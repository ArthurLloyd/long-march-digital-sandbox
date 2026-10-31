import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function ExhibitionDrawer({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    headingRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const focusable = [
        ...(panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], summary, input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ) ?? []),
      ].filter(
        (element) =>
          (!element.closest('details:not([open])') ||
            element.tagName === 'SUMMARY') &&
          !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
          window.getComputedStyle(element).display !== 'none' &&
          window.getComputedStyle(element).visibility !== 'hidden',
      );
      const first = focusable?.[0];
      const last = focusable?.[focusable.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === headingRef.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
    };
  }, [onClose]);
  return (
    <div className="drawer-layer">
      <button
        className="drawer-backdrop"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <section
        className="exhibition-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
      >
        <header className="drawer-header">
          <h2 id={titleId} tabIndex={-1} ref={headingRef}>
            {title}
          </h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="关闭面板"
          >
            <X size={21} />
            <span>关闭</span>
          </button>
        </header>
        <div className="drawer-content">{children}</div>
        <footer className="drawer-footer">
          以史为据，让每一段叙事可追溯。
        </footer>
      </section>
    </div>
  );
}
