import { useState } from 'react';
import { ChevronDown, Flag, BookOpen } from 'lucide-react';
import {
  campaignBeat,
  campaignSourceList,
} from '../../shared/content/chishui-campaign';
import './campaign-narration.css';
export function CampaignNarration({
  chapterId,
  progress,
  onBeat,
  onSources,
  onRead,
}: {
  chapterId: string;
  progress: number;
  onBeat(index: number): void;
  onSources(ids: string[]): void;
  onRead?(): void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const frame = campaignBeat(chapterId, progress);
  if (!frame) return null;
  const { chapter, beat, index } = frame;
  return (
    <aside
      className="campaign-narration"
      data-map-obstacle="true"
      aria-label="四渡赤水战况讲解"
      data-collapsed={collapsed}
    >
      <button
        className="campaign-heading"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
      >
        <Flag size={15} />
        <strong>{chapter.title}</strong>
        <ChevronDown size={15} />
      </button>
      {!collapsed && (
        <>
          <nav aria-label="战况讲解步骤">
            {['敌情与困境', '红军应对', '转机与意义'].map((text, i) => (
              <button
                aria-pressed={index === i}
                key={text}
                onClick={() => onBeat(i)}
              >
                <span>0{i + 1}</span>
                {text}
              </button>
            ))}
          </nav>
          <section aria-live="polite" className="campaign-beat">
            <time>{beat.date}</time>
            <h3>{beat.title}</h3>
            <dl>
              <div>
                <dt>敌情</dt>
                <dd>{beat.threat}</dd>
              </div>
              <div>
                <dt>应对</dt>
                <dd>{beat.response}</dd>
              </div>
              <div>
                <dt>意义</dt>
                <dd>{beat.significance}</dd>
              </div>
            </dl>
          </section>
          <div className="campaign-key">
            <span>
              <i />
              红军行动
            </span>
            <span>
              <i />
              敌军追堵 / 增援
            </span>
          </div>
          <p className="campaign-disclosure">
            方向示意，不是精确行军道路；虚线情报不等于已执行调动。
          </p>
          <button
            className="campaign-sources"
            onClick={() =>
              onSources(campaignSourceList(beat.sourceKeys).map((s) => s.id))
            }
          >
            <BookOpen size={13} />
            本段史料依据
          </button>
          {onRead && (
            <button className="campaign-sources" onClick={onRead}>
              阅读本幕史事
            </button>
          )}
        </>
      )}
    </aside>
  );
}
