import { useEffect, useRef, useState } from 'react';
import { createPanorama } from './panorama';

/** Reuses A's AI environment paintings. No historical run or completion events. */
export function PanoramaObservation({
  kind,
  onClose,
}: {
  kind: 'snow' | 'grass';
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    host = useRef<HTMLDivElement>(null),
    api = useRef<ReturnType<typeof createPanorama> | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const title = kind === 'snow' ? '雪岭微光' : '草地回声';
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    let live = true;
    try {
      const panorama = createPanorama(host.current!);
      api.current = panorama;
      void panorama
        .load(
          `${import.meta.env.BASE_URL}assets/textures/immersive-landscapes/${kind === 'snow' ? 'snow-pass' : 'grassland'}.webp`,
        )
        .then((loaded) => {
          if (live && loaded) setStatus('ready');
        })
        .catch(() => {
          if (live) setStatus('error');
        });
    } catch {
      queueMicrotask(() => {
        if (live) setStatus('error');
      });
    }
    return () => {
      live = false;
      api.current?.dispose();
      api.current = null;
      element?.close();
    };
  }, [kind]);
  return (
    <dialog
      className="atlas-observation atlas-panorama"
      ref={dialog}
      aria-label={`${title}环境画卷`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="atlas-observation-canvas" ref={host} />
      <div className="atlas-panorama-shade" aria-hidden="true" />
      <header>
        <button onClick={onClose}>← 返回地图</button>
        <span>山河纪行 / 环境画卷</span>
        <small>AI 环境意象</small>
      </header>
      <div className="atlas-observation-title">
        <small>山河之间 / 自由环顾</small>
        <h2>{title}</h2>
        <p>
          {kind === 'snow'
            ? '望雪脊与云海，见天地之辽阔。'
            : '望水泽与远山，见旷野之绵延。'}
        </p>
      </div>
      <nav aria-label="环境画卷视角">
        <button
          disabled={status !== 'ready'}
          onClick={() => api.current?.focus()}
        >
          自由环顾
        </button>
        <button
          disabled={status !== 'ready'}
          onClick={() => api.current?.zoom(-8)}
        >
          拉近细看
        </button>
        <button
          disabled={status !== 'ready'}
          onClick={() => api.current?.zoom(8)}
        >
          展开视野
        </button>
        <button
          disabled={status !== 'ready'}
          onClick={() => api.current?.home()}
        >
          回到初景
        </button>
      </nav>
      <details className="atlas-panorama-about">
        <summary>关于画卷</summary>
        <p>
          复用本项目 MiniMax Design 生成的环境图，可拖动环顾、滚轮缩放。属于 AI
          艺术意象，并非真实历史地点或实景照片；背面接缝仍需精修。
        </p>
      </details>
      <p className="atlas-panorama-operation">拖动环顾 · 滚轮远近 · Esc 返回</p>
      {status === 'loading' && (
        <p className="atlas-panorama-loading" role="status">
          展开山河画卷…
        </p>
      )}
      {status === 'error' && (
        <p className="atlas-error" role="alert">
          画卷暂未加载成功，请返回地图后重试。
        </p>
      )}
    </dialog>
  );
}
