import { useEffect } from 'react';
import type { LongMarchSceneProps } from '../../shared/contracts';

/** Integration placeholder only. Member A replaces this file behind the same public export. */
export function LongMarchScene({ events, onSceneReady }: LongMarchSceneProps) {
  useEffect(() => {
    onSceneReady();
  }, [onSceneReady]);

  return (
    <div
      className="scene-placeholder"
      aria-label="抽象沙盘占位，不代表真实地形或历史路线"
    >
      <div className="abstract-stage" aria-hidden="true">
        <div className="stage-shadow" />
        <div className="stage-base stage-base-bottom" />
        <div className="stage-base stage-base-top">
          <div className="stage-grid" />
        </div>
        <div className="stage-center">
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="stage-caption">
        <span className="status-dot" />
        {events.length
          ? '核验数据已就绪，三维场景等待接入'
          : '场景预留区 · 抽象几何示意'}
      </div>
    </div>
  );
}
