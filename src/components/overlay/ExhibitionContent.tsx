import { ArrowRight, BookOpen, ShieldCheck } from 'lucide-react';
import type {
  HistoryEvent,
  SourceReference,
  HistoryDatasetV2,
  HistoricalObjectSelection,
} from '../../shared/contracts';
export function ChapterContent({
  events,
  activeId,
  onSelect,
  dataset,
  onObjectSelect,
}: {
  events: readonly HistoryEvent[];
  activeId: string | null;
  onSelect: (id: string) => void;
  dataset?: HistoryDatasetV2;
  onObjectSelect?: (selection: HistoricalObjectSelection) => void;
}) {
  return (
    <>
      {dataset && onObjectSelect && (
        <>
          {dataset.topics.length > 0 && (
            <section>
              <h3>专题</h3>
              {dataset.topics.map((r) => (
                <button
                  className="text-button"
                  key={r.topicId}
                  onClick={() =>
                    onObjectSelect({ kind: 'topic', id: r.topicId })
                  }
                >
                  {r.title}
                </button>
              ))}
            </section>
          )}
          {dataset.people.length > 0 && (
            <section>
              <h3>人物</h3>
              {dataset.people.map((r) => (
                <button
                  className="text-button"
                  key={r.personId}
                  onClick={() =>
                    onObjectSelect({ kind: 'person', id: r.personId })
                  }
                >
                  {r.name}
                </button>
              ))}
            </section>
          )}
          {dataset.places.length > 0 && (
            <section>
              <h3>地点</h3>
              {dataset.places.map((r) => (
                <button
                  className="text-button"
                  key={r.placeId}
                  onClick={() =>
                    onObjectSelect({ kind: 'place', id: r.placeId })
                  }
                >
                  {r.historicalName}
                </button>
              ))}
            </section>
          )}
        </>
      )}
      {events.length ? (
        <ol className="chapter-list">
          {events.map((event) => (
            <li key={event.id}>
              <button
                onClick={() => onSelect(event.id)}
                aria-current={event.id === activeId ? 'step' : undefined}
              >
                <span>
                  <small>{event.dateText}</small>
                  <strong>{event.title}</strong>
                </span>
                <ArrowRight size={18} />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="reading-section">
          <BookOpen className="content-symbol" size={32} />
          <h3>等待一段有据可循的历史</h3>
          <p>历史资料正在核验，正式专题即将开放。</p>
          <p>章节开放后，可在这里选择节点，联动沙盘与历史时间轴。</p>
        </div>
      )}
    </>
  );
}
export function SourceContent({
  sources,
}: {
  sources: readonly SourceReference[];
}) {
  return (
    <>
      <div className="reading-section">
        <ShieldCheck className="content-symbol" size={32} />
        <h3>每一处呈现，都应有来处。</h3>
        {sources.length === 0 && <p>目前尚未发布经复核的史料来源。</p>}
        <p>真实历史、空间精度与资料出处，是这座数字展馆的基础。</p>
      </div>
      <ol className="principle-list">
        <li>
          <h4>史实有据</h4>
          <p>
            事件、日期、人物和行动顺序依据核验史料；编辑概述与原始引文分开呈现。
          </p>
        </li>
        <li>
          <h4>路线不推测</h4>
          <p>
            缺少几何证据时只展示已确认地点，不以现代路网或算法补全行军路径。
          </p>
        </li>
        <li>
          <h4>发布须复核</h4>
          <p>
            正式内容须经两名不同成员独立复核。自动校验只检查数据规则，不能代替人工史实审核。
          </p>
        </li>
        <li>
          <h4>艺术有边界</h4>
          <p>
            主题视觉与事实资料分层呈现。图像、字体和资料保留来源与授权记录。
          </p>
        </li>
      </ol>
      {sources.length > 0 && (
        <div className="reading-section">
          <h3>已发布来源</h3>
          <ul className="source-list">
            {sources.map((source) => (
              <li key={source.sourceId}>
                <strong>{source.title}</strong>
                <p>
                  {source.publisherOrAuthor} · {source.pageOrSection}
                </p>
                {/^https?:\/\//i.test(source.urlOrCatalogNumber) ? (
                  <a
                    href={source.urlOrCatalogNumber}
                    target="_blank"
                    rel="noreferrer"
                  >
                    查看原始出处
                  </a>
                ) : (
                  <p>{source.urlOrCatalogNumber}</p>
                )}
                <p>资料局限：{source.limitations}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
export function GuideContent() {
  return (
    <div className="reading-section">
      <h3>从一个历史节点开始</h3>
      <p>
        当前为展馆开发预览。可体验导航、章节抽屉与资料阅读；真实沙盘和历史专题由团队逐步接入。
      </p>
      <ol className="guide-steps">
        <li>
          <strong>选择章节</strong>
          <p>通过左下方“历史专题”打开目录。只显示已发布节点。</p>
        </li>
        <li>
          <strong>阅读资料</strong>
          <p>选择事件后打开“事件资料”，查看时间、地点、空间精度和出处。</p>
        </li>
        <li>
          <strong>沿时间轴浏览</strong>
          <p>
            使用播放与前后节点，依次浏览核验记录。无正式节点时控件保持禁用。
          </p>
        </li>
      </ol>
      <p>
        按 Esc 关闭面板，按 Tab
        切换控件；可随时返回首页。减少动态效果会减弱动画，仍须主动确认进入；历史体验可选择等价图文。
      </p>
    </div>
  );
}
export function AboutContent() {
  return (
    <div className="reading-section">
      <p className="content-symbol">长征 · 不灭的火种</p>
      <h3>循历史足迹，见信仰之光。</h3>
      <p>
        以数字展陈连接历史阅读与空间探索，让信念、坚持与传承成为可以走近的主题。
      </p>
      <p>
        作品面向 2026
        年“赓续长征精神，智创青春新程”微程序大赛。首页山河为原创艺术表达，不对应任何真实山脉、渡口或行军路线。
      </p>
      <p>
        本阶段完成展馆首页和探索交互。三维场景、历史内容与教学互动待相应模块完成并通过审核后开放。
      </p>
      <p>
        首页“长征”二字选自毛泽东《长征》诗手迹题名，由竖排取字后横向编排。
        <a
          href="https://sghexport.shobserver.com/html/baijiahao/2021/05/31/447591.html"
          target="_blank"
          rel="noreferrer"
        >
          查看手迹出处
        </a>
      </p>
      <p className="integrity-note">历史数据正在核验，正式路线暂未开放展示。</p>
    </div>
  );
}
