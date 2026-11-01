import type {
  ExperienceNavigationRequest,
  HistoricalDetail,
  HistoryDatasetV2,
} from '../../shared/contracts';

const PLACE_TYPES = {
  historical_event_site: '历史发生地',
  historical_site: '历史旧址',
  modern_museum: '现代纪念馆',
  memorial: '纪念设施',
  modern_reference: '现代对照地点',
} as const;

export function RelatedHistoryLinks({
  detail,
  dataset,
  onNavigate,
}: {
  detail: HistoricalDetail;
  dataset: HistoryDatasetV2;
  onNavigate: (request: ExperienceNavigationRequest) => void;
}) {
  const eventIds =
    detail.kind === 'event'
      ? [detail.record.id]
      : detail.kind === 'topic'
        ? detail.record.eventIds
        : detail.record.relatedEventIds;
  const events =
    detail.kind === 'event'
      ? []
      : dataset.events.filter((e) => eventIds.includes(e.id));
  const people = dataset.people.filter(
    (p) =>
      (detail.kind !== 'person' || p.personId !== detail.record.personId) &&
      (p.relatedEventIds.some((id) => eventIds.includes(id)) ||
        (detail.kind === 'topic' &&
          p.relatedTopicIds.includes(detail.record.topicId))),
  );
  const places = dataset.places.filter(
    (p) =>
      (detail.kind !== 'place' || p.placeId !== detail.record.placeId) &&
      p.relatedEventIds.some((id) => eventIds.includes(id)),
  );
  return (
    <>
      {detail.kind === 'place' && (
        <p className="integrity-note">
          地点类型：{PLACE_TYPES[detail.record.placeType]}。
          {detail.record.coordinates === null
            ? '历史位置未知，未显示为地图点位。'
            : `空间精度：${detail.record.coordinatePrecision}。`}
          现代设施位置不能作为历史发生位置证明。
        </p>
      )}
      {(events.length > 0 || people.length > 0 || places.length > 0) && (
        <section className="history-entities" aria-label="关联历史资料">
          <h3>关联资料</h3>
          {events.map((e) => (
            <button
              key={e.id}
              className="history-directory-link"
              onClick={() =>
                onNavigate({
                  type: 'open_object',
                  selection: { kind: 'event', id: e.id },
                })
              }
            >
              {e.title}
            </button>
          ))}
          {people.map((p) => (
            <button
              key={p.personId}
              className="history-directory-link"
              onClick={() =>
                onNavigate({
                  type: 'open_object',
                  selection: { kind: 'person', id: p.personId },
                })
              }
            >
              {p.name}
            </button>
          ))}
          {places.map((p) => (
            <button
              key={p.placeId}
              className="history-directory-link"
              onClick={() =>
                onNavigate({
                  type: 'open_object',
                  selection: { kind: 'place', id: p.placeId },
                })
              }
            >
              {p.historicalName}
            </button>
          ))}
        </section>
      )}
    </>
  );
}
