import { useState, type RefObject } from 'react';
import { ExhibitionDrawer } from '../../components/overlay/ExhibitionDrawer';
import '../../styles/journey-epilogue.css';

// Editorial summary, not an archival quotation. Provenance is linked in the book.
const EPILOGUE_COLUMNS = [
  '长征的胜利，保存和锻炼了',
  '中国革命的骨干力量。',
  '红军北上，在陕甘汇聚，',
  '为中国革命开辟新的局面。',
  '独立自主，团结奋进，',
  '依靠人民，百折不挠。',
  '征途有终，信念长明。',
  '铭记先辈，走好脚下的路。',
];
const EPILOGUE_SOURCE = {
  title: '在纪念红军长征胜利八十周年大会上的讲话',
  url: 'https://www.mem.gov.cn/xw/ztzl/2018/cyzd/hslc/201610/t20161021_228353.shtml',
};
export function JourneyEpilogue({
  onClose,
  onRestart,
  onStory,
  returnFocusRef,
}: {
  onClose: () => void;
  onRestart: () => void;
  onStory: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const [complete, setComplete] = useState(false);
  return (
    <ExhibitionDrawer
      title="长征胜利 · 薪火长明"
      className="journey-epilogue"
      onClose={onClose}
      returnFocusRef={returnFocusRef}
    >
      <div className={`victory-book${complete ? ' is-complete' : ''}`}>
        <div className="victory-book-cover" aria-hidden="true" />
        <div className="victory-book-spread" aria-hidden="true">
          {[1, 0].map((page) => (
            <div className="victory-book-page" key={page}>
              {page === 0 && <h3>长征的意义</h3>}
              <div className="victory-book-columns">
                {EPILOGUE_COLUMNS.slice(page * 4, page * 4 + 4).map(
                  (line, index) => (
                    <p
                      key={line}
                      style={{
                        animationDelay: `${(page * 4 + index) * 3.4 + 1.2}s`,
                      }}
                    >
                      {line}
                    </p>
                  ),
                )}
              </div>
              <span className="victory-book-folio">
                {page === 0 ? '一' : '二'}
              </span>
            </div>
          ))}
          <div className="victory-book-binding" />
        </div>
        <p className="sr-only">{EPILOGUE_COLUMNS.join('')}</p>
        <div className="victory-book-seal" aria-hidden="true">
          不灭
          <br />
          火种
        </div>
      </div>
      <footer className="victory-book-actions">
        <button onClick={() => setComplete(true)}>显示全文</button>
        <button onClick={onStory}>会师纪事</button>
        <button onClick={onRestart}>重温征程</button>
        <button onClick={onClose}>返回地图</button>
        <a href={EPILOGUE_SOURCE.url} target="_blank" rel="noreferrer">
          资料来源
        </a>
      </footer>
    </ExhibitionDrawer>
  );
}
