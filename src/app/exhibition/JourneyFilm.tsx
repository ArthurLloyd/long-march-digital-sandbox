import { BookOpen } from 'lucide-react';
import {
  cueIndex,
  crossingSeals,
  subtitleAt,
  type Cue,
} from '../../shared/content/journey-screenplay';
import type { CampaignSituation } from './campaign-situations';
import './journey-film.css';

const shotNames = {
  wide: '区域全景',
  advance: '行动',
  detail: '现场',
  resolve: '回望',
};
// Editorial summaries keyed to the titled shots in the supplied reference.
const notes: Record<
  string,
  readonly [string, string, 'red' | 'blue' | 'gold']
> = {
  北渡长江: ['行动计划', '寻机北渡，与红四方面军会合', 'red'],
  '川军增援 · 战斗陷入僵持': ['敌情修正', '一万余人，且仍有增援', 'blue'],
  撤出战斗: ['中央军委 · 决定', '脱离接触，西渡赤水', 'red'],
  长江沿岸布防: ['川军 · 部署', '沿江防堵，北渡受阻', 'blue'],
  向扎西集中: [
    '调动情报',
    '有范子英旅拟由叙永开往古蔺的消息，行程未获证实',
    'blue',
  ],
  掉头向东: ['中央军委 · 决定', '回师黔北，寻找战机', 'red'],
  重占遵义: [
    '战果 · 参考片解说',
    '击溃和歼灭两个师又八个团，俘敌约三千人',
    'gold',
  ],
  古蔺方向: ['红军 · 佯动', '一部继续向古蔺方向行动', 'red'],
  追兵压向河西: ['追兵 · 调动', '追堵兵力向河西集中', 'blue'],
  佯动与折返: ['红军 · 行动', '一部继续佯动，主力折返东渡', 'red'],
  贵阳方向: ['滇军 · 调动', '孙渡纵队驰援贵阳', 'blue'],
  调动滇军: ['滇军 · 命令', '孙渡纵队奉命回援昆明', 'blue'],
  皎平渡: ['渡江 · 参考片解说', '七只小船，七天七夜', 'gold'],
};
export function JourneyFilm({
  id,
  title,
  date,
  cues,
  situation,
  progress,
  onSeek,
  onRead,
}: {
  id: string;
  title: string;
  date: string;
  cues: readonly Cue[];
  situation?: CampaignSituation;
  progress: number;
  onSeek(start: number): void;
  onRead(): void;
}) {
  const index = cueIndex(cues, progress);
  const [, shot, heading, caption, dateLabel, original, placement] =
    cues[index]!;
  const crossing = Number(id.match(/event-sd-([1-4])$/)?.[1] ?? 0);
  const forces = id === 'chapter-event-sd' && index === 0;
  const crossed =
    crossing && progress + 1e-8 >= crossingSeals[crossing - 1]!.at
      ? crossing
      : crossing - 1;
  const note = notes[heading];
  const opposing =
    !note && !forces && crossing === 0 && index === 0
      ? (situation?.actions ?? [])
      : [];
  const pursuit = id === 'chapter-ex-event-xiangjiang' && index === 1;
  const following = cues[index + 1];
  const annotation =
    placement === 'annotation'
      ? caption
      : following?.[6] === 'annotation'
        ? following[3]
        : null;
  const start = cues[index]![0];
  const captionParts = subtitleAt(
    caption,
    (progress - start) / ((cues[index + 1]?.[0] ?? 1) - start),
  ).split(
    /(赤水河|金沙江|皎平渡|青杠坡|土城|茅台|太平渡|二郎滩|遵义|扎西|贵阳|昆明|古蔺|娄山关|夹金山|泸定桥|于都河)/u,
  );
  return (
    <>
      <aside
        className="film-card"
        data-shot={shot}
        data-tone={
          note?.[2] ??
          (opposing.length ? 'blue' : shot === 'advance' ? 'red' : 'gold')
        }
        aria-label="本幕讲解"
        data-map-obstacle="true"
      >
        <header>
          <span>{title}</span>
          <time>{dateLabel ?? date}</time>
        </header>
        <section key={id + index}>
          <small>
            {shotNames[shot]} · {String(index + 1).padStart(2, '0')} /{' '}
            {String(cues.length).padStart(2, '0')}
          </small>
          <h3>{heading}</h3>
          {annotation && <p className="film-annotation">{annotation}</p>}
          {original && <del>{original}</del>}
          {note && (
            <p className="film-annotation">
              <b>{note[0]}</b>
              {note[1]}
            </p>
          )}
          {opposing.length > 0 && (
            <dl className="film-dispositions" aria-label="同期战局">
              {opposing.map((a) => (
                <div key={a.unit + a.action}>
                  <dt>{a.unit}</dt>
                  <dd>{a.action}</dd>
                </div>
              ))}
            </dl>
          )}
          {pursuit && (
            <p className="film-annotation">
              <b>湘军 · 两路追击</b>
              一路从嘉禾向宁远，一路由临武经江华向永明。兴安、全州一带的堵截另用驻防标记表示。
            </p>
          )}
          {forces && (
            <div className="film-forces">
              <span>
                中央红军<strong>约3万</strong>
              </span>
              <span>
                国民党军<strong>约40万</strong>
              </span>
            </div>
          )}
          {forces && <small>兵力对比 · 参考片解说</small>}
          {(crossing > 0 ||
            id === 'chapter-event-sd' ||
            id === 'chapter-event-js') && (
            <div className="film-map-key" aria-label="行军图例">
              <span data-ink="river">
                {id === 'chapter-event-js'
                  ? index < 2
                    ? '乌江'
                    : '金沙江'
                  : '赤水河'}
              </span>
              <span data-ink="red">红军</span>
              <span data-ink="blue">追堵</span>
              {(heading === '古蔺方向' ||
                heading === '追兵压向河西' ||
                crossing === 4) && <span data-ink="feint">佯动</span>}
            </div>
          )}
          {crossing > 0 && (
            <div
              className="film-crossings"
              aria-label={`赤水河第${crossing}渡`}
            >
              {['一渡', '二渡', '三渡', '四渡'].map((name, i) => (
                <span
                  key={name}
                  data-current={i + 1 === crossed && i + 1 === crossing}
                  data-past={i + 1 <= crossed && i + 1 !== crossing}
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </section>
        <footer>
          <nav aria-label="本章镜头">
            {cues.map(([at], i) => (
              <button
                type="button"
                key={at}
                aria-current={i === index ? 'step' : undefined}
                aria-label={`转到镜头${i + 1}：${cues[i]![2]}`}
                onClick={() => onSeek(at)}
              />
            ))}
          </nav>
          <button onClick={onRead}>
            <BookOpen size={13} /> 史事
          </button>
        </footer>
      </aside>
      {placement !== 'annotation' && (
        <p
          className="film-caption"
          data-map-obstacle="true"
          key={id + ':' + index}
        >
          {captionParts.map((part, i) =>
            i % 2 ? <em key={i}>{part}</em> : part,
          )}
        </p>
      )}
    </>
  );
}
