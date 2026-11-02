import type {
  HistoricalObjectSelection,
  HistoryDatasetV2,
} from '../../shared/contracts';
import { createPhaseModel, phaseTimeText } from '../../features/timeline';
import '../../styles/historical-orchestration.css';

interface Props {
  dataset: HistoryDatasetV2;
  fullExhibition?: boolean;
  topicId: string | null;
  phaseId: string | null;
  onTopic: (id: string) => void;
  onPhase: (id: string) => void;
  onObjectSelect: (selection: HistoricalObjectSelection) => void;
  onEventAtPhase: (eventId: string, topicId: string, phaseId: string) => void;
}

/** Receives the complete published catalog. Scene projections never feed this directory. */
export function HistoricalNavigation({
  dataset,
  fullExhibition = false,
  topicId,
  phaseId,
  onTopic,
  onPhase,
  onObjectSelect,
  onEventAtPhase,
}: Props) {
  const model = createPhaseModel(dataset);
  const phaseEvents = new Set(
    dataset.phases.find((p) => p.phaseId === phaseId)?.eventIds ?? [],
  );
  const people = dataset.people.filter(
    (p) =>
      p.relatedTopicIds.includes(topicId ?? '') ||
      p.relatedEventIds.some((id) => phaseEvents.has(id)),
  );
  const places = dataset.places.filter((p) =>
    p.relatedEventIds.some((id) => phaseEvents.has(id)),
  );
  const eventButton = (id: string, topic: string, phase: string) => {
    const event = dataset.events.find((e) => e.id === id);
    return event ? (
      <li key={id}>
        <button
          className="history-directory-link"
          onClick={() => onEventAtPhase(id, topic, phase)}
        >
          <small>{event.dateText}</small>
          <strong>{event.title}</strong>
        </button>
      </li>
    ) : null;
  };
  return (
    <div className="historical-navigation">
      <p className="drawer-introduction">
        选择专题与阶段探索山河；主动打开事件时，再进入资料或体验。
      </p>
      {fullExhibition && (
        <section className="history-collection" aria-label="六主题历史目录">
          <p className="history-collection-count">六个专题 · 从史料走进长征</p>
          <h3>选择一段历史，开始探索。</h3>
          <div className="history-collection-grid">
            {model.topics.map((topic) => {
              const event = dataset.events.find(
                (e) => e.id === topic.eventIds[0],
              );
              const phase = dataset.phases.find(
                (p) => p.phaseId === topic.phaseIds[0],
              );
              return event && phase ? (
                <article
                  key={topic.topicId}
                  className="history-collection-card"
                >
                  <small>
                    {['topic-ld', 'topic-zy', 'topic-sn'].includes(
                      topic.topicId,
                    )
                      ? '重点故事'
                      : '历史专题'}{' '}
                    · {event.dateText}
                  </small>
                  <h4>{topic.title}</h4>
                  <p>{topic.summary}</p>
                  <button
                    className="outlined-button"
                    onClick={() =>
                      onEventAtPhase(event.id, topic.topicId, phase.phaseId)
                    }
                  >
                    阅读{topic.title}
                  </button>
                </article>
              ) : null;
            })}
          </div>
          <p>阅读正文后可开始图文互动，也可沿下方阶段目录继续探索。</p>
        </section>
      )}
      {model.error && <p role="alert">{model.error}</p>}
      {!model.topics.length && <p>历史专题正在核验，正式内容暂未开放。</p>}
      {model.topics.map((topic) => (
        <details
          className="history-topic"
          key={topic.topicId}
          open={topic.topicId === topicId}
        >
          <summary>
            <strong>{topic.title}</strong>
            <span>
              {model.orders.get(topic.topicId)?.length ?? 0} 个历史阶段
              {topic.topicId === topicId ? ' · 当前专题' : ''}
            </span>
          </summary>
          <p>{topic.summary}</p>
          <button
            className="outlined-button"
            aria-pressed={topic.topicId === topicId}
            onClick={() => onTopic(topic.topicId)}
          >
            进入专题：{topic.title}
          </button>
          {(model.orders.get(topic.topicId) ?? []).map((phase) => (
            <details
              className="history-phase"
              key={phase.phaseId}
              open={phase.phaseId === phaseId}
            >
              <summary>
                <span>{phase.title}</span>
                {phase.phaseId === phaseId && <small>当前阶段</small>}
              </summary>
              <p>{phaseTimeText(phase)}</p>
              <button
                className="outlined-button"
                aria-current={phase.phaseId === phaseId ? 'step' : undefined}
                onClick={() => {
                  if (topic.topicId !== topicId) onTopic(topic.topicId);
                  onPhase(phase.phaseId);
                }}
              >
                查看阶段：{phase.title}
              </button>
              <ol className="history-directory-list">
                {phase.eventIds.map((id) =>
                  eventButton(id, topic.topicId, phase.phaseId),
                )}
              </ol>
            </details>
          ))}
          {!topic.phaseIds.length && <p>本专题阶段资料正在核验。</p>}
        </details>
      ))}
      <section className="history-entities" aria-label="当前专题关联资料">
        <h3>关联人物与地点</h3>
        {people.map((person) => (
          <button
            className="history-directory-link"
            key={person.personId}
            onClick={() =>
              onObjectSelect({ kind: 'person', id: person.personId })
            }
          >
            {person.name}
          </button>
        ))}
        {places.map((place) => (
          <button
            className="history-directory-link"
            key={place.placeId}
            onClick={() => onObjectSelect({ kind: 'place', id: place.placeId })}
          >
            {place.historicalName}
            {place.coordinates === null && <small>位置未知 · 可阅读资料</small>}
          </button>
        ))}
        {!people.length && !places.length && (
          <p>当前暂无可发布的关联人物或地点资料。</p>
        )}
      </section>
      <details className="history-entities">
        <summary>全部人物与地点资料</summary>
        {dataset.people
          .filter((p) => !people.includes(p))
          .map((person) => (
            <button
              className="history-directory-link"
              key={person.personId}
              onClick={() =>
                onObjectSelect({ kind: 'person', id: person.personId })
              }
            >
              {person.name}
            </button>
          ))}
        {dataset.places
          .filter((p) => !places.includes(p))
          .map((place) => (
            <button
              className="history-directory-link"
              key={place.placeId}
              onClick={() =>
                onObjectSelect({ kind: 'place', id: place.placeId })
              }
            >
              {place.historicalName}
            </button>
          ))}
        {!dataset.people.length && !dataset.places.length && (
          <p>人物与地点资料正在核验。</p>
        )}
      </details>
      {fullExhibition && dataset.forceTracks.length > 0 && (
        <details className="history-entities">
          <summary>双方部队与阶段资料</summary>
          {dataset.forceTracks.map((track) => (
            <article key={track.trackId} className="history-force-record">
              <h4>{track.name}</h4>
              <p>
                阵营：
                {track.camp === 'red_army'
                  ? '红军'
                  : track.camp === 'nationalist_army'
                    ? '国民党军'
                    : '其他'}
              </p>
              <ul>
                {dataset.forceSnapshots
                  .filter((s) => s.trackId === track.trackId)
                  .map((snapshot) => {
                    const phase = dataset.phases.find(
                      (p) => p.phaseId === snapshot.phaseId,
                    );
                    return (
                      <li key={snapshot.snapshotId}>
                        {phase?.title} · {phase?.timeRange.label}。
                        {snapshot.coordinates === null
                          ? '具体位置未定，保留阶段关联与文字资料。'
                          : '位置精度：' + snapshot.coordinatePrecision}
                      </li>
                    );
                  })}
              </ul>
              <p>
                依据：
                {track.sourceIds
                  .map(
                    (id) =>
                      dataset.sources.find((s) => s.sourceId === id)?.title ??
                      id,
                  )
                  .join('；')}
              </p>
            </article>
          ))}
        </details>
      )}
      {dataset.events.some(
        (e) => !dataset.topics.some((t) => t.eventIds.includes(e.id)),
      ) && (
        <details className="history-entities">
          <summary>
            {fullExhibition ? '补充历史事件' : '其他已发布事件'}
          </summary>
          {dataset.events
            .filter(
              (e) => !dataset.topics.some((t) => t.eventIds.includes(e.id)),
            )
            .map((event) => (
              <button
                className="history-directory-link"
                key={event.id}
                onClick={() => onObjectSelect({ kind: 'event', id: event.id })}
              >
                {event.title}
              </button>
            ))}
        </details>
      )}
    </div>
  );
}
