export function CinematicTitle({
  title,
  onDismiss,
}: {
  title: string;
  onDismiss: () => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  return (
    <div className="pan-cinema" aria-label="事件电影题字">
      <div className="pan-cinema-letterbox" aria-hidden="true" />
      <button
        ref={button}
        className="pan-cinema-title"
        aria-label={`收起${title}电影题字`}
        onClick={onDismiss}
      >
        <span key={title} className="pan-cinema-name" aria-hidden="true">
          {title}
        </span>
        <span className="pan-cinema-hint">
          点击题字或左侧同一事件，即可恢复资料
        </span>
      </button>
    </div>
  );
}
import { useEffect, useRef } from 'react';
