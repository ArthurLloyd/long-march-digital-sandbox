import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import type { LongMarchSceneProps, SceneError } from '../../shared/contracts';
import { HISTORY_EMPTY_MESSAGE } from '../../shared/constants/messages';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { MountainArtwork } from '../exhibition/MountainArtwork';

const LongMarchScene = lazy(() =>
  import('../../features/scene').then((module) => ({
    default: module.LongMarchScene,
  })),
);
interface Props extends LongMarchSceneProps {
  error: SceneError | null;
  onRetry: () => void;
  ready: boolean;
  renderScene?: (props: LongMarchSceneProps) => ReactNode;
}
export function SceneViewport({
  error,
  onRetry,
  ready,
  renderScene,
  ...sceneProps
}: Props) {
  const { onSceneError } = sceneProps;
  useEffect(() => {
    if (ready || error) return;
    const timer = window.setTimeout(
      () =>
        onSceneError({
          code: 'asset_load_failed',
          message: '场景加载时间较长，请重试。文字资料仍可阅读。',
        }),
      15000,
    );
    return () => window.clearTimeout(timer);
  }, [ready, error, onSceneError]);
  return (
    <section
      className="scene-viewport"
      aria-label="三维沙盘场景"
      aria-busy={!ready && !error}
    >
      <MountainArtwork compact />
      {!sceneProps.events.length && (
        <div className="verification-message" role="status">
          <h1>
            山河之间，
            <br />
            等待历史的回响。
          </h1>
          <p>{HISTORY_EMPTY_MESSAGE}</p>
        </div>
      )}
      {error ? (
        <div className="scene-state" role="alert">
          <h2>
            {error.code === 'webgl_unavailable'
              ? '当前浏览器无法显示三维场景'
              : '场景暂时无法加载'}
          </h2>
          <p>{error.message}</p>
          <button className="outlined-button" onClick={onRetry}>
            重试场景
          </button>
        </div>
      ) : (
        <div className="scene-module">
          <ErrorBoundary
            onRetry={onRetry}
            onError={() =>
              sceneProps.onSceneError({
                code: 'render_failed',
                message: '场景渲染中断，您可以重试或继续查看资料。',
              })
            }
          >
            <Suspense
              fallback={
                <div className="scene-state" role="status">
                  <span className="loading-line" />
                  <h2>正在准备山河视野</h2>
                  <p>场景加载中，您仍可打开资料与使用说明。</p>
                </div>
              }
            >
              {renderScene ? (
                renderScene(sceneProps)
              ) : (
                <LongMarchScene {...sceneProps} />
              )}
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      <p className="scene-status" role="status">
        <span className="status-dot" />
        {error
          ? '场景异常 · 文字资料可继续阅读'
          : ready
            ? '预览已就绪'
            : '场景准备中'}
      </p>
    </section>
  );
}
