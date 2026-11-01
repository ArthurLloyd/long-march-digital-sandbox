import {
  CAMP_LABELS,
  FORCE_MODE_LABELS,
  SPATIAL_LABELS,
  forcePrecision,
  type ForcePhaseState,
} from '../../app/history/force-state';

export function ForceLegend({
  state,
  hasV2Renderer,
}: {
  state: ForcePhaseState;
  hasV2Renderer: boolean;
}) {
  return (
    <div className="phase-force-legend">
      <details>
        <summary>
          阶段态势 ·{' '}
          {state.entries.length ? `${state.entries.length} 条资料` : '暂无资料'}
        </summary>
        {!hasV2Renderer && <p>三维阶段图层正在接入，以下为当前可发布资料。</p>}
        {state.entries.length > 0 && (
          <ul>
            {state.entries.map((entry) => (
              <li key={entry.snapshot.snapshotId}>
                <strong>{entry.track.name}</strong>
                <span>
                  {CAMP_LABELS[entry.track.camp]} ·{' '}
                  {FORCE_MODE_LABELS[entry.snapshot.displayMode]} ·{' '}
                  {SPATIAL_LABELS[forcePrecision(entry)]}精度
                </span>
                {entry.route && (
                  <span>
                    {entry.route.name} ·{' '}
                    {entry.route.displayMode === 'dashed'
                      ? '虚线示意'
                      : entry.route.displayMode === 'points'
                        ? '独立地点，不连线'
                        : '已审几何'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p>图标数量与大小不表示真实兵力；展示节奏不代表行军速度。</p>
      </details>
      {!state.entries.length && <p>该阶段暂无可发布的部队态势资料</p>}
    </div>
  );
}
