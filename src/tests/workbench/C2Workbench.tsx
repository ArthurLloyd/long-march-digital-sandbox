import { useEffect, useMemo, useState } from 'react';
import { App } from '../../app/App';
import { CompletionStore } from '../../app/experience/experience-completion-service';
import type { LongMarchSceneV2Props } from '../../shared/contracts';
import { simulatePublishedC2 } from '../fixtures/c2-sample';
import { emptyV2 } from '../fixtures/v2-dataset';
import { engineeringModules } from './c1-modules';
import '../../styles/global.css';
import '../../styles/ornaments.css';
import './c2-workbench.css';

export function C2EngineeringMap(props: LongMarchSceneV2Props) {
  const { onSceneReady } = props;
  useEffect(() => onSceneReady(), [onSceneReady]);
  return (
    <section
      className={`c2-map-probe${props.phaseId === null ? ' c2-map-probe-empty' : ''}`}
      aria-label="C2 工程阶段接线"
    >
      <p>工程数据回显，非三维地理图层，坐标不代表真实历史。</p>
      {props.phaseId !== null && (
        <div className="c2-probe-actions">
          <button
            className="outlined-button"
            disabled={!props.events.length}
            onClick={() =>
              props.onObjectSelect({ kind: 'event', id: props.events[0]!.id })
            }
          >
            工程：打开当前阶段事件
          </button>
          <button
            className="outlined-button"
            onClick={() =>
              props.onCameraBookmark({
                sceneId: 'c2-engineering-map',
                coordinateSystem: 'scene-local',
                position: [1, 2, 3],
                target: [0, 0, 0],
                zoom: 1,
                phaseId: props.phaseId,
              })
            }
          >
            工程：保存当前视角
          </button>
        </div>
      )}
      <details>
        <summary>工程输入回显</summary>
        <output aria-label="工程当前阶段">{props.phaseId ?? 'none'}</output>
        <output aria-label="工程当前态势">
          {props.dataset.forceSnapshots.map((s) => s.snapshotId).join(',') ||
            'none'}
        </output>
        <output aria-label="工程当前路线">
          {props.routes.map((r) => r.id).join(',') || 'none'}
        </output>
        <output aria-label="工程地图上下文">
          {JSON.stringify({
            phaseId: props.phaseId,
            selection: props.selection,
            bookmark: props.cameraBookmark,
          })}
        </output>
      </details>
    </section>
  );
}
const modules = { ...engineeringModules, Map: C2EngineeringMap };

export function C2Workbench() {
  const [mode, setMode] = useState('sample');
  const [base] = useState(simulatePublishedC2);
  const input = useMemo(() => {
    if (mode === 'empty') return emptyV2();
    const data = structuredClone(base);
    if (mode === 'withdrawn') data.topics[0]!.releaseStatus = 'unpublished';
    if (mode === 'invalid') data.topics[0]!.phaseIds.reverse();
    return data;
  }, [base, mode]);
  const [store] = useState(
    () =>
      new CompletionStore({
        key: 'long-march.development.c2-completion.v1',
        storage: () => localStorage,
        events: window,
      }),
  );
  return (
    <>
      <aside className="c2-workbench-banner">
        <strong>
          C2 工程联动验证 ·
          专题、日期、坐标、部队及审核结构均为内存模拟，非史实、非真人审核。
        </strong>
        <p>
          阶段回显仅验证接口，未绘制三维地理图层。开发完成记录独立于正式展馆。
        </p>
        <label>
          数据场景{' '}
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="sample">两个工程专题</option>
            <option value="empty">合法空数据</option>
            <option value="withdrawn">撤回工程专题甲</option>
            <option value="invalid">非法阶段顺序</option>
          </select>
        </label>{' '}
        <a href="/__dev/contracts">返回 C0 工作台</a>
      </aside>
      <App input={input} modules={modules} completionStore={store} />
    </>
  );
}
