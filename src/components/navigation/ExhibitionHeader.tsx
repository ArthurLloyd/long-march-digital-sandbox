import { ArrowLeft, Expand, Minimize } from 'lucide-react';
import emberSeal from '../../assets/exhibition/ember-seal.svg';
interface Props {
  exploring: boolean;
  onHome: () => void;
  onOpen: (overlay: 'about' | 'sources' | 'guide') => void;
  fullscreen: boolean;
  onFullscreen: () => void;
}
export function ExhibitionHeader({
  exploring,
  onHome,
  onOpen,
  fullscreen,
  onFullscreen,
}: Props) {
  return (
    <header className="exhibition-header">
      <button
        className="exhibition-brand"
        onClick={onHome}
        aria-label="长征·不灭的火种首页"
      >
        <img
          className="brand-emblem"
          src={emberSeal}
          width={64}
          height={72}
          alt=""
        />
        <span>
          长征<span className="brand-divider">·</span>不灭的火种
          <small>长征主题数字展馆</small>
        </span>
      </button>
      <nav aria-label="顶部导航">
        {exploring ? (
          <>
            <button onClick={onHome}>
              <ArrowLeft size={16} />
              返回首页
            </button>
            <button onClick={() => onOpen('sources')}>资料来源</button>
            <button onClick={() => onOpen('guide')}>使用说明</button>
          </>
        ) : (
          <>
            <button onClick={() => onOpen('about')}>关于展馆</button>
            <button onClick={() => onOpen('sources')}>史料原则</button>
          </>
        )}
      </nav>
      <button
        className="fullscreen-button"
        onClick={onFullscreen}
        aria-label={fullscreen ? '退出全屏' : '进入全屏'}
      >
        {fullscreen ? <Minimize size={18} /> : <Expand size={18} />}
        <span>{fullscreen ? '退出全屏' : '全屏体验'}</span>
      </button>
    </header>
  );
}
