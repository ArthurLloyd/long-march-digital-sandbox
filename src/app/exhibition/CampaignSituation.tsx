import { useId, useState } from 'react';
import { ChevronDown, ArrowUpRight, Flag, X } from 'lucide-react';
import {
  YUDU_FORMATIONS,
  type CampaignResearch,
  type CampaignSituation as Situation,
} from './campaign-situations';
import '../../styles/campaign-situation.css';

type Point = readonly [number, number];
function curve(a: Point, b: Point, bend: number, t: number) {
  const c: Point = [(a[0] + b[0]) / 2 + bend, (a[1] + b[1]) / 2];
  return {
    x: (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0],
    y: (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1],
    angle:
      (Math.atan2(
        (1 - t) * (c[1] - a[1]) + t * (b[1] - c[1]),
        (1 - t) * (c[0] - a[0]) + t * (b[0] - c[0]),
      ) *
        180) /
      Math.PI,
    path: `M ${a.join(' ')} Q ${c.join(' ')} ${b.join(' ')}`,
  };
}
/** Abstract graphic coordinates only, never geographic vertices. Progress is
 * sampled from C2, so seek/pause/replay govern every arrow without a new clock. */
function Flow({
  a,
  b,
  bend = 0,
  progress,
  camp = 'blue',
}: {
  a: Point;
  b: Point;
  bend?: number;
  progress: number;
  camp?: 'red' | 'blue';
}) {
  const p = curve(a, b, bend, Math.max(0, Math.min(1, progress)));
  return (
    <g className={`campaign-flow campaign-flow--${camp}`}>
      <path d={p.path} className="campaign-flow-line" />
      <path
        d="M 9 0 L -8 -4 L -4 0 L -8 4 Z"
        className="campaign-flow-arrow"
        transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`}
      />
    </g>
  );
}
function SituationDiagram({
  situation,
  progress,
}: {
  situation: Situation;
  progress: number;
}) {
  const heading = useId();
  const assembly = situation.kind === 'assembly';
  return (
    <svg
      viewBox={`0 0 360 ${assembly ? 245 : 186}`}
      role="img"
      aria-labelledby={heading}
    >
      <title id={heading}>
        {assembly
          ? '中央红军五个军团与两个机关纵队分批向于都汇聚的关系示意，不表示地理路线'
          : `${situation.title}：${situation.actions.map((a) => `${a.unit}${a.action}`).join('；')}。非比例战局关系示意`}
      </title>
      <g className="campaign-landscape" aria-hidden="true">
        <path d="M 8 154 L 56 94 L 90 123 L 138 63 L 182 130 L 220 88 L 270 128 L 306 71 L 352 144" />
        <path d="M 10 168 L 70 124 L 112 148 L 161 104 L 204 154 L 253 118 L 298 142 L 350 110" />
      </g>
      {situation.kind === 'river' && (
        <path
          className="campaign-river"
          d="M 220 -10 C 175 44 248 73 216 106 S 190 148 219 192"
        />
      )}
      {assembly ? (
        <>
          {YUDU_FORMATIONS.map((unit, i) => {
            const a: Point = [
              i < 5 ? 60 : 294,
              i < 5 ? 22 + i * 43 : 52 + (i - 5) * 104,
            ];
            return (
              <g key={unit}>
                <text
                  x={a[0]}
                  y={a[1]}
                  textAnchor="middle"
                  className="campaign-unit-text"
                >
                  {unit}
                </text>
                <Flow
                  a={[a[0] + (i < 5 ? 25 : -25), a[1] + 4]}
                  b={[184, 132]}
                  bend={i < 5 ? 20 : -15}
                  progress={progress}
                  camp="red"
                />
              </g>
            );
          })}
          <circle cx="184" cy="132" r="18" className="campaign-hub" />
          <text
            x="184"
            y="137"
            textAnchor="middle"
            className="campaign-hub-text"
          >
            于都
          </text>
          <Flow
            a={[184, 154]}
            b={[184, 222]}
            progress={Math.max(0, (progress - 0.65) / 0.35)}
            camp="red"
          />
          <text x="211" y="216" className="campaign-unit-text">
            分批渡河
          </text>
        </>
      ) : (
        <>
          <Flow
            a={[45, 140]}
            b={situation.kind === 'turn' ? [122, 40] : [301, 140]}
            bend={situation.kind === 'turn' ? -40 : 8}
            progress={progress}
            camp="red"
          />
          <text x="12" y="179" className="campaign-red-text">
            {situation.red}
          </text>
          {situation.actions.map((a, i) => {
            const from: Point =
              situation.actions.length === 1
                ? [257, 20]
                : i === 0
                  ? [104, 22]
                  : i === 1
                    ? [288, 22]
                    : [326, 98];
            const to: Point =
              i === 0 ? [149, 112] : i === 1 ? [247, 109] : [271, 136];
            return (
              <g key={a.unit}>
                <Flow
                  a={from}
                  b={to}
                  bend={i === 1 ? 15 : -12}
                  progress={progress}
                />
                {a.kind === 'block' && (
                  <path
                    className="campaign-blockade"
                    d={`M ${to[0] - 20} ${to[1] + 4} l 40 0 m -30 -5 v 10 m 10 -10 v 10 m 10 -10 v 10`}
                  />
                )}
                <text
                  x={from[0]}
                  y={from[1] - 7}
                  textAnchor="middle"
                  className="campaign-enemy-text"
                >
                  {a.unit}
                </text>
              </g>
            );
          })}
        </>
      )}
    </svg>
  );
}

export function CampaignSituation({
  research,
  chapterId,
  progress,
}: {
  research: CampaignResearch;
  chapterId: string;
  progress: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showSources, setShowSources] = useState(false);
  const panel = useId();
  const situation = research.stages.find((s) =>
    s.chapterIds.includes(chapterId),
  );
  if (!situation) return null;
  return (
    <aside
      className="campaign-situation"
      aria-label="本章战局关系"
      data-map-obstacle="true"
      data-campaign={situation.id}
    >
      <button
        className="campaign-toggle"
        aria-expanded={expanded}
        aria-controls={panel}
        onClick={() => setExpanded(!expanded)}
      >
        <Flag size={15} />
        <span>{situation.title}</span>
        <ChevronDown size={16} />
      </button>
      <div id={panel} hidden={!expanded} className="campaign-body">
        <div className="campaign-caption">
          <time>{situation.period}</time>
          <span>战局关系 · 非比例示意</span>
        </div>
        <SituationDiagram situation={situation} progress={progress} />
        <div className="campaign-actions">
          {situation.actions.map((a) => (
            <p key={a.unit}>
              <span>{a.unit}</span>
              {a.action}
            </p>
          ))}
        </div>
        <p className="campaign-summary">{situation.summary}</p>
        <button
          className="campaign-source-toggle"
          aria-expanded={showSources}
          onClick={() => setShowSources(!showSources)}
        >
          {showSources ? <X size={12} /> : <ArrowUpRight size={12} />}史料依据
        </button>
        {showSources && (
          <ul className="campaign-sources">
            {situation.sourceIds.map((id) => {
              const source = research.sources[id]!;
              return (
                <li key={id}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                    <ArrowUpRight size={12} />
                  </a>
                  <p>
                    {source.publisher} · {source.supports}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
