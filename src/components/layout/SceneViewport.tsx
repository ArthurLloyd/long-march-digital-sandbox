import { lazy, Suspense } from 'react';
import type { LongMarchSceneProps, SceneError } from '../../shared/contracts';
import { HISTORY_EMPTY_MESSAGE } from '../../shared/constants/messages';
import { ErrorBoundary } from '../ui/ErrorBoundary';

const LongMarchScene = lazy(() =>
  import('../../features/scene').then((module) => ({
    default: module.LongMarchScene,
  })),
);

interface Props extends LongMarchSceneProps {
  error: SceneError | null;
  onRetry: () => void;
  ready: boolean;
}

export function SceneViewport({ error, onRetry, ready, ...sceneProps }: Props) {
  return (
    <section
      className="scene-viewport"
      aria-label="三维沙盘场景"
      aria-busy={!ready && !error}
    >
      <div className="scene-heading">
        <span className="preview-label">开发预览</span>
      </div>
      <div className="scene-intro">
        <h1>
          长征<span>不灭的火种</span>
        </h1>
        <p>循历史的足迹，理解不灭的精神。</p>
      </div>
      {error ? (
        <div className="scene-state" role="alert">
          <h3>场景暂时无法加载</h3>
          <p>{error.message}</p>
          <button className="text-button" onClick={onRetry}>
            重试场景
          </button>
        </div>
      ) : (
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="scene-state" role="status">
                正在准备场景容器…
              </div>
            }
          >
            <LongMarchScene {...sceneProps} />
          </Suspense>
        </ErrorBoundary>
      )}
      {!sceneProps.events.length && (
        <div className="verification-message" role="status">
          <span className="verification-line" />
          <p>{HISTORY_EMPTY_MESSAGE}</p>
          <small>当前画面仅为抽象布局示意，不含真实地形与行军路线。</small>
        </div>
      )}
      <div className="scene-footnote">
        <span>史实为本 · 证据可溯</span>
        <span>{error ? '场景异常' : ready ? '预览已就绪' : '场景准备中'}</span>
      </div>
    </section>
  );
}
