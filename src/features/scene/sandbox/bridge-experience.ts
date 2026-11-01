import { createBridgeStudy } from '../prototype/bridge-renderer';
import { createAmbience } from '../prototype/ambience';
import './bridge-experience.css';

export function createBridgeExperience(
  container: HTMLElement,
  hooks: {
    onOpen(): number;
    onClose(progress: number): void;
  },
) {
  const dialog = document.createElement('dialog');
  dialog.className = 'crossing-dialog';
  dialog.setAttribute('aria-label', '峡谷行军，三维整合场景');
  dialog.innerHTML = `<div class="crossing-canvas"></div><div class="crossing-shade" aria-hidden="true"></div>
  <header class="crossing-header"><button class="crossing-back">← 返回区域沙盘</button><span>长征 <i>/</i> 山河行迹</span><div><button id="crossing-sound" aria-pressed="false">环境声 · 关</button><button id="crossing-fullscreen">全屏</button></div></header>
  <section class="crossing-title"><p>THE CROSSING / 01</p><h2>峡谷<span>行军</span></h2><p class="crossing-line">石壁之间，步履向前。</p></section>
  <nav class="crossing-views" aria-label="峡谷视角"><button data-view="wide" aria-pressed="true">远望山河</button><button data-view="army" aria-pressed="false">近看军队</button><button data-view="rock" aria-pressed="false">桥索与石壁</button><button data-view="back" aria-pressed="false">回望来路</button></nav>
  <div class="crossing-caption"><span>三维岩壁 · 铁索木桥 · 行进编队</span><small>艺术演绎</small></div>
  <footer class="crossing-timeline"><div><span class="crossing-kicker">行进</span><strong>沿桥而行</strong><span class="crossing-instruction">拖动下方时间轴，观察队伍前进或回退</span><button id="crossing-play" aria-label="播放军队行进">▶</button><button id="crossing-speed">1×</button><output id="crossing-time">50 / 100</output></div><input id="crossing-time-range" type="range" min="0" max="1000" value="500" aria-label="峡谷军队时间轴"/><div class="crossing-ticks"><span>临桥</span><span>桥中</span><span>彼岸</span></div></footer>
  <div class="crossing-error" hidden role="alert"><h2>画面暂时未能展开</h2><p></p><button>返回沙盘</button></div>`;
  container.append(dialog);
  const $ = <T extends HTMLElement>(s: string) => dialog.querySelector<T>(s)!;
  const host = $<HTMLDivElement>('.crossing-canvas');
  const slider = $<HTMLInputElement>('#crossing-time-range');
  const play = $<HTMLButtonElement>('#crossing-play');
  let ambience = createAmbience();
  let scene: ReturnType<typeof createBridgeStudy> | null = null;
  let progress = 0.5,
    playing = false,
    speed = 1,
    sound = false;
  let trigger: HTMLElement | null = null;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function sync() {
    slider.value = String(Math.round(progress * 1000));
    slider.style.setProperty('--progress', `${progress * 100}%`);
    slider.setAttribute('aria-valuetext', `${Math.round(progress * 100)}%`);
    $<HTMLOutputElement>('#crossing-time').textContent =
      `${String(Math.round(progress * 100)).padStart(2, '0')} / 100`;
    play.textContent = playing ? 'Ⅱ' : '▶';
    play.setAttribute('aria-label', playing ? '暂停军队行进' : '播放军队行进');
    scene?.setTime(progress * 60);
    scene?.setPaused(!playing);
  }
  const pause = () => {
    playing = false;
    sync();
  };
  slider.addEventListener('input', () => {
    progress = Number(slider.value) / 1000;
    pause();
  });
  play.addEventListener('click', () => {
    if (progress >= 1) progress = 0;
    playing = !playing;
    sync();
  });
  $<HTMLButtonElement>('#crossing-speed').addEventListener('click', () => {
    speed = speed === 1 ? 2 : speed === 2 ? 0.5 : 1;
    $<HTMLButtonElement>('#crossing-speed').textContent = speed + '×';
  });
  dialog.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) =>
    button.addEventListener('click', () => {
      for (const b of dialog.querySelectorAll('[data-view]'))
        b.setAttribute('aria-pressed', String(b === button));
      if (button.dataset.view === 'army') scene?.focusCompany();
      else
        scene?.pose(
          button.dataset.view === 'wide'
            ? 0
            : button.dataset.view === 'rock'
              ? 1
              : 2,
        );
    }),
  );
  $<HTMLButtonElement>('.crossing-back').addEventListener('click', () =>
    dialog.close(),
  );
  $<HTMLButtonElement>('.crossing-error button').addEventListener('click', () =>
    dialog.close(),
  );
  $<HTMLButtonElement>('#crossing-sound').addEventListener(
    'click',
    async () => {
      sound = await ambience.toggle();
      $<HTMLButtonElement>('#crossing-sound').textContent = sound
        ? '环境声 · 开'
        : '环境声 · 关';
      $<HTMLButtonElement>('#crossing-sound').setAttribute(
        'aria-pressed',
        String(sound),
      );
    },
  );
  $<HTMLButtonElement>('#crossing-fullscreen').addEventListener('click', () => {
    void (
      document.fullscreenElement
        ? document.exitFullscreen()
        : dialog.requestFullscreen()
    ).catch(() => {
      $<HTMLButtonElement>('#crossing-fullscreen').textContent = '窗口观看';
    });
  });
  const visibility = () => {
    if (document.hidden) pause();
    ambience.visibility();
  };
  document.addEventListener('visibilitychange', visibility);
  dialog.addEventListener('close', () => {
    scene?.dispose();
    scene = null;
    playing = false;
    sound = false;
    ambience.dispose();
    $<HTMLButtonElement>('#crossing-sound').textContent = '环境声 · 关';
    $<HTMLButtonElement>('#crossing-sound').setAttribute(
      'aria-pressed',
      'false',
    );
    hooks.onClose(progress);
    trigger?.focus({ preventScroll: true });
  });
  return {
    open() {
      if (dialog.open) return;
      trigger =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      progress = hooks.onOpen();
      playing = false;
      ambience = createAmbience();
      $<HTMLElement>('.crossing-error').hidden = true;
      dialog.showModal();
      try {
        scene = createBridgeStudy(host, {
          reduced,
          showCompany: true,
          backdropUrl:
            '/assets/textures/immersive-landscapes/river-valley.webp',
          onFrame(dt) {
            if (playing) {
              progress = Math.min(1, progress + (dt * speed) / 60);
              if (progress === 1) playing = false;
            }
            sync();
          },
          onMetrics() {},
          onError(message) {
            pause();
            $<HTMLElement>('.crossing-error').hidden = false;
            $<HTMLElement>('.crossing-error p').textContent = message;
          },
        });
        sync();
        scene.focusCompany();
        for (const button of dialog.querySelectorAll<HTMLButtonElement>(
          '[data-view]',
        ))
          button.setAttribute(
            'aria-pressed',
            String(button.dataset.view === 'army'),
          );
      } catch {
        $<HTMLElement>('.crossing-error').hidden = false;
        $<HTMLElement>('.crossing-error p').textContent =
          '请返回区域沙盘后重新进入。';
      }
    },
    dispose() {
      if (dialog.open) dialog.close();
      scene?.dispose();
      ambience.dispose();
      document.removeEventListener('visibilitychange', visibility);
      dialog.remove();
    },
  };
}
