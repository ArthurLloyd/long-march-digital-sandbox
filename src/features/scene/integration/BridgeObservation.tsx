import { useEffect, useRef, useState } from 'react';
import { createBridgeStudy } from '../prototype/bridge-renderer';

/** A local structure study within the map; never a historical C1 completion route. */
export function BridgeObservation({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    host = useRef<HTMLDivElement>(null),
    api = useRef<ReturnType<typeof createBridgeStudy> | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState(0);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    let disposed = false;
    try {
      api.current = createBridgeStudy(host.current!, {
        showCompany: true,
        reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        onFrame: () => {},
        onMetrics: () => {},
        onError: (message) => {
          if (!disposed) setError(message);
        },
      });
      api.current.setTime(30);
      api.current.pose(0);
    } catch {
      queueMicrotask(() => {
        if (!disposed) setError('三维画面暂不可用，请返回地图后重试。');
      });
    }
    return () => {
      disposed = true;
      api.current?.dispose();
      api.current = null;
      element?.close();
    };
  }, []);
  return (
    <dialog
      className="atlas-observation"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label="桥谷结构观察"
    >
      <div className="atlas-observation-canvas" ref={host} />
      <header>
        <button onClick={onClose}>← 返回总地图</button>
        <span>山河之间 / 桥谷构造</span>
        <small>艺术空间 · 代表性白模</small>
      </header>
      <div className="atlas-observation-title">
        <small>山河纪行 / 局部观察</small>
        <h2>峡谷与桥</h2>
        <p>观两岸山势，辨桥索结构。</p>
      </div>
      <nav aria-label="桥谷观察视角">
        <button
          aria-pressed={view === 0}
          onClick={() => {
            setView(0);
            api.current?.pose(0);
          }}
        >
          远望山河
        </button>
        <button
          aria-pressed={view === 1}
          onClick={() => {
            setView(1);
            api.current?.focusSpot('bridge');
          }}
        >
          桥索与石壁
        </button>
        <button
          aria-pressed={view === 2}
          onClick={() => {
            setView(2);
            api.current?.focusCompany();
          }}
        >
          近看编队
        </button>
        <button
          aria-pressed={view === 3}
          onClick={() => {
            setView(3);
            api.current?.pose(3);
          }}
        >
          回望来路
        </button>
      </nav>
      <p className="atlas-observation-note">
        原有三维素材的结构观察，不表示历史桥板状态、人物数量或行军位置。
      </p>
      {error && (
        <p className="atlas-error" role="alert">
          {error}
        </p>
      )}
    </dialog>
  );
}
