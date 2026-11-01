import { useState } from 'react';
import { assetPathSchema } from '../../shared/contracts';
import type {
  AssetReference,
  HistoricalDetailProps,
  HistoricalObjectSelection,
} from '../../shared/contracts';
import styles from './history.module.css';

const precision = {
  exact: '精确',
  approximate: '近似',
  schematic: '示意',
  unknown: '未知',
};
const contentTypes = {
  historical_fact: '史实陈述',
  editorial_summary: '编辑概述',
  artistic_recreation: '艺术再现',
  teaching_simulation: '教学模拟',
};
function usable(a: AssetReference) {
  return (
    a.releaseStatus === 'published' &&
    a.reviewStatus === 'reviewed' &&
    a.rightsStatus === 'cleared' &&
    assetPathSchema.safeParse(a.filePath).success
  );
}
function AssetImage({ asset }: { asset: AssetReference }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure>
      {failed ? (
        <p role="status">图片加载失败，仍可阅读文字资料。</p>
      ) : (
        <a
          href={asset.filePath}
          target="_blank"
          rel="noreferrer"
          aria-label={`放大查看：${asset.title}`}
        >
          <img
            src={asset.filePath}
            alt={asset.title}
            loading="lazy"
            onError={() => setFailed(true)}
          />
        </a>
      )}
      <figcaption>
        <strong>
          {asset.representation === 'ai_recreation'
            ? 'AI 生成艺术形象'
            : asset.representation === 'artistic_recreation'
              ? '艺术化形象'
              : asset.assetType === 'historical_photo'
                ? '真实历史照片（不等于事件现场照）'
                : '资料图片'}
        </strong>
        <p>{asset.disclosure}</p>
        <small>
          {asset.creator} · {asset.attribution}
        </small>
        <small>出处：{asset.origin}</small>
        <small>使用条件：{asset.rightsNote}</small>
      </figcaption>
    </figure>
  );
}
export function HistoricalDetailPanel({
  detail,
  sources,
  assets,
  onNavigate,
  onClose,
}: HistoricalDetailProps) {
  const r = detail.record;
  const title =
    detail.kind === 'person'
      ? detail.record.name
      : detail.kind === 'place'
        ? detail.record.historicalName
        : detail.record.title;
  const body =
    detail.kind === 'topic' ? detail.record.summary : detail.record.detail;
  const sourceList = sources.filter((s) => r.sourceIds.includes(s.sourceId));
  const related: HistoricalObjectSelection[] =
    detail.kind === 'event'
      ? []
      : detail.kind === 'topic'
        ? detail.record.eventIds.map((id) => ({ kind: 'event', id }))
        : [
            ...detail.record.relatedEventIds.map((id) => ({
              kind: 'event' as const,
              id,
            })),
            ...(detail.kind === 'person'
              ? detail.record.relatedTopicIds.map((id) => ({
                  kind: 'topic' as const,
                  id,
                }))
              : []),
          ];
  const candidates = (
    'assetIds' in r
      ? assets.filter((a) => r.assetIds.includes(a.assetId))
      : assets.filter(
          (a) =>
            detail.kind === 'event' &&
            a.relatedEventIds.includes(detail.record.id),
        )
  ).filter(usable);
  const images = candidates.filter((a) =>
    [
      'historical_photo',
      'contemporary_photo',
      'archive_scan',
      'illustration',
      'ai_recreation',
    ].includes(a.assetType),
  );
  const personImages =
    detail.kind === 'person'
      ? images.filter((a) =>
          a.relatedPersonIds.includes(detail.record.personId),
        )
      : images;
  const hasPhoto = personImages.some((a) => a.assetType === 'historical_photo');
  const shown =
    detail.kind === 'person' && !hasPhoto
      ? personImages.filter(
          (a) =>
            a.assetType !== 'illustration' && a.assetType !== 'ai_recreation',
        )
      : personImages;
  return (
    <article className={styles.root}>
      <header className={styles.header}>
        <h3>{title}</h3>
        <button type="button" onClick={onClose} aria-label="关闭当前资料">
          关闭
        </button>
      </header>
      {r.releaseStatus !== 'published' && (
        <p className={styles.note}>
          候选资料，尚未发布；当前展示用于隔离审阅。
        </p>
      )}
      {detail.kind === 'event' && (
        <dl className={styles.metadata}>
          <dt>时间</dt>
          <dd>{detail.record.dateText}</dd>
          <dt>地点</dt>
          <dd>{detail.record.locationName}</dd>
          <dt>空间精度</dt>
          <dd>
            {precision[detail.record.coordinatePrecision]}
            {detail.record.coordinates === null ? '，不在地图补造位置' : ''}
          </dd>
          <dt>材料性质</dt>
          <dd>{contentTypes[detail.record.contentType]}</dd>
        </dl>
      )}
      {detail.kind === 'place' && (
        <dl className={styles.metadata}>
          <dt>现代对照</dt>
          <dd>{detail.record.modernName ?? '待核查'}</dd>
          <dt>地点类型</dt>
          <dd>
            {
              {
                historical_event_site: '历史事件发生地',
                historical_site: '历史旧址',
                modern_museum: '现代博物馆',
                memorial: '纪念设施',
                modern_reference: '现代对照点',
              }[detail.record.placeType]
            }
          </dd>
          <dt>空间精度</dt>
          <dd>{precision[detail.record.coordinatePrecision]}</dd>
        </dl>
      )}
      {detail.kind !== 'topic' && <p>{r.summary}</p>}
      <div className={styles.prose}>{body}</div>
      {detail.kind === 'person' && !hasPhoto && (
        <p className={styles.note}>
          当前没有经审核可用的真实照片，先提供文字资料。
        </p>
      )}
      {shown.length > 0 && (
        <section aria-label="资料图片" className={styles.gallery}>
          {shown.map((a) => (
            <AssetImage key={a.assetId + a.filePath} asset={a} />
          ))}
        </section>
      )}
      {related.length > 0 && (
        <section>
          <h4>关联资料</h4>
          <div className={styles.actions}>
            {related.map((s) => (
              <button
                type="button"
                key={`${s.kind}:${s.id}`}
                onClick={() =>
                  onNavigate({ type: 'open_object', selection: s })
                }
              >
                {s.kind === 'event' ? '事件' : '专题'} · {s.id}
              </button>
            ))}
          </div>
        </section>
      )}
      <section>
        <h4>资料来源与局限</h4>
        {sourceList.length === 0 ? (
          <p>暂无可用来源，不据此认定史实已经审核。</p>
        ) : (
          sourceList.map((s) => (
            <div key={s.sourceId} className={styles.card}>
              <h4>{s.title}</h4>
              <p>
                {s.publisherOrAuthor} · {s.publicationDate}
              </p>
              <p>定位：{s.pageOrSection}</p>
              <p>支持范围：{s.supports.join('；')}</p>
              <p>局限：{s.limitations}</p>
              <p>素材条件：{s.rightsNote}</p>
              <button
                type="button"
                onClick={() =>
                  onNavigate({ type: 'open_source', sourceId: s.sourceId })
                }
              >
                查看来源说明
              </button>
              {/^https?:\/\//i.test(s.urlOrCatalogNumber) ? (
                <p>
                  <a
                    href={s.urlOrCatalogNumber}
                    target="_blank"
                    rel="noreferrer"
                  >
                    打开原始出处
                  </a>
                </p>
              ) : (
                <p>书目／馆藏号：{s.urlOrCatalogNumber}</p>
              )}
            </div>
          ))
        )}
      </section>
    </article>
  );
}
