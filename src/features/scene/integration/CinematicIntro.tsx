import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { SceneCinematic } from './cinematic-config';
import './cinematic-intro.css';

interface CinematicIntroProps {
  cinematic: SceneCinematic;
  onComplete: () => void;
  onExit: () => void;
}
type PlaybackState =
  'loading' | 'blocked' | 'playing' | 'paused' | 'error' | 'leaving';

// Keep explicit audio choices across scene changes/replays in this tab session.
const audioPreference = { muted: false, volume: 0.9 };

/** A visual introduction only; it does not emit historical completion evidence. */
export function CinematicIntro({
  cinematic,
  onComplete,
  onExit,
}: CinematicIntroProps) {
  const video = useRef<HTMLVideoElement>(null);
  const alive = useRef(true);
  const playRequest = useRef(0);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const wantsPlayback = useRef(true);
  const focusButton = useRef<HTMLButtonElement>(null);
  const [reducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [state, setState] = useState<PlaybackState>(
    reducedMotion ? 'blocked' : 'loading',
  );
  const [muted, setMuted] = useState(() => audioPreference.muted);
  const [volume, setVolume] = useState(() => audioPreference.volume);
  const [progress, setProgress] = useState(0);
  const completed = useRef(false);

  const clearLoading = () => {
    clearTimeout(loadingTimer.current);
    loadingTimer.current = undefined;
  };
  const waitForMedia = () => {
    clearLoading();
    loadingTimer.current = setTimeout(() => {
      if (alive.current && !completed.current) {
        playRequest.current += 1;
        wantsPlayback.current = false;
        video.current?.pause();
        setState('error');
      }
    }, 18000);
  };
  const playMedia = () => {
    const element = video.current;
    if (!element || completed.current) return;
    const request = ++playRequest.current;
    wantsPlayback.current = true;
    waitForMedia();
    return element.play().then(
      () => {
        if (
          !alive.current ||
          request !== playRequest.current ||
          completed.current
        )
          return;
        clearLoading();
        setState('playing');
      },
      (error: unknown) => {
        if (
          !alive.current ||
          request !== playRequest.current ||
          completed.current
        )
          return;
        clearLoading();
        wantsPlayback.current = false;
        setState(
          error instanceof DOMException && error.name === 'NotAllowedError'
            ? 'blocked'
            : 'error',
        );
      },
    );
  };
  const requestPlay = () => {
    setState('loading');
    return playMedia();
  };
  const finish = () => {
    if (completed.current) return;
    completed.current = true;
    wantsPlayback.current = false;
    playRequest.current += 1;
    clearLoading();
    video.current?.pause();
    setState('leaving');
    finishTimer.current = setTimeout(
      () => {
        if (alive.current) onComplete();
      },
      reducedMotion ? 0 : 480,
    );
  };

  useEffect(() => {
    const element = video.current;
    alive.current = true;
    if (element) {
      element.setAttribute('src', cinematic.src);
      element.volume = audioPreference.volume;
    }
    wantsPlayback.current = !reducedMotion;
    if (!reducedMotion && !document.hidden) void playMedia();
    const visibility = () => {
      if (document.hidden) {
        playRequest.current += 1;
        clearLoading();
        element?.pause();
      } else if (wantsPlayback.current && !completed.current)
        void requestPlay();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      alive.current = false;
      playRequest.current += 1;
      clearLoading();
      clearTimeout(finishTimer.current);
      document.removeEventListener('visibilitychange', visibility);
      element?.pause();
      element?.removeAttribute('src');
      element?.load();
    };
    // This component is keyed per viewing session; callbacks are event handlers, not lifecycle triggers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (state === 'blocked' || state === 'error') focusButton.current?.focus();
  }, [state]);

  return (
    <section
      className="scene-cinematic"
      data-playback={state}
      aria-label={`${cinematic.label} · 开场片段`}
    >
      <video
        ref={video}
        src={cinematic.src}
        poster={cinematic.poster}
        preload="auto"
        playsInline
        muted={muted}
        aria-label={`${cinematic.label}，AI 艺术再现开场影片`}
        onPlaying={() => {
          if (!alive.current || document.hidden) {
            video.current?.pause();
            return;
          }
          if (!completed.current && wantsPlayback.current) {
            clearLoading();
            setState('playing');
          }
        }}
        onWaiting={() => {
          if (
            alive.current &&
            !document.hidden &&
            !completed.current &&
            wantsPlayback.current
          ) {
            setState('loading');
            waitForMedia();
          }
        }}
        onTimeUpdate={(event) => {
          const element = event.currentTarget;
          if (Number.isFinite(element.duration) && element.duration > 0)
            setProgress(Math.min(1, element.currentTime / element.duration));
        }}
        onEnded={finish}
        onError={() => {
          if (!completed.current) {
            clearLoading();
            playRequest.current += 1;
            wantsPlayback.current = false;
            setState('error');
          }
        }}
      />
      <div className="scene-cinematic-edge" aria-hidden="true" />
      <header>
        <button onClick={onExit} aria-label="返回总地图">
          <ArrowLeft size={17} /> <span>返回总地图</span>
        </button>
        <span className="scene-cinematic-disclosure">AI 艺术再现</span>
      </header>
      {(state === 'blocked' || state === 'error' || state === 'loading') && (
        <div className="scene-cinematic-message">
          {state === 'loading' ? (
            <span
              className="scene-cinematic-loading"
              role="status"
              aria-label="正在载入开场片段"
            />
          ) : state === 'blocked' ? (
            <>
              <button
                ref={focusButton}
                className="scene-cinematic-play"
                onClick={() => void requestPlay()}
              >
                <Play size={23} fill="currentColor" /> <span>播放片段</span>
              </button>
              <p>
                {reducedMotion ? '播放后走进这片山河' : '轻触播放，开启声音'}
              </p>
            </>
          ) : (
            <>
              <p role="alert">片段暂未能播放</p>
              <button
                ref={focusButton}
                className="scene-cinematic-recover"
                onClick={finish}
              >
                继续探索 <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
      )}
      <footer>
        <div className="scene-cinematic-transport">
          {(state === 'playing' || state === 'paused') && (
            <button
              aria-label={state === 'paused' ? '继续播放片段' : '暂停片段'}
              onClick={() => {
                if (state === 'paused') void requestPlay();
                else {
                  wantsPlayback.current = false;
                  playRequest.current += 1;
                  clearLoading();
                  video.current?.pause();
                  setState('paused');
                }
              }}
            >
              {state === 'paused' ? <Play size={17} /> : <Pause size={17} />}
            </button>
          )}
          <button
            aria-label={muted ? '开启影片声音' : '静音影片'}
            aria-pressed={muted}
            onClick={() => {
              audioPreference.muted = !muted;
              setMuted(!muted);
            }}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <input
            aria-label="影片音量"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(event) => {
              const value = Number(event.target.value);
              audioPreference.volume = value;
              audioPreference.muted = value === 0;
              setVolume(value);
              setMuted(value === 0);
              if (video.current) video.current.volume = value;
            }}
          />
        </div>
        {reducedMotion && state !== 'leaving' && (
          <button className="scene-cinematic-accessible-entry" onClick={finish}>
            直接进入场景 <ArrowRight size={14} />
          </button>
        )}
        <div
          className="scene-cinematic-progress"
          role="progressbar"
          aria-label="开场片段进度"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
      </footer>
    </section>
  );
}
