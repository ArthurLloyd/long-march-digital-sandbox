import { useEffect, useRef } from 'react';
export function ExperienceTransition({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const skipRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    skipRef.current?.focus();
    const timer = window.setTimeout(onComplete, 650);
    return () => window.clearTimeout(timer);
  }, [onComplete]);
  return (
    <div className="experience-transition">
      <p role="status">山河之间，开启征程。</p>
      <button ref={skipRef} className="quiet-button" onClick={onComplete}>
        立即进入
      </button>
    </div>
  );
}
