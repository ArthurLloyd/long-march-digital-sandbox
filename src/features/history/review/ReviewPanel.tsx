import { assetsForPerson } from '../asset-selection';
import { useState } from 'react';
import type {
  HistoricalDetail,
  HistoryDatasetV2,
  InteractionResponse,
} from '../../../shared/contracts';
import { HistoricalDetailPanel } from '../HistoricalDetailPanel';
import { TeachingInteraction } from '../TeachingInteraction';
import { EquivalentExperience } from '../EquivalentExperience';
import { HistoryAssetGallery } from '../HistoryAssetGallery';
import { assessResponse } from '../interaction-state';
import styles from './review.module.css';

export function ReviewPanel({
  dataset,
}: {
  dataset: Readonly<HistoryDatasetV2>;
}) {
  const [topicId, setTopicId] = useState(
    dataset.topics.find((t) => t.topicId === 'topic-ld')?.topicId ??
      dataset.topics[0]?.topicId ??
      '',
  );
  const [view, setView] = useState('reading');
  const [eventId, setEventId] = useState('');
  const topic = dataset.topics.find((t) => t.topicId === topicId);
  const manifest = dataset.experiences.find((e) => e.topicId === topicId);
  const [personId, setPersonId] = useState(dataset.people[0]?.personId ?? '');
  const [placeId, setPlaceId] = useState(dataset.places[0]?.placeId ?? '');
  const [notice, setNotice] = useState('');
  const event = dataset.events.find(
    (e) => e.id === (eventId || topic?.eventIds[0]),
  );
  const person = dataset.people.find((p) => p.personId === personId);
  const place = dataset.places.find((p) => p.placeId === placeId);
  const detail: HistoricalDetail | null =
    view === 'people' && person
      ? { kind: 'person', record: person }
      : view === 'places' && place
        ? { kind: 'place', record: place }
        : event
          ? { kind: 'event', record: event }
          : null;
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>长征 · 不灭的火种 / B 内容审阅</p>
        <h1>让每一段叙事，都有据可循。</h1>
        <p>六主题 · 十二互动 · 真实照片与艺术形象</p>
      </header>
      <aside className={styles.banner} role="note">
        <strong>仅本地候选审阅，尚未正式发布。</strong>
        本页独立于展馆和完成记录；操作不会保存通关、填写审核或开放正式内容。照片与艺术形象分别标注年代和性质。
      </aside>
      <div className={styles.layout}>
        <nav className={styles.sidebar} aria-label="审阅导航">
          <h2>六个主题</h2>
          {dataset.topics.map((t) => (
            <button
              key={t.topicId}
              type="button"
              aria-pressed={t.topicId === topicId}
              onClick={() => {
                setTopicId(t.topicId);
                setEventId('');
                setNotice('');
              }}
            >
              {t.title}
            </button>
          ))}
          <h2>资料类别</h2>
          {[
            ['reading', '事件全文'],
            ['experience', '五段体验与互动'],
            ['people', '人物与照片'],
            ['places', '地点与阶段'],
            ['sources', '来源与使用条件'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => {
                setView(key!);
                setNotice('');
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <section className={styles.content} aria-label="候选内容">
          <div className={styles.sectionHeader}>
            <h2>{topic?.title ?? '暂无专题'}</h2>
            <span>候选稿 · {manifest?.scriptVersion ?? '无脚本'}</span>
          </div>
          {view === 'experience' && manifest && (
            <ReviewExperience
              key={manifest.experienceId + manifest.scriptVersion}
              data={dataset}
              experienceId={manifest.experienceId}
            />
          )}
          {view === 'reading' && (
            <label className={styles.selector}>
              选择事件（含阶段卡与补充阅读）
              <select
                value={event?.id ?? ''}
                onChange={(e) => {
                  setEventId(e.target.value);
                  const owner = dataset.topics.find((t) =>
                    t.eventIds.includes(e.target.value),
                  );
                  if (owner) setTopicId(owner.topicId);
                }}
              >
                {dataset.events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} · {e.dateText}
                  </option>
                ))}
              </select>
            </label>
          )}
          {view === 'people' && (
            <label className={styles.selector}>
              选择人物
              <select
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
              >
                {dataset.people.map((p) => (
                  <option key={p.personId} value={p.personId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {view === 'places' && (
            <>
              <label className={styles.selector}>
                选择地点
                <select
                  value={placeId}
                  onChange={(e) => setPlaceId(e.target.value)}
                >
                  {dataset.places.map((p) => (
                    <option key={p.placeId} value={p.placeId}>
                      {p.historicalName}
                    </option>
                  ))}
                </select>
              </label>
              <h3>本专题历史阶段</h3>
              <ol>
                {topic?.phaseIds.map((id) => {
                  const p = dataset.phases.find((v) => v.phaseId === id);
                  return p ? (
                    <li key={id}>
                      {p.title} · {p.timeRange.label}
                    </li>
                  ) : null;
                })}
              </ol>
              <p>
                历史行军几何仍未取得，不能由这些文字阶段自动生成路线。本版没有把现代地标补成历史坐标。
              </p>
            </>
          )}
          {['reading', 'people', 'places'].includes(view) && detail && (
            <HistoricalDetailPanel
              key={detail.kind + JSON.stringify(detail.record)}
              detail={detail}
              sources={dataset.sources}
              assets={[]}
              onNavigate={(r) => {
                if (r.type === 'open_source') {
                  setView('sources');
                  setNotice(`来源：${r.sourceId}`);
                } else if (
                  r.type === 'open_object' &&
                  r.selection.kind === 'event'
                ) {
                  const t = dataset.topics.find((t) =>
                    t.eventIds.includes(r.selection.id),
                  );
                  if (t) {
                    setTopicId(t.topicId);
                    setEventId(r.selection.id);
                    setView('reading');
                  }
                }
              }}
              onClose={() => {
                setView('reading');
                setNotice('资料已收起，可继续选择主题。');
              }}
            />
          )}
          {view === 'people' && person && (
            <>
              <h3>同人配对 · 供身份与素材审阅</h3>
              <HistoryAssetGallery
                assets={assetsForPerson(
                  dataset.assets.filter((a) =>
                    person.assetIds.includes(a.assetId),
                  ),
                  person.personId,
                  true,
                )}
                review
              />
              <p className={styles.small}>
                照片保持原文件；合影按图注识别人像。艺术形象只服务人物识别，不复原1935年现场。
              </p>
            </>
          )}
          {view === 'sources' && (
            <div>
              {dataset.sources.map((s) => (
                <article className={styles.source} key={s.sourceId}>
                  <h3>{s.title}</h3>
                  <p>
                    {s.publisherOrAuthor} · {s.sourceId}
                  </p>
                  <p>定位：{s.pageOrSection}</p>
                  <p>支持：{s.supports.join('；')}</p>
                  <p>局限：{s.limitations}</p>
                  <p>使用说明：{s.rightsNote}</p>
                  {/^https?:\/\//i.test(s.urlOrCatalogNumber) && (
                    <a
                      href={s.urlOrCatalogNumber}
                      target="_blank"
                      rel="noreferrer"
                    >
                      打开来源页面
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
          {notice && <p role="status">{notice}</p>}
        </section>
      </div>
      <footer className={styles.footer}>
        本页用于内容与交互审阅，不替代真人史实复核、素材使用条件核查或 A/C
        三维联合验收。
      </footer>
    </main>
  );
}
function ReviewExperience({
  data,
  experienceId,
}: {
  data: Readonly<HistoryDatasetV2>;
  experienceId: string;
}) {
  const manifest = data.experiences.find(
    (e) => e.experienceId === experienceId,
  )!;
  const content = data.fallbackContents.find(
    (f) => f.fallbackContentId === manifest.fallbackContentId,
  )!;
  const [index, setIndex] = useState(0);
  const [viewed, setViewed] = useState<string[]>([]);
  const [responses, setResponses] = useState<
    Record<string, InteractionResponse>
  >({});
  const [acks, setAcks] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const step = content.steps[index]!;
  const interactions = step.interactionIds.map((id) =>
    data.interactions.find((i) => i.interactionId === id)!,
  );
  const ready =
    viewed.includes(step.stepId) &&
    interactions.every(
      (d) =>
        assessResponse(d, responses[d.interactionId] ?? null).complete &&
        acks.includes(d.interactionId),
    );
  const allReady =
    content.steps.every((s) => viewed.includes(s.stepId)) &&
    manifest.requiredInteractionIds.every((id) => {
      const d = data.interactions.find((i) => i.interactionId === id)!;
      return (
        assessResponse(d, responses[id] ?? null).complete && acks.includes(id)
      );
    });
  return (
    <div>
      <p>
        图文审阅：与正式交付使用同一份脚本和互动组件。此处的进度仅在本页内存中存在。
      </p>
      <EquivalentExperience
        content={content}
        activeStepId={step.stepId}
        onStepViewed={(id) =>
          setViewed((v) => (v.includes(id) ? v : [...v, id]))
        }
      />
      {interactions.map((d) => (
        <TeachingInteraction
          key={d.interactionId}
          interaction={d}
          response={responses[d.interactionId] ?? null}
          explanationAcknowledged={acks.includes(d.interactionId)}
          onResponse={(id, r) => setResponses((v) => ({ ...v, [id]: r }))}
          onExplanationAcknowledged={(id) =>
            setAcks((v) => (v.includes(id) ? v : [...v, id]))
          }
        />
      ))}
      <div className={styles.controls}>
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
        >
          回看上一段
        </button>
        {index < content.steps.length - 1 ? (
          <button
            type="button"
            disabled={!ready}
            onClick={() => setIndex((i) => i + 1)}
          >
            继续下一段
          </button>
        ) : (
          <button
            type="button"
            disabled={!allReady || finished}
            onClick={() => setFinished(true)}
          >
            完成本次本地审阅
          </button>
        )}
      </div>
      <p role="status">
        已读 {viewed.length} / {content.steps.length} 段 · 已确认解释{' '}
        {acks.length} / 2
      </p>
      {finished && (
        <p className={styles.success}>
          本次候选流程已走完；未写入展馆完成记录，也不代表史实审核通过。
        </p>
      )}
    </div>
  );
}
