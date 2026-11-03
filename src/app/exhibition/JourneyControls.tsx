import {
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Compass,
  Navigation,
  ArrowLeft,
} from 'lucide-react';
import {
  journeyChapters,
  journeyDuration,
  sampleJourney,
  type JourneyTransport,
  type JourneyState,
  type JourneyCamera,
} from '../../features/timeline';
export function JourneyControls({
  transport: t,
  state,
  onBrowse,
  onFullExperience,
  onOrigin,
  onInteraction,
  onNavigate,
  onSample,
  onDefaultView,
}: {
  transport: JourneyTransport;
  state: JourneyState;
  onBrowse: () => void;
  onFullExperience: () => void;
  onOrigin: () => void;
  onInteraction: () => void;
  onNavigate: () => void;
  onSample: () => void;
  onDefaultView: () => void;
}) {
  const chapters = journeyChapters(t.plan, state.sequenceId),
    total = journeyDuration(t.plan, state.sequenceId),
    current = sampleJourney(t.plan, state.sequenceId, state.time),
    index = chapters.findIndex((c) => c.id === current.chapter?.id);
  const jump = (delta: number) => {
    const chapter = chapters[index + delta];
    if (chapter) {
      onNavigate();
      t.camera('follow');
      t.seek(chapter.start);
    }
  };
  return (
    <>
      <nav
        className="journey-mode-entries"
        aria-label="展馆体验方式"
        data-map-obstacle="true"
      >
        <button onClick={onOrigin}>
          <ArrowLeft size={15} />
          瑞金开篇
        </button>
        <button onClick={onBrowse}>自由探索</button>
        <button onClick={onFullExperience}>完整互动体验</button>
        <button onClick={onSample}>四渡赤水行军</button>
      </nav>
      <section
        className="journey-controls"
        aria-label="统一行军控制"
        data-map-obstacle="true"
        onClickCapture={onInteraction}
        onChangeCapture={onInteraction}
      >
        <div className="journey-transport-buttons">
          <button
            aria-label="上一行军章节"
            disabled={index <= 0}
            onClick={() => jump(-1)}
          >
            <SkipBack size={19} />
          </button>
          <button
            className="journey-play"
            aria-label={state.playing ? '暂停行军' : '开始或继续行军'}
            onClick={() => {
              if (state.playing) t.pause();
              else {
                t.play();
              }
            }}
          >
            {state.playing ? <Pause size={23} /> : <Play size={23} />}
          </button>
          <button
            aria-label="下一行军章节"
            disabled={index >= chapters.length - 1}
            onClick={() => jump(1)}
          >
            <SkipForward size={19} />
          </button>
          <button aria-label="重新开始本轮行军" onClick={t.restart}>
            <RotateCcw size={17} />
          </button>
        </div>
        <div className="journey-progress">
          <div className="journey-current">
            <strong>{current.chapter?.title ?? '瑞金开篇'}</strong>
            <time>{current.chapter?.dateText}</time>
            <span>
              {current.stage !== 'local'
                ? '跨区战略示意 · 非历史道路'
                : current.transition
                  ? '章节转场 · 暂无区间路线'
                  : '战略方向示意 · 非历史道路'}
            </span>
          </div>
          <input
            aria-label="行军演示进度"
            type="range"
            min={0}
            max={total}
            step={0.1}
            value={state.time}
            onChange={(e) => {
              onNavigate();
              t.seek(Number(e.target.value));
            }}
          />
          <div className="journey-selects">
            <label>
              序列
              <select
                value={state.sequenceId}
                onChange={(e) => {
                  onNavigate();
                  t.camera('follow');
                  t.sequence(e.target.value);
                }}
              >
                {t.plan.sequences.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              章节
              <select
                aria-label="跳转行军章节"
                value={current.chapter?.id ?? ''}
                onChange={(e) => {
                  const c = chapters.find((c) => c.id === e.target.value);
                  if (c) {
                    onNavigate();
                    t.camera('follow');
                    t.seek(c.start);
                  }
                }}
              >
                {chapters.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              倍速
              <select
                aria-label="行军倍速"
                value={state.speed}
                onChange={(e) => t.speed(Number(e.target.value))}
              >
                {[0.5, 1, 2, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}×
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="journey-camera-controls">
          <nav aria-label="行军镜头模式">
            {(
              [
                ['follow', '随行', Navigation],
                ['free', '自由', Compass],
              ] as const
            ).map(([id, title, Icon]) => (
              <button
                key={id}
                title={
                  id === 'follow'
                    ? '采用区域中远景随行；可自行旋转、缩放后继续跟随'
                    : '保留手动构图；播放时按当前视角随箭头移动'
                }
                aria-pressed={state.camera === id}
                onClick={() => {
                  t.pause();
                  t.camera(id as JourneyCamera);
                  if (id === 'follow') onDefaultView();
                }}
              >
                <Icon size={16} />
                {title}
              </button>
            ))}
          </nav>
          <label>
            观察部队
            <select
              aria-label="当前观察部队"
              value={state.unitId}
              onChange={(e) => t.unit(e.target.value)}
            >
              <option value="central-red">红军主方向</option>
              <option value="red-alternative">红军关联方向</option>
              <option value="nationalist-blockade">国民党军调动情报</option>
            </select>
          </label>
          {state.camera === 'follow' && (
            <label>
              跟随距离
              <input
                aria-label="跟随距离"
                type="range"
                min={0.6}
                max={2}
                step={0.1}
                value={state.distance}
                onChange={(e) => {
                  t.distance(Number(e.target.value));
                  onDefaultView();
                }}
              />
            </label>
          )}
        </div>
      </section>
    </>
  );
}
