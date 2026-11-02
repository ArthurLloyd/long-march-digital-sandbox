import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import type { HistoryEvent } from '../../shared/contracts';
import {
  EmberCrest,
  PlaybackDial,
} from '../../components/exhibition/ExhibitionOrnaments';
import type { useHistoricalPhase } from './use-historical-phase';
import { phaseTimeText } from './historical-phase-selectors';
import '../../styles/historical-orchestration.css';

export function PhaseTimeline({
  clock,
  events,
  activeEventId,
  onSelectPhase,
  onSelectEvent,
}: {
  clock: ReturnType<typeof useHistoricalPhase>;
  events: readonly HistoryEvent[];
  activeEventId: string | null;
  onSelectPhase: (id: string) => void;
  onSelectEvent: (id: string) => void;
}) {
  const final =
    clock.phases.length > 0 && clock.index === clock.phases.length - 1;
  return (
    <section className="timeline phase-timeline" aria-label="历史时间轴">
      <EmberCrest className="timeline-crest" />
      <div className="playback-controls">
        <button
          className="icon-button"
          aria-label="上一历史阶段"
          disabled={clock.index <= 0}
          onClick={clock.previousPhase}
        >
          <SkipBack size={18} />
        </button>
        <span className="play-dial">
          <PlaybackDial />
          <button
            className="play-button"
            aria-label={clock.playing ? '暂停专题阶段' : '播放专题阶段'}
            disabled={
              !clock.playing &&
              (clock.phases.length < 2 || final || !!clock.model.error)
            }
            title={
              final
                ? '已到专题末段，可使用重播专题'
                : clock.phases.length < 2
                  ? '至少两个已发布阶段才能播放'
                  : '按专题内部顺序播放'
            }
            onClick={clock.playing ? clock.pause : clock.play}
          >
            {clock.playing ? <Pause size={19} /> : <Play size={19} />}
          </button>
        </span>
        <button
          className="icon-button"
          aria-label="下一历史阶段"
          disabled={clock.index < 0 || final}
          onClick={clock.nextPhase}
        >
          <SkipForward size={18} />
        </button>
        <button
          className="icon-button"
          aria-label="重播当前专题"
          disabled={!clock.phases.length}
          onClick={clock.restartTopic}
        >
          <RotateCcw size={18} />
        </button>
      </div>
      <div className="timeline-track">
        <div className="timeline-label">
          <strong>历史阶段</strong>
          <span>
            {clock.phase
              ? `${clock.index + 1} / ${clock.phases.length} 个已发布阶段`
              : '史料核验中'}
          </span>
        </div>
        <div
          className="timeline-progress"
          role="progressbar"
          aria-label="专题阶段进度"
          aria-valuenow={Math.round(clock.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${clock.progress * 100}%` }} />
        </div>
        <div className="timeline-events" aria-label="选择历史阶段">
          {clock.phases.map((p) => (
            <button
              key={p.phaseId}
              aria-current={
                p.phaseId === clock.activePhaseId ? 'step' : undefined
              }
              onClick={() => onSelectPhase(p.phaseId)}
            >
              {p.title}
            </button>
          ))}
        </div>
        <p className="phase-cadence">
          每段展示间隔仅为展陈节奏，不代表历史时长或行军速度。
        </p>
      </div>
      <div className="timeline-current">
        <span>
          {clock.phase ? phaseTimeText(clock.phase) : '暂无可发布阶段'}
        </span>
        {events.length > 0 && (
          <div className="phase-event-list" aria-label="当前阶段事件">
            {events.map((event) => (
              <button
                className="history-directory-link"
                key={event.id}
                aria-current={event.id === activeEventId ? 'step' : undefined}
                onClick={() => onSelectEvent(event.id)}
              >
                {event.title}
              </button>
            ))}
          </div>
        )}
        <strong>
          {events.find((e) => e.id === activeEventId)?.title ??
            clock.phase?.title ??
            '尚未开放'}
        </strong>
      </div>
    </section>
  );
}
