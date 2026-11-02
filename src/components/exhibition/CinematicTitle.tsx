import { useEffect, useRef } from 'react';
import '../../styles/event-cinematic.css';

export function CinematicTitle({
  title,
  onDismiss,
  hint = '点击题字或左侧同一事件，即可恢复资料',
}: {
  title: string;
  onDismiss: () => void;
  hint?: string;
}) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), [title]);
  return (
    <div className="pan-cinema" aria-label="事件电影题字">
      <div className="pan-cinema-letterbox" aria-hidden="true" />
      <button
        ref={button}
        className="pan-cinema-title"
        aria-label={`收起${title}电影题字`}
        onClick={onDismiss}
      >
        <span
          key={title}
          className={`pan-cinema-name${title === '瑞金' ? ' is-ruijin' : ''}`}
          aria-hidden="true"
        >
          {title}
        </span>
        <span className="pan-cinema-hint">{hint}</span>
      </button>
    </div>
  );
}
