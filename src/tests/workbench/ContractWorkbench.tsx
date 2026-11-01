import {
  Component,
  Suspense,
  useCallback,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import * as Scene from '../../features/scene';
import * as History from '../../features/history';
import {
  EXPERIENCE_IDS,
  cameraBookmarkSchema,
  interactionResponseSchema,
  normalizeDataset,
  type CameraBookmark,
  type EquivalentExperienceProps,
  type HistoricalDetail,
  type HistoricalDetailProps,
  type HistoricalObjectSelection,
  type ImmersiveExperienceProps,
  type ImmersiveRendererCallbacks,
  type InteractionResponse,
  type LongMarchSceneV2Props,
  type TeachingInteractionProps,
} from '../../shared/contracts';
import { validateDataset } from '../../shared/utils/validate-dataset';
import { createDraftV2Dataset, DEV_ONLY_MARKER } from '../fixtures/v2-dataset';

function optionalExport<P>(
  module: object,
  name: string,
): ComponentType<P> | null {
  const value: unknown = (module as Record<string, unknown>)[name];
  return typeof value === 'function' ? (value as ComponentType<P>) : null;
}
const V2Scene = optionalExport<LongMarchSceneV2Props>(
  Scene,
  'LongMarchSceneV2',
);
const Renderer = optionalExport<ImmersiveExperienceProps>(
  Scene,
  'ImmersiveExperienceRenderer',
);
const Teaching = optionalExport<TeachingInteractionProps>(
  History,
  'TeachingInteraction',
);
const Details = optionalExport<HistoricalDetailProps>(
  History,
  'HistoricalDetailPanel',
);
const Equivalent = optionalExport<EquivalentExperienceProps>(
  History,
  'EquivalentExperience',
);
class WorkbenchBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p role="alert">
        模块渲染失败；请检查终端与浏览器错误。切换测试页可重新挂载。
      </p>
    ) : (
      this.props.children
    );
  }
}
export function ContractWorkbench() {
  const [data, setData] = useState(createDraftV2Dataset);
  const [json, setJson] = useState(() => JSON.stringify(data, null, 2));
  const [message, setMessage] = useState(
    '草稿样本，未经过发布门禁；仅供本地接线。',
  );
  const [view, setView] = useState('scene');
  const [phaseId, setPhaseId] = useState<string | null>('fixture-phase');
  const [selection, setSelection] = useState<HistoricalObjectSelection | null>(
    null,
  );
  const [segmentId, setSegmentId] = useState('fixture-s1');
  const [playing, setPlaying] = useState(false);
  const [interactionId, setInteractionId] = useState('ld-01');
  const [response, setResponse] = useState<InteractionResponse | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [detailKind, setDetailKind] = useState('event');
  const [lastBookmark, setLastBookmark] = useState<CameraBookmark | null>(null);
  const [cameraBookmark, setCameraBookmark] = useState<CameraBookmark | null>(
    null,
  );
  const log = useCallback(
    (name: string, payload?: unknown) =>
      setLogs((previous) =>
        [`${name}: ${JSON.stringify(payload ?? null)}`, ...previous].slice(
          0,
          30,
        ),
      ),
    [],
  );
  const onSceneReady = useCallback(() => log('scene.ready'), [log]);
  const captureBookmark = useCallback(
    (value: unknown) => {
      const parsed = cameraBookmarkSchema.safeParse(value);
      if (parsed.success) setLastBookmark(parsed.data);
      log('cameraBookmark', { value, valid: parsed.success });
    },
    [log],
  );
  const onSceneError = useCallback<LongMarchSceneV2Props['onSceneError']>(
    (error) => log('scene.error', error),
    [log],
  );
  const onEventSelect = useCallback(
    (id: string) => {
      setSelection({ kind: 'event', id });
      log('eventSelect', id);
    },
    [log],
  );
  const onObjectSelect = useCallback(
    (value: HistoricalObjectSelection) => {
      setSelection(value);
      log('objectSelect', value);
    },
    [log],
  );
  const callbacks = useMemo<ImmersiveRendererCallbacks>(
    () => ({
      onReady: (report) => log('renderer.ready', report),
      onError: (report) => log('renderer.error', report),
      onSegmentReached: (report) => log('segmentReached', report),
      onInteractionCue: (report) => log('interactionCue', report),
      onTerminalReached: (report) => log('terminalReached（不是完成）', report),
      onExitRequested: (report) => log('exitRequested', report),
      onCameraBookmark: (report) => {
        captureBookmark(report.bookmark);
        log('renderer.bookmarkRun', report);
      },
    }),
    [log, captureBookmark],
  );
  const manifest = data.experiences[0];
  const interaction =
    data.interactions.find((r) => r.interactionId === interactionId) ??
    data.interactions[0];
  const sceneProps: LongMarchSceneV2Props = {
    events: data.events,
    routes: data.routes,
    activeEventId: data.events[0]?.id ?? null,
    playbackProgress: 0,
    onEventSelect,
    onSceneReady,
    onSceneError,
    dataset: data,
    phaseId,
    selection,
    cameraBookmark,
    onObjectSelect,
    onCameraBookmark: captureBookmark,
  };
  const detail: HistoricalDetail | null =
    detailKind === 'person' && data.people[0]
      ? { kind: 'person', record: data.people[0] }
      : detailKind === 'place' && data.places[0]
        ? { kind: 'place', record: data.places[0] }
        : detailKind === 'topic' && data.topics[0]
          ? { kind: 'topic', record: data.topics[0] }
          : data.events[0]
            ? { kind: 'event', record: data.events[0] }
            : null;
  return (
    <main>
      <h1>C0 隔离接口工作台</h1>
      <a href="/__dev/contracts?flow=c1">打开 C1 调度与记忆工作台</a>
      <p role="note">
        <strong>{DEV_ONLY_MARKER}：所有条目均为非史实工程样本。</strong>
        本页不发布数据、不保存完成记录、不代替真实场景验收。
      </p>
      <label>
        工程样本体验 ID{' '}
        <select
          value={manifest?.experienceId ?? ''}
          onChange={(event) => {
            const id = EXPERIENCE_IDS.find(
              (value) => value === event.target.value,
            );
            if (!id) return;
            const next = createDraftV2Dataset(id);
            setData(next);
            setJson(JSON.stringify(next, null, 2));
            setInteractionId(next.interactions[0]!.interactionId);
            setResponse(null);
            setAcknowledged(false);
          }}
        >
          {EXPERIENCE_IDS.map((id) => (
            <option key={id}>{id}</option>
          ))}
        </select>
      </label>
      <label>
        测试模块{' '}
        <select value={view} onChange={(event) => setView(event.target.value)}>
          <option value="scene">A 地图模块</option>
          <option value="history">B 资料模块</option>
          <option value="renderer">A 沉浸渲染器</option>
          <option value="teaching">B 教学互动</option>
          <option value="equivalent">B 等价图文</option>
        </select>
      </label>
      <button
        disabled={!lastBookmark}
        onClick={() => {
          setCameraBookmark(lastBookmark);
          log('camera.restoreInput', lastBookmark);
        }}
      >
        应用最近相机书签
      </button>
      <button
        onClick={() => {
          setLastBookmark(null);
          setCameraBookmark(null);
        }}
      >
        清除工程书签
      </button>
      <label>
        历史阶段输入{' '}
        <select
          value={phaseId ?? ''}
          onChange={(event) => {
            const id = event.target.value || null;
            setPhaseId(id);
            log('phase.input', id);
          }}
        >
          <option value="">无阶段</option>
          {data.phases.map((phase) => (
            <option key={phase.phaseId} value={phase.phaseId}>
              {phase.title}
            </option>
          ))}
        </select>
      </label>
      <section aria-label="模块测试区">
        <WorkbenchBoundary key={`${view}-${manifest?.experienceId}`}>
          <Suspense fallback={<p>模块加载中</p>}>
            {view === 'scene' &&
              (V2Scene ? (
                <V2Scene {...sceneProps} />
              ) : (
                <>
                  <p>
                    当前使用兼容 v1 地图；A 导出 LongMarchSceneV2
                    后自动接入阶段输入。
                  </p>
                  <Scene.LongMarchScene {...sceneProps} />
                </>
              ))}
            {view === 'history' && (
              <>
                <label>
                  资料对象{' '}
                  <select
                    value={detailKind}
                    onChange={(event) => setDetailKind(event.target.value)}
                  >
                    <option value="event">事件</option>
                    <option value="person">人物</option>
                    <option value="place">地点</option>
                    <option value="topic">专题</option>
                  </select>
                </label>
                {Details && detail ? (
                  <Details
                    detail={detail}
                    sources={data.sources}
                    assets={data.assets}
                    onNavigate={(request) => log('detail.navigate', request)}
                    onClose={() => log('detail.close')}
                  />
                ) : (
                  <>
                    {detailKind !== 'event' && (
                      <p>
                        B 尚未导出
                        HistoricalDetailPanel，当前仅显示兼容事件资料。
                      </p>
                    )}
                    <History.HistoryEventPanel
                      event={data.events[0] ?? null}
                      sources={data.sources}
                      teachingState={{
                        mode: 'teaching_simulation',
                        stepId: null,
                      }}
                      onClose={() => log('detail.close')}
                    />
                  </>
                )}
              </>
            )}
            {view === 'renderer' && (
              <>
                <label>
                  演绎段落{' '}
                  <select
                    value={segmentId}
                    onChange={(event) => setSegmentId(event.target.value)}
                  >
                    {data.segments.map((segment) => (
                      <option key={segment.segmentId} value={segment.segmentId}>
                        {segment.title}
                      </option>
                    ))}
                  </select>
                </label>
                <button onClick={() => setPlaying(!playing)}>
                  {playing ? '暂停工程演绎' : '播放工程演绎'}
                </button>
                {Renderer && manifest ? (
                  <Renderer
                    {...callbacks}
                    manifest={manifest}
                    segments={data.segments}
                    assets={data.assets}
                    command={{
                      runId: `workbench-${manifest.experienceId}`,
                      segmentId,
                      playback: playing ? 'playing' : 'paused',
                      muted: true,
                      quality: 'low',
                      reducedMotion: true,
                    }}
                    cameraBookmark={cameraBookmark}
                  />
                ) : (
                  <p>
                    A 尚未导出 ImmersiveExperienceRenderer；回调类型已可使用。
                  </p>
                )}
              </>
            )}
            {view === 'equivalent' &&
              (Equivalent && data.fallbackContents[0] ? (
                <Equivalent
                  content={data.fallbackContents[0]}
                  activeStepId={
                    data.fallbackContents[0].steps.find(
                      (step) => step.segmentId === segmentId,
                    )?.stepId ?? null
                  }
                  onStepViewed={(id) => log('equivalent.stepViewed', id)}
                />
              ) : (
                <p>B 尚未导出 EquivalentExperience；等价内容结构已可校验。</p>
              ))}
            {view === 'teaching' && (
              <>
                <label>
                  互动输入{' '}
                  <select
                    value={interaction?.interactionId ?? ''}
                    onChange={(event) => {
                      setInteractionId(event.target.value);
                      setResponse(null);
                      setAcknowledged(false);
                    }}
                  >
                    {data.interactions.map((item) => (
                      <option key={item.interactionId}>
                        {item.interactionId}
                      </option>
                    ))}
                  </select>
                </label>
                {Teaching && interaction ? (
                  <Teaching
                    interaction={interaction}
                    response={response}
                    explanationAcknowledged={acknowledged}
                    onResponse={(id, value) => {
                      const parsed = interactionResponseSchema.safeParse(value);
                      if (id === interaction.interactionId && parsed.success)
                        setResponse(parsed.data);
                      log('interaction.response', {
                        id,
                        value,
                        valid: parsed.success,
                      });
                    }}
                    onExplanationAcknowledged={(id) => {
                      if (id === interaction.interactionId)
                        setAcknowledged(true);
                      log('explanation.acknowledged', id);
                    }}
                  />
                ) : (
                  <p>B 尚未导出 TeachingInteraction；本页可先检查题目 JSON。</p>
                )}
              </>
            )}
          </Suspense>
        </WorkbenchBoundary>
      </section>
      <details>
        <summary>编辑工程输入（不会写入正式数据）</summary>
        <label>
          v1/v2 数据 JSON
          <textarea
            rows={16}
            value={json}
            onChange={(event) => setJson(event.target.value)}
          />
        </label>
        <button
          onClick={() => {
            try {
              const next = normalizeDataset(validateDataset(JSON.parse(json)));
              const audited = Object.entries(next).some(
                ([key, records]) =>
                  key !== 'schemaVersion' &&
                  (
                    records as {
                      reviewStatus: string;
                      releaseStatus: string;
                      reviews: unknown[];
                    }[]
                  ).some(
                    (record) =>
                      record.reviewStatus !== 'draft' ||
                      record.releaseStatus !== 'unpublished' ||
                      record.reviews.length > 0,
                  ),
              );
              if (audited)
                throw new Error(
                  '工作台只接受 draft + unpublished 且无签署的工程样本',
                );
              setData(next);
              setMessage('结构与关联校验通过；仍为未发布工程样本。');
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : String(error),
              );
            }
          }}
        >
          验证并应用工程输入
        </button>
      </details>
      <p role="status">{message}</p>
      <h2>回调记录</h2>
      <button onClick={() => setLogs([])}>清空日志</button>
      <pre aria-label="回调日志">{logs.join('\n')}</pre>
    </main>
  );
}
