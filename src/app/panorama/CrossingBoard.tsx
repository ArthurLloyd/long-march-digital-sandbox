import { useState } from 'react';
import { ENGINEERING_CROSSINGS } from './route-layers';

export function CrossingBoard({
  phaseId,
  red,
  blue,
  onSelect,
}: {
  phaseId: string;
  red: boolean;
  blue: boolean;
  onSelect: (id: string) => void;
}) {
  const [follow, setFollow] = useState(false);
  const current =
    ENGINEERING_CROSSINGS.find((step) => step.phaseId === phaseId) ??
    ENGINEERING_CROSSINGS[0]!;
  const points = (line: readonly (readonly number[])[]) =>
    line.map((point) => point.join(',')).join(' ');
  const head = current.red.at(-1)!;
  return (
    <section className="pan-crossings" aria-label="四渡赤水工程路线机制">
      <div className="pan-section-heading">
        <h3>四渡赤水 · 路线机制</h3>
        <button
          aria-pressed={follow}
          onClick={() => setFollow((value) => !value)}
        >
          {follow ? '恢复示意全览' : '跟随工程队伍'}
        </button>
      </div>
      <p>非地理工程示意，无经纬度；折线不代表真实渡口、行军或围堵轨迹。</p>
      <svg
        viewBox={
          follow ? `${head[0] - 24} ${head[1] - 25} 48 50` : '0 0 100 100'
        }
        role="img"
        aria-label={`${current.label}双阵营线槽和队伍占位，非历史路线`}
      >
        <defs>
          <marker
            id="pan-red-arrow"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0 0L8 4L0 8Z" fill="#d66155" />
          </marker>
          <marker
            id="pan-blue-arrow"
            viewBox="0 0 8 8"
            refX="6"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0 0L8 4L0 8Z" fill="#75b6da" />
          </marker>
        </defs>
        <path
          d="M49 4 L47 23 L52 42 L48 61 L53 80 L50 96"
          fill="none"
          stroke="#87bab8"
          strokeWidth="3"
          opacity=".55"
        />
        {red && (
          <polyline
            points={points(current.red)}
            fill="none"
            stroke="#d66155"
            strokeWidth="1.5"
            strokeDasharray="4 2"
            markerEnd="url(#pan-red-arrow)"
          />
        )}
        {blue && (
          <polyline
            points={points(current.blue)}
            fill="none"
            stroke="#75b6da"
            strokeWidth="1.5"
            strokeDasharray="1 2"
            markerEnd="url(#pan-blue-arrow)"
          />
        )}
        {red &&
          [0, 1, 2].map((index) => (
            <g
              key={index}
              transform={`translate(${head[0] - index * 3} ${head[1] + index * 3})`}
            >
              <circle r="1.2" cy="-2" fill="#f3e2bc" />
              <path
                d="M0 0L-1 4M0 0L2 4M-2 1L2 1"
                stroke="#f3e2bc"
                strokeWidth=".9"
              />
            </g>
          ))}
        <text x="9" y="94" fill="#e7daba" fontSize="4">
          示意水系轴 · 非赤水河几何
        </text>
      </svg>
      <div className="pan-crossing-tabs">
        {ENGINEERING_CROSSINGS.map((step, index) => (
          <button
            key={step.phaseId}
            aria-current={step.phaseId === phaseId ? 'step' : undefined}
            onClick={() => onSelect(step.phaseId)}
          >
            <span>{index + 1}</span>
            {step.label}
            <small>渡口待核</small>
          </button>
        ))}
      </div>
      <p>
        红色虚线：红军图层角色；蓝色点线：国军图层角色。队伍图标只验证近景占位，不表示真实人数或身份。
      </p>
    </section>
  );
}
