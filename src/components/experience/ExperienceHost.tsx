import { Suspense, useEffect, useRef, type RefObject } from 'react';
import { ExhibitionDrawer } from '../overlay/ExhibitionDrawer';
import { SourceContent } from '../overlay/ExhibitionContent';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import type { HistoricalDetail } from '../../shared/contracts';
import type { HistoricalExperienceController } from '../../app/experience/use-historical-experience';
import { completionForState } from '../../app/experience/historical-experience-reducer';
import '../../styles/historical-experience.css';

function detailTitle(detail: HistoricalDetail) {
  const record = detail.record;
  return 'title' in record
    ? record.title
    : 'name' in record
      ? record.name
      : record.historicalName;
}
export function ExperienceHost({
  controller: c,
  returnFocusRef,
}: {
  controller: HistoricalExperienceController;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const { state, modules } = c;
  const run = state.run;
  const route =
    state.route && state.route.status !== 'unavailable' ? state.route : null;
  const segment = run?.bundle.segments[run.index];
  const interaction = run?.bundle.interactions.find(
    (r) => r.interactionId === run.activeInteractionId,
  );
  const progress = interaction
    ? run?.responses[interaction.interactionId]
    : null;
  const bodyHeading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const playCommand = c.rendererProps?.command.playback;
  useEffect(() => {
    const dialog = content.current?.closest('[role="dialog"]');
    if (bodyHeading.current && !bodyHeading.current.closest('[hidden]')) {
      bodyHeading.current.focus();
    } else if (dialog && !dialog.contains(document.activeElement)) {
      // Starting, continuing, or completing can remove the focused button.
      // Keep focus inside the existing drawer without resetting live controls.
      dialog.querySelector<HTMLElement>('h2')?.focus();
    }
  }, [state.status, run?.activeInteractionId]);
  useEffect(() => {
    if (playCommand !== 'playing')
      stage.current
        ?.querySelectorAll('audio,video')
        .forEach((element) => (element as HTMLMediaElement).pause());
  }, [playCommand]);
  useEffect(() => {
    const node = stage.current;
    return () => {
      node
        ?.querySelectorAll('audio,video')
        .forEach((element) => (element as HTMLMediaElement).pause());
    };
  }, [run?.runId]);
  if (state.status === 'idle') return null;
  const Renderer = modules.Renderer,
    Teaching = modules.Teaching,
    Equivalent = modules.Equivalent,
    Details = modules.Details,
    Legacy = modules.LegacyDetails;
  const sources = [
    ...new Set([
      ...(route?.detail.record.sourceIds ?? []),
      ...(route?.bundle?.manifest.sourceIds ?? []),
      ...(segment?.sourceIds ?? []),
      ...(interaction?.sourceIds ?? []),
      ...(interaction && 'materials' in interaction
        ? interaction.materials.flatMap((material) => material.sourceIds)
        : []),
      ...(run?.mode === 'equivalent' ? run.bundle.fallback.sourceIds : []),
    ]),
  ];
  const title = route ? detailTitle(route.detail) : '历史体验';
  const canFinish =
    completionForState(state, new Date().toISOString()) !== null;
  return (
    <ExhibitionDrawer
      title={
        state.status === 'reading' && route?.detail.kind === 'event'
          ? '事件资料'
          : title
      }
      onClose={c.requestExit}
      returnFocusRef={returnFocusRef}
      className={run ? 'experience-drawer' : ''}
    >
      {c.snapshot.notice && (
        <p className="integrity-note" role="status">
          {c.snapshot.notice}
        </p>
      )}
      {state.supplement && (
        <section className="experience-supplement">
          {'source' in state.supplement ? (
            <SourceContent sources={[state.supplement.source]} />
          ) : (
            <>
              <h3>{detailTitle(state.supplement.detail)}</h3>
              <p>
                {'detail' in state.supplement.detail.record
                  ? state.supplement.detail.record.detail
                  : state.supplement.detail.record.summary}
              </p>
            </>
          )}
          <button className="outlined-button" onClick={c.closeSupplement}>
            返回体验
          </button>
        </section>
      )}
      <div ref={content} hidden={state.supplement !== null}>
        {state.status === 'unavailable' && (
          <section role="alert">
            <h3 ref={bodyHeading} tabIndex={-1}>
              暂未开放
            </h3>
            <p>
              {state.route?.status === 'unavailable'
                ? state.route.message
                : '该资料暂不可用。'}
            </p>
            <button className="outlined-button" onClick={c.close}>
              返回沙盘
            </button>
          </section>
        )}
        {state.status === 'intro' && route && (
          <section className="experience-intro">
            <h3 ref={bodyHeading} tabIndex={-1}>
              走进这段历史
            </h3>
            <p>{route.detail.record.summary}</p>
            <p>
              演绎为艺术再现。完成两项互动并确认解释后，可阅读完整资料；随时可返回沙盘。
            </p>
            <div className="experience-actions">
              <button
                className="outlined-button"
                disabled={
                  !modules.Teaching || !modules.Renderer || c.reducedMotion
                }
                onClick={() => c.start()}
              >
                开始体验
              </button>
              <button
                className="outlined-button"
                disabled={!modules.Teaching || !modules.Equivalent}
                onClick={() => c.start('equivalent')}
              >
                开始等价图文体验
              </button>
              <button className="text-button" onClick={c.close}>
                返回沙盘
              </button>
            </div>
            {(!modules.Teaching ||
              (!modules.Renderer && !modules.Equivalent)) && (
              <p role="status">体验呈现和教学模块正在接入，当前不能开始。</p>
            )}
            {c.reducedMotion && <p>已启用减少动态，请选择等价图文体验。</p>}
          </section>
        )}
        {state.status === 'reading' && route && (
          <section className="experience-reading">
            <ErrorBoundary
              title="资料暂时无法加载"
              message="请重试或关闭面板后重新打开资料。"
              className="experience-module-error"
              retryLabel="重新加载资料"
            >
              <Suspense fallback={<p role="status">正在加载资料组件。</p>}>
                {Details ? (
                  <Details
                    detail={route.detail}
                    sources={cSourceList()}
                    assets={c.catalog.published.assets}
                    onNavigate={c.navigate}
                    onClose={c.close}
                  />
                ) : route.detail.kind === 'event' && Legacy ? (
                  <Legacy
                    event={route.detail.record}
                    sources={cSourceList()}
                    teachingState={{ mode: 'observe', stepId: null }}
                    onClose={c.close}
                  />
                ) : (
                  <>
                    <h3>{detailTitle(route.detail)}</h3>
                    <p>
                      {'detail' in route.detail.record
                        ? route.detail.record.detail
                        : route.detail.record.summary}
                    </p>
                  </>
                )}
              </Suspense>
            </ErrorBoundary>
            {route.bundle && (
              <button className="outlined-button" onClick={() => c.start()}>
                重播体验
              </button>
            )}
          </section>
        )}
        {run && (
          <>
            <p className="experience-progress">
              段落 {run.index + 1} / {run.bundle.segments.length} · 互动{' '}
              {run.completed.length} / 2 · 解释确认 {run.acknowledged.length} /
              2
            </p>
            <div
              ref={stage}
              className="experience-stage"
              hidden={
                state.status === 'exit_confirm' || state.status === 'error'
              }
            >
              <ErrorBoundary
                key={run.runId}
                onError={() =>
                  c.rendererProps?.onError({
                    ...run,
                    error: {
                      code: 'render_failed',
                      message: '体验模块加载失败，可以重试或选择等价图文。',
                      retryable: true,
                    },
                  })
                }
              >
                <Suspense
                  fallback={<p role="status">正在加载体验组件，您仍可退出。</p>}
                >
                  {run.mode !== 'equivalent' && Renderer && c.rendererProps && (
                    <Renderer {...c.rendererProps} />
                  )}
                  {run.mode === 'equivalent' && Equivalent && (
                    <Equivalent
                      content={run.bundle.fallback}
                      activeStepId={
                        run.bundle.fallback.steps[run.index]?.stepId ?? null
                      }
                      onStepViewed={c.stepViewed}
                    />
                  )}
                </Suspense>
              </ErrorBoundary>
              {c.subtitles && segment && (
                <p className="experience-subtitles" aria-label="当前段落字幕">
                  {segment.text}
                </p>
              )}
            </div>
            {state.status === 'loading' && (
              <p role="status">
                正在准备体验。加载失败时可以重试或选择等价图文。
              </p>
            )}
            {state.status === 'paused' && (
              <section>
                <h3 ref={bodyHeading} tabIndex={-1}>
                  体验已暂停
                </h3>
                <p>返回后不会跳过段落或互动，请主动继续。</p>
              </section>
            )}
            {state.status === 'awaiting_interaction' &&
              interaction &&
              Teaching && (
                <section className="experience-interaction">
                  <h3 ref={bodyHeading} tabIndex={-1}>
                    观察与思考
                  </h3>
                  <ErrorBoundary
                    key={`${run.runId}-${interaction.interactionId}`}
                    onError={() =>
                      c.rendererProps?.onError({
                        ...run,
                        error: {
                          code: 'render_failed',
                          message: '互动模块加载失败，请重试。',
                          retryable: true,
                        },
                      })
                    }
                  >
                    <Suspense
                      fallback={<p role="status">正在加载教学互动。</p>}
                    >
                      <Teaching
                        interaction={interaction}
                        response={progress?.response ?? null}
                        explanationAcknowledged={run.acknowledged.includes(
                          interaction.interactionId,
                        )}
                        onResponse={c.response}
                        onExplanationAcknowledged={c.acknowledge}
                      />
                    </Suspense>
                  </ErrorBoundary>
                  {progress?.complete ? (
                    <div className="experience-feedback">
                      <p>
                        {progress.correct
                          ? '操作已完成，请阅读史料解释。'
                          : '本次操作与参考答案不同，请阅读解释后继续。'}
                      </p>
                      <p>{interaction.feedback}</p>
                      <p>{interaction.explanation}</p>
                      <button
                        className="outlined-button"
                        disabled={run.acknowledged.includes(
                          interaction.interactionId,
                        )}
                        onClick={() => c.acknowledge(interaction.interactionId)}
                      >
                        确认已阅读解释
                      </button>
                    </div>
                  ) : (
                    <p>请完成规定的材料查看或提交完整操作，再确认解释。</p>
                  )}
                  <button
                    className="outlined-button"
                    disabled={
                      !progress?.complete ||
                      !run.acknowledged.includes(interaction.interactionId)
                    }
                    onClick={c.continueInteraction}
                  >
                    继续主线
                  </button>
                </section>
              )}
            {state.status === 'equivalent_experience' && (
              <div className="experience-actions">
                <button
                  className="outlined-button"
                  disabled={!run.reached}
                  onClick={c.nextStep}
                >
                  下一段
                </button>
              </div>
            )}
            {state.status === 'error' && (
              <section role="alert">
                <h3 ref={bodyHeading} tabIndex={-1}>
                  体验暂时中断
                </h3>
                <p>{state.error?.message}</p>
                <div className="experience-actions">
                  <button
                    className="outlined-button"
                    onClick={() => c.start(run.mode)}
                  >
                    重新开始体验
                  </button>
                  <button
                    className="outlined-button"
                    disabled={!modules.Equivalent || !modules.Teaching}
                    onClick={() => c.start('equivalent')}
                  >
                    改用等价图文体验
                  </button>
                </div>
              </section>
            )}
            {state.status === 'exit_confirm' ? (
              <section className="experience-exit">
                <h3 ref={bodyHeading} tabIndex={-1}>
                  退出本次体验？
                </h3>
                <p>本次未完成的进度不会保存。之前已经完成的记录会保留。</p>
                <button className="outlined-button" onClick={c.exit}>
                  确认退出，返回沙盘
                </button>
                <button className="text-button" onClick={c.cancelExit}>
                  留在体验中
                </button>
              </section>
            ) : (
              <>
                <div className="experience-actions">
                  <button
                    className="text-button"
                    onClick={state.status === 'paused' ? c.resume : c.pause}
                  >
                    {state.status === 'paused' ? '继续体验' : '暂停体验'}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => c.setMuted(!c.muted)}
                  >
                    {c.muted ? '开启声音' : '静音'}
                  </button>
                  <button
                    className="text-button"
                    aria-pressed={c.subtitles}
                    onClick={() => c.setSubtitles(!c.subtitles)}
                  >
                    字幕
                  </button>
                  <button className="text-button" onClick={c.requestExit}>
                    退出体验
                  </button>
                </div>
                <p id="experience-requirements">
                  {run.terminalReached ? '已到达终点。' : '尚未到达终点。'}
                  两项互动及解释确认齐全后，可完成体验。
                </p>
                <button
                  className="outlined-button"
                  disabled={!canFinish}
                  aria-describedby="experience-requirements"
                  onClick={c.complete}
                >
                  完成体验，阅读资料
                </button>
              </>
            )}
          </>
        )}
        {sources.length > 0 && (
          <details className="experience-sources">
            <summary>关联史料</summary>
            {cSourceList().map((source) => (
              <button
                className="text-button"
                key={source.sourceId}
                onClick={() =>
                  c.navigate({ type: 'open_source', sourceId: source.sourceId })
                }
              >
                查看史料：{source.title}
              </button>
            ))}
          </details>
        )}
      </div>
    </ExhibitionDrawer>
  );
  function cSourceList() {
    return c.catalog.published.sources.filter((source) =>
      sources.includes(source.sourceId),
    );
  }
}
