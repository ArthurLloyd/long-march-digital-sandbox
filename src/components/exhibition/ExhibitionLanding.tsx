import { ArrowUpRight } from 'lucide-react';
import type { Ref } from 'react';
import titleChang from '../../assets/exhibition/title-chang.png';
import titleZheng from '../../assets/exhibition/title-zheng.png';
import journeyOrnament from '../../assets/exhibition/journey-ornament.svg';
import { MountainArtwork } from './MountainArtwork';

interface Props {
  entering: boolean;
  onEnter: () => void;
  onAbout: () => void;
  enterRef: Ref<HTMLButtonElement>;
}
export function ExhibitionLanding({
  entering,
  onEnter,
  onAbout,
  enterRef,
}: Props) {
  return (
    <main
      className={`exhibition-landing ${entering ? 'is-entering' : ''}`}
      id="landing-content"
    >
      <MountainArtwork />
      <div className="landing-vignette" aria-hidden="true" />
      <div className="landing-content">
        <p className="commemoration">
          长征胜利九十周年 <span /> 1936—2026
        </p>
        <h1 className="epic-title" aria-label="长征 · 不灭的火种">
          <span className="title-main" aria-hidden="true">
            <img
              className="title-glyph title-glyph-chang"
              src={titleChang}
              width={480}
              height={740}
              alt=""
              decoding="async"
            />
            <img
              className="title-glyph title-glyph-zheng"
              src={titleZheng}
              width={520}
              height={410}
              alt=""
              decoding="async"
            />
          </span>
          <span className="title-sub" aria-hidden="true">
            不灭的火种
          </span>
        </h1>
        <p className="hero-description">循历史足迹，见信仰之光。</p>
        <div className="landing-actions">
          <button
            className="enter-button"
            ref={enterRef}
            onClick={onEnter}
            aria-label="开启征程"
          >
            <span className="enter-copy">
              开启征程<small>进入三维历史沙盘</small>
            </span>
            <img
              className="enter-arrow"
              src={journeyOrnament}
              width={88}
              height={72}
              alt=""
            />
          </button>
        </div>
      </div>
      <div className="landing-bottom">
        <p className="theme-motto">赓续长征精神，智创青春新程</p>
        <button className="quiet-button" onClick={onAbout}>
          了解作品 <ArrowUpRight size={17} />
        </button>
      </div>
    </main>
  );
}
