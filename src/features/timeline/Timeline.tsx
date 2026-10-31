import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import type { HistoryEvent } from '../../shared/contracts';
import {
  EmberCrest,
  PlaybackDial,
} from '../../components/exhibition/ExhibitionOrnaments';

interface TimelineProps {
  events: readonly HistoryEvent[];
  activeEventId: string | null;
  playing: boolean;
  progress: number;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (eventId: string) => void;
}

export function Timeline({
  events,
  activeEventId,
  playing,
  progress,
  onToggle,
  onPrevious,
  onNext,
  onSelect,
}: TimelineProps) {
  const index = events.findIndex((event) => event.id === activeEventId);
  return (
    <section className="timeline" aria-label="历史时间轴">
      <EmberCrest className="timeline-crest" />
      <div className="playback-controls">
        <button
          className="icon-button"
          aria-label="上一个历史节点"
          disabled={index <= 0}
          onClick={onPrevious}
        >
          <SkipBack size={18} />
        </button>
        <span className="play-dial">
          <PlaybackDial />
          <button
            className="play-button"
            aria-label={playing ? '暂停历史回放' : '播放历史回放'}
            disabled={events.length < 2}
            onClick={onToggle}
          >
            {playing ? <Pause size={19} /> : <Play size={19} />}
          </button>
        </span>
        <button
          className="icon-button"
          aria-label="下一个历史节点"
          disabled={!events.length || index >= events.length - 1}
          onClick={onNext}
        >
          <SkipForward size={18} />
        </button>
      </div>
      <div className="timeline-track">
        <div className="timeline-label">
          <strong>历史进程</strong>
          <span>
            {events.length
              ? `${Math.max(0, index + 1)} / ${events.length} 个核验节点`
              : '等待核验节点'}
          </span>
        </div>
        <div
          className="timeline-progress"
          role="progressbar"
          aria-label="历史回放进度"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${progress * 100}%` }} />
        </div>
        {events.length > 0 && (
          <div className="timeline-events">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => onSelect(event.id)}
                aria-current={event.id === activeEventId ? 'step' : undefined}
              >
                {event.title}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="timeline-current">
        <span>
          {events.find((event) => event.id === activeEventId)?.dateText ??
            '当前事件'}
        </span>
        <strong>
          {events.find((event) => event.id === activeEventId)?.title ??
            '尚未开放'}
        </strong>
      </div>
    </section>
  );
}
