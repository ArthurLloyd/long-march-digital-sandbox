import { ArrowUpRight, BookOpen, X } from 'lucide-react';
import type { HistoryEventPanelProps } from '../../shared/contracts';

/** Member B's replaceable content adapter; opening and selection belong to the app. */
export function HistoryEventPanel({
  event,
  sources,
  onClose,
  teachingState,
}: HistoryEventPanelProps) {
  if (!event)
    return (
      <div className="event-empty">
        <BookOpen size={25} strokeWidth={1.4} aria-hidden="true" />
        <h3>每一段历史，都有据可循。</h3>
        <p>史料完成复核后，在这里阅读事件、地点与原始出处。</p>
        <dl className="empty-metadata">
          <div>
            <dt>事件时间</dt>
            <dd>待核验</dd>
          </div>
          <div>
            <dt>历史地点</dt>
            <dd>待核验</dd>
          </div>
          <div>
            <dt>资料出处</dt>
            <dd>尚未发布</dd>
          </div>
        </dl>
        <p className="integrity-note">正式内容须经两名成员独立复核。</p>
      </div>
    );

  return (
    <article className="event-detail">
      <div className="panel-title-row">
        <h3>{event.title}</h3>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="关闭当前事件"
        >
          <X size={18} />
        </button>
      </div>
      <dl className="empty-metadata">
        <div>
          <dt>时间</dt>
          <dd>
            {event.dateText}（{event.datePrecision}）
          </dd>
        </div>
        <div>
          <dt>地点</dt>
          <dd>{event.locationName}</dd>
        </div>
        <div>
          <dt>空间精度</dt>
          <dd>{event.coordinatePrecision}</dd>
        </div>
        <div>
          <dt>内容类型</dt>
          <dd>{event.contentType}</dd>
        </div>
      </dl>
      <p>{event.summary}</p>
      <details>
        <summary>阅读史料详情</summary>
        <p>{event.detail}</p>
      </details>
      <h4>关联来源</h4>
      <ul className="source-list">
        {sources.map((source) => (
          <li key={source.sourceId}>
            <strong>{source.title}</strong>
            <span>
              {source.publisherOrAuthor} · {source.pageOrSection}
            </span>
            {/^https?:\/\//i.test(source.urlOrCatalogNumber) ? (
              <a
                href={source.urlOrCatalogNumber}
                target="_blank"
                rel="noreferrer"
              >
                查看原始出处 <ArrowUpRight size={14} />
              </a>
            ) : (
              <span>馆藏／书目号：{source.urlOrCatalogNumber}</span>
            )}
            <p>资料局限：{source.limitations}</p>
          </li>
        ))}
      </ul>
      {teachingState.mode === 'teaching_simulation' && (
        <p className="integrity-note">教学模拟，不改变真实历史进程。</p>
      )}
    </article>
  );
}
