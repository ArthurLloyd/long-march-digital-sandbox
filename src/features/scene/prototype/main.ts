import '@fontsource/noto-serif-sc/600.css';
import '@fontsource/noto-sans-sc/400.css';
import './study.css';
import { createBridgeStudy } from './bridge-renderer';
import { createAmbience } from './ambience';
import {
  advanceStudy,
  continueStudy,
  createStudy,
  observeStudy,
} from './sequence';

if (!import.meta.env.DEV && import.meta.env.MODE !== 'showcase')
  throw new Error('Scene study is available in development only.');

const symbols: Record<string, string> = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  sound:
    '<path d="M11 5 6 9H3v6h3l5 4V5Zm4 3a7 7 0 0 1 0 8m3-11a11 11 0 0 1 0 14"/>',
  muted: '<path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 5 6m0-6-5 6"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="m10 3-1 3-3 1-3-1-1 4 3 2-1 3-2 2 3 3 3-1 3 1 1 3 4-1 1-3 3-2 3 1 1-4-3-2-1-3 2-3-3-3-3 1Z"/>',
  camera: '<path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/>',
  expand: '<path d="M3 9V3h6m6 0h6v6m0 6v6h-6M9 21H3v-6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5Z"/>',
  play: '<path d="m9 5 11 7-11 7Z"/>',
  pause: '<path d="M9 5v14M16 5v14"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
};
const icon = (name: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[name] ?? symbols.arrow}</svg>`;
const root = document.querySelector<HTMLDivElement>('#study')!;
root.innerHTML = `
<main class="study-shell" data-phase="idle" data-mode="journey">
  <div class="canvas-host" id="canvas-host"></div>
  <div class="atmosphere" aria-hidden="true"></div><div class="frame-edge" aria-hidden="true"></div>
  <header class="study-header hud">
    <a class="brand" href="/" aria-label="返回长征数字展馆"><span class="brand-seal" aria-hidden="true">征</span><span>长征<small>不灭的火种</small></span></a>
    <div class="edition"><span class="chapter-line"></span><span>山河之间</span><i>01</i><span class="chapter-line"></span></div>
    <div class="header-actions"><button class="icon-button" id="sound" aria-label="开启环境声" aria-pressed="false" title="环境声">${icon('muted')}</button><button class="icon-button" id="settings-open" aria-label="打开设置与说明" title="设置">${icon('settings')}</button><button class="text-button exit-link" id="exit">离开 ${icon('close')}</button></div>
  </header>
  <section class="intro hud" id="intro" aria-labelledby="study-title">
    <p class="eyebrow"><span></span>山河之间 · 第一章</p>
    <div class="title-lockup"><h1 id="study-title">渡</h1><span class="title-seal" aria-hidden="true">山河</span></div>
    <p class="english-title" aria-hidden="true">THE CROSSING</p>
    <p class="intro-copy">循桥入谷，向光而行。</p>
    <div class="intro-actions"><button class="begin-button" id="begin"><span class="button-orbit" aria-hidden="true">${icon('arrow')}</span><span>启程<small>一段山河之旅</small></span><span class="button-line" aria-hidden="true"></span></button><button class="quiet-button" id="free-explore">${icon('compass')}自由观景</button></div>
  </section>
  <div class="scene-coordinate hud" id="scene-coordinate" aria-hidden="true"><span>01 — 03</span><i></i><span>峡谷 · 悬桥</span></div>
  <aside class="chapter-note hud" id="chapter-note" hidden><p class="eyebrow" id="chapter-number">01 / 入谷</p><h2 id="chapter-title">循光入谷</h2><p id="chapter-copy">拖动视野，走近眼前的山河。</p></aside>
  <nav class="view-controls hud" aria-label="选择视角"><span class="nav-caption">视角</span><button data-pose="0" aria-label="远望河谷" aria-pressed="true"><span>01</span><b>远望</b><i></i></button><button data-pose="1" aria-label="走近桥索" aria-pressed="false"><span>02</span><b>桥畔</b><i></i></button><button data-pose="2" aria-label="回望来路" aria-pressed="false"><span>03</span><b>回望</b><i></i></button></nav>
  <div class="hotspots hud" id="hotspots" hidden><svg class="hotspot-leaders" aria-hidden="true"><line data-leader="bridge"/><line data-leader="banks"/></svg><button class="hotspot" data-hotspot="bridge" aria-label="观察桥索"><span class="hotspot-ring"><i></i></span><b>桥索</b></button><button class="hotspot" data-hotspot="banks" aria-label="观察两岸"><span class="hotspot-ring"><i></i></span><b>两岸</b></button></div>
  <section class="interaction hud" id="interaction" aria-labelledby="interaction-title" hidden tabindex="-1"><p class="eyebrow"><span class="objective-glyph">◇</span>驻足 · 观察</p><button class="task-toggle" data-collapse-task aria-expanded="true">收起 −</button><h2 id="interaction-title">在桥畔，停留片刻。</h2><p class="interaction-description">选择场景中的光点，走近桥索与两岸。</p><div class="observation-list"><button data-observe="bridge" aria-pressed="false"><i>01</i><span>桥索</span><small>待观察</small></button><button data-observe="banks" aria-pressed="false"><i>02</i><span>两岸</span><small>待观察</small></button></div><div class="detail-reveal" id="detail-reveal" hidden><span id="detail-kicker">桥索</span><p id="material-copy" role="status"></p></div><button class="continue-button" id="observe-continue" disabled><span>观察桥索与两岸</span>${icon('arrow')}</button></section>
  <section class="interaction reflection hud" id="reflection" aria-labelledby="reflection-title" hidden tabindex="-1"><p class="eyebrow"><span class="objective-glyph">◇</span>驻足 · 回望</p><button class="task-toggle" data-collapse-task aria-expanded="true">收起 −</button><h2 id="reflection-title">转身，再望一眼。</h2><p class="interaction-description">沿桥索望向来处，换一个方向看山河。</p><button class="viewpoint-action" id="acknowledge">${icon('compass')}<span>回望来路<small>移动至第三视角</small></span>${icon('arrow')}</button><p id="reflection-feedback" role="status"></p><button class="continue-button" id="reflect-continue" disabled><span>回望后继续</span>${icon('arrow')}</button></section>
  <aside class="free-detail hud" id="free-detail" hidden><button id="close-detail" class="icon-button" aria-label="收起观察说明">${icon('close')}</button><p class="eyebrow" id="free-detail-title"></p><p id="free-detail-copy"></p></aside>
  <section class="end-card hud" id="end-card" hidden tabindex="-1"><p class="eyebrow">山河之间 · 第一章</p><h2 id="end-title">山河在前，步履未停。</h2><p id="end-copy">已观察桥索与两岸，已回望来路。</p><div class="journey-seals" id="journey-seals"><span><i>01</i>入谷</span><b>—</b><span><i>02</i>观桥</span><b>—</b><span><i>03</i>回望</span></div><div class="end-actions"><button class="begin-button" id="restart"><span class="button-orbit">${icon('arrow')}</span><span>再走一程</span></button><a href="/" class="quiet-button">返回展馆 ${icon('arrow')}</a></div></section>
  <section class="error-card hud" id="error-card" role="alert" hidden><p class="eyebrow">显示中断</p><h2>暂时无法进入山河</h2><p id="error-copy"></p><button id="retry" class="solid-button">重新载入</button><a href="/">返回展馆</a></section>
  <footer class="study-footer hud"><div class="journey-controls" id="journey-controls" hidden><button class="icon-button pause-button" id="pause" aria-label="暂停行进" disabled>${icon('pause')}</button><div class="timeline"><div class="timeline-copy"><span id="playback-caption">循光入谷</span><output id="time">00:00 / 01:00</output></div><div class="progress-track" role="progressbar" aria-label="行进进度" aria-valuemin="0" aria-valuemax="60" aria-valuenow="0"><span id="progress"></span><i style="left:26.666%"></i><i style="left:66.666%"></i></div></div><button class="text-button" id="step" hidden>下一程 ${icon('arrow')}</button></div><div class="footer-base"><button class="art-note" id="about-open"><span></span>艺术演绎</button><span class="input-hint" id="input-hint"><kbd>拖动</kbd> 环顾 <i>·</i> <kbd>滚轮</kbd> 远近</span><div class="footer-tools"><button class="tool-button" id="camera-reset" aria-label="恢复当前镜头">${icon('compass')}<span>复位</span></button><button class="tool-button" id="photo" aria-label="进入取景模式">${icon('camera')}<span>取景</span></button><button class="icon-button" id="fullscreen" aria-label="进入全屏" title="全屏">${icon('expand')}</button></div></div></footer>
  <button class="photo-exit" id="photo-exit" hidden>${icon('back')}退出取景 <kbd>Esc</kbd></button>
  <div class="photo-corners" aria-hidden="true" hidden id="photo-corners"><i></i><i></i><i></i><i></i></div>
  <p class="toast" id="toast" role="status" hidden></p><p class="sr-only" id="announcer" role="status" aria-live="polite"></p>
  <dialog class="settings-dialog" id="settings" aria-labelledby="settings-title"><div class="dialog-header"><div><p class="eyebrow">山河之间</p><h2 id="settings-title">随心观景</h2></div><button class="icon-button" id="settings-close" aria-label="关闭设置">${icon('close')}</button></div><div class="setting-row"><span>画面质量<small>精细光影或轻量流畅</small></span><button class="setting-toggle" id="quality" aria-pressed="false">精细</button></div><div class="setting-row"><label for="volume">环境音量<small>首次开启请点击右上角声音按钮</small></label><input id="volume" type="range" min="0" max="70" value="35" aria-label="环境音量" /></div><div class="controls-guide"><span><kbd>拖动 / 方向键</kbd>环顾</span><span><kbd>滚轮 / 双指</kbd>远近</span><span><kbd>空格</kbd>暂停 / 继续</span><span><kbd>H</kbd>取景</span><span><kbd>Esc</kbd>关闭面板</span></div><details id="about-details"><summary>关于这一程</summary><p>这是以长征主题创作的艺术演绎。山体、桥梁、天气与环境声为原创设计，未复原特定历史地点，不作为历史资料。本章约一分钟，包含两处观察；退出后不保存进度。</p></details><details id="metrics-details"><summary>显示性能</summary><output class="metrics" id="metrics">正在采集…</output></details></dialog>
</main>`;
function el<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}
const shell = root.querySelector<HTMLElement>('.study-shell')!;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let state = createStudy();
let study: ReturnType<typeof createBridgeStudy> | undefined;
const ambience = createAmbience();
let failed = false;
let low = matchMedia('(max-width: 700px)').matches;
let freeMode = false;
let photoMode = false;
let resumeAfterPhoto = false;
let previousPhase = state.phase;
let currentPose = 0;
let toastTimer = 0;
let disposed = false;
const pause = el<HTMLButtonElement>('pause');
const step = el<HTMLButtonElement>('step');
const settings = el<HTMLDialogElement>('settings');
const descriptions = {
  bridge: {
    title: '桥索',
    copy: '索线向两岸延伸，木板在脚下铺开。近看一道线，远看一条路。',
  },
  banks: {
    title: '两岸',
    copy: '近处是岩壁，远处是山影。水与薄雾，将层层山峦连在一起。',
  },
};
function tell(message: string) {
  el('toast').textContent = message;
  el('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el('toast').hidden = true;
  }, 2800);
}
function focusPanel(id: string) {
  el(id).focus({ preventScroll: true });
}
function setPose(index: number) {
  currentPose = index;
  study?.pose(index);
  root
    .querySelectorAll<HTMLButtonElement>('[data-pose]')
    .forEach((button) =>
      button.setAttribute(
        'aria-pressed',
        String(Number(button.dataset.pose) === index),
      ),
    );
}
function syncClock() {
  const elapsed = Math.floor(state.elapsed);
  el('time').textContent =
    `${elapsed === 60 ? '01:00' : `00:${String(elapsed).padStart(2, '0')}`} / 01:00`;
  el('progress').style.width = `${(state.elapsed / 60) * 100}%`;
  root
    .querySelector('[role="progressbar"]')!
    .setAttribute('aria-valuenow', String(elapsed));
  study?.setTime(state.elapsed);
}
function syncHotspots() {
  if (!study || !(state.phase === 'observe' || freeMode) || photoMode) return;
  const panel =
    state.phase === 'observe'
      ? el('interaction').getBoundingClientRect()
      : null;
  const width = shell.clientWidth,
    height = shell.clientHeight;
  for (const spot of study.getHotspots()) {
    const button = root.querySelector<HTMLButtonElement>(
      `[data-hotspot="${spot.id}"]`,
    )!;
    const line = root.querySelector<SVGLineElement>(
      `[data-leader="${spot.id}"]`,
    )!;
    let x = Math.max(20, Math.min(width - 120, spot.x - 22));
    let y = Math.max(110, Math.min(height - 185, spot.y - 23));
    if (
      panel &&
      x + 110 > panel.left - 12 &&
      x < panel.right + 12 &&
      y + 46 > panel.top - 12 &&
      y < panel.bottom + 12
    ) {
      if (width > 700 && panel.right + 132 < width) x = panel.right + 18;
      else y = Math.max(110, panel.top - 65);
    }
    button.style.transform = `translate(${x}px,${y}px)`;
    button.hidden = !spot.visible;
    const displaced = Math.hypot(x + 22 - spot.x, y + 23 - spot.y) > 6;
    line.style.display = spot.visible && displaced ? '' : 'none';
    line.setAttribute('x1', String(spot.x));
    line.setAttribute('y1', String(spot.y));
    line.setAttribute('x2', String(x + 22));
    line.setAttribute('y2', String(y + 23));
  }
}

function render() {
  shell.dataset.phase = failed ? 'error' : state.phase;
  shell.dataset.mode = freeMode ? 'free' : 'journey';
  study?.setPaused(
    !freeMode && state.phase !== 'idle' && state.phase !== 'playing',
  );
  el('intro').hidden = state.phase !== 'idle' || failed || freeMode;
  const ongoing =
    ['playing', 'paused', 'observe', 'reflect'].includes(state.phase) &&
    !failed;
  el('chapter-note').hidden =
    !ongoing || ['observe', 'reflect'].includes(state.phase);
  el('interaction').hidden = state.phase !== 'observe' || failed;
  el('reflection').hidden = state.phase !== 'reflect' || failed;
  el('journey-seals').hidden = state.phase !== 'ended';
  el('end-card').hidden = !['ended', 'exited'].includes(state.phase) || failed;
  el('hotspots').hidden = !(state.phase === 'observe' || freeMode) || failed;
  el('journey-controls').hidden =
    ['idle', 'exited', 'ended'].includes(state.phase) || freeMode || failed;
  el('scene-coordinate').hidden = state.phase !== 'idle';
  pause.disabled =
    !['playing', 'paused'].includes(state.phase) || failed || reduced;
  pause.innerHTML = icon(state.phase === 'paused' ? 'play' : 'pause');
  pause.setAttribute(
    'aria-label',
    state.phase === 'paused' ? '继续行进' : '暂停行进',
  );
  step.hidden = !reduced || state.phase !== 'playing' || failed;
  const chapter = state.elapsed < 16 ? 0 : state.elapsed < 40 ? 1 : 2;
  el('chapter-number').textContent = freeMode
    ? '自由观景'
    : ['01 / 入谷', '02 / 桥畔', '03 / 回望'][chapter]!;
  el('chapter-title').textContent = freeMode
    ? '山河，尽在眼前。'
    : ['循光入谷', '临桥听风', '回望来路'][chapter]!;
  el('chapter-copy').textContent = freeMode
    ? '选择视角，或拖动环顾。'
    : state.phase === 'paused'
      ? '行进已暂停，山河就在眼前。'
      : '拖动环顾，或选择右侧视角。';
  el('playback-caption').textContent =
    state.phase === 'observe'
      ? `驻足观察 · ${state.observed.length} / 2`
      : state.phase === 'reflect'
        ? '驻足回望'
        : state.phase === 'paused'
          ? '停留此刻'
          : state.phase === 'ended'
            ? '此程已至'
            : ['循光入谷', '临桥听风', '回望来路'][chapter]!;
  root
    .querySelectorAll<HTMLButtonElement>('[data-observe]')
    .forEach((button) => {
      const seen = state.observed.includes(button.dataset.observe!);
      button.setAttribute('aria-pressed', String(seen));
      button.querySelector('small')!.textContent = seen ? '已观察 ✓' : '待观察';
    });
  el<HTMLButtonElement>('observe-continue').disabled =
    state.observed.length !== 2;
  el('observe-continue').querySelector('span')!.textContent =
    state.observed.length === 2
      ? '继续前行'
      : state.observed.length
        ? '再看看另一处'
        : '观察桥索与两岸';
  el<HTMLButtonElement>('reflect-continue').disabled = !state.confirmed;
  el('reflect-continue').querySelector('span')!.textContent = state.confirmed
    ? '继续前行'
    : '回望后继续';
  syncClock();
  if (previousPhase !== state.phase) {
    if (state.phase === 'observe') {
      focusPanel('interaction');
      el('announcer').textContent = '驻足观察。请选择桥索与两岸。';
    }
    if (state.phase === 'reflect') {
      focusPanel('reflection');
      el('announcer').textContent = '驻足回望。选择回望来路，再继续前行。';
    }
    if (state.phase === 'ended') {
      focusPanel('end-card');
      el('announcer').textContent = '本章已结束，可以再走一程或返回展馆。';
    }
    if (state.phase === 'exited')
      el('announcer').textContent = '已离开场景，环境声已关闭。';
    previousPhase = state.phase;
  }
}
function fail(message: string) {
  failed = true;
  if (state.phase === 'playing') state = { ...state, phase: 'paused' };
  el('error-card').hidden = false;
  el('error-copy').textContent = message;
  render();
}
try {
  study = createBridgeStudy(el('canvas-host'), {
    reduced,
    onFrame(delta) {
      if (disposed) return;
      if (!reduced && !freeMode) {
        const next = advanceStudy(state, delta);
        const changed = next.phase !== state.phase;
        state = next;
        if (changed) render();
        else syncClock();
      }
      syncHotspots();
    },
    onMetrics(metrics) {
      el('metrics').textContent =
        `${metrics.fps.toFixed(1)} FPS · 帧间隔 p95 ${metrics.p95.toFixed(1)} ms\n${metrics.calls} draw calls · ${metrics.triangles.toLocaleString()} triangles\n${metrics.geometries} geometries · ${metrics.textures} textures\n${innerWidth} × ${innerHeight} · ${low ? '轻量' : '精细'}画质`;
      el('metrics').dataset.sample = JSON.stringify(metrics);
    },
    onError: fail,
    onExplore() {
      if (state.phase === 'playing') {
        state = { ...state, phase: 'paused' };
        render();
      }
    },
  });
  study.quality(low);
} catch {
  fail('浏览器暂时无法呈现三维画面。请重试，或返回展馆继续浏览。');
}
el('begin').onclick = () => {
  state = continueStudy(state);
  study?.resumeCamera();
  render();
  (reduced ? step : pause).focus();
};
el('free-explore').onclick = () => {
  freeMode = true;
  state = { ...continueStudy(state), phase: 'paused' };
  setPose(0);
  render();
  root.querySelector<HTMLButtonElement>('[data-pose="0"]')!.focus();
};
function togglePause() {
  if (
    freeMode ||
    reduced ||
    failed ||
    !['playing', 'paused'].includes(state.phase)
  )
    return;
  const resume = state.phase === 'paused';
  state =
    state.phase === 'playing'
      ? { ...state, phase: 'paused' }
      : continueStudy(state);
  if (resume) study?.resumeCamera();
  render();
}
pause.onclick = togglePause;
step.onclick = () => {
  state = advanceStudy(
    state,
    state.elapsed < 16
      ? 16 - state.elapsed
      : state.elapsed < 40
        ? 40 - state.elapsed
        : 60 - state.elapsed,
  );
  setPose(state.elapsed <= 16 ? 1 : 2);
  render();
};
root.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach((button) => {
  button.onclick = () => setPose(Number(button.dataset.pose));
});
el('camera-reset').onclick = () => {
  setPose(currentPose);
  tell('已恢复当前视角');
};
function observe(id: 'bridge' | 'banks') {
  if (!freeMode && state.phase !== 'observe') return;
  state = observeStudy(state, id);
  setPose(id === 'bridge' ? 1 : 2);
  const description = descriptions[id];
  if (freeMode) {
    el('free-detail').hidden = false;
    el('free-detail-title').textContent = description.title;
    el('free-detail-copy').textContent = description.copy;
  } else {
    el('detail-reveal').hidden = false;
    el('detail-kicker').textContent = description.title;
    el('material-copy').textContent = description.copy;
  }
  root
    .querySelector(`[data-hotspot="${id}"]`)!
    .setAttribute('data-seen', 'true');
  render();
}
root
  .querySelectorAll<HTMLButtonElement>('[data-observe],[data-hotspot]')
  .forEach((button) => {
    button.onclick = () =>
      observe(
        (button.dataset.observe ?? button.dataset.hotspot) as
          'bridge' | 'banks',
      );
  });
el('close-detail').onclick = () => {
  el('free-detail').hidden = true;
};
root
  .querySelectorAll<HTMLButtonElement>('[data-collapse-task]')
  .forEach((button) => {
    button.onclick = () => {
      const collapsed = button
        .closest('.interaction')!
        .classList.toggle('collapsed');
      button.setAttribute('aria-expanded', String(!collapsed));
      button.textContent = collapsed ? '展开 ＋' : '收起 −';
    };
  });
function proceed() {
  state = continueStudy(state);
  study?.resumeCamera();
  render();
  (reduced ? step : pause).focus();
}
el('observe-continue').onclick = proceed;
el('acknowledge').onclick = () => {
  setPose(2);
  state = { ...state, confirmed: true };
  el('reflection-feedback').textContent = '已回望 · 可以继续前行';
  render();
  const reflection = el('reflection');
  reflection.scrollTo({
    top: reflection.scrollHeight,
    behavior: reduced ? 'instant' : 'smooth',
  });
};
el('reflect-continue').onclick = proceed;
function stopScene() {
  study?.dispose();
  study = undefined;
  ambience.dispose();
  el('sound').innerHTML = icon('muted');
  el('sound').setAttribute('aria-pressed', 'false');
  el('sound').setAttribute('aria-label', '开启环境声');
}
el('exit').onclick = () => {
  state = { ...state, phase: 'exited' };
  freeMode = false;
  stopScene();
  el('free-detail').hidden = true;
  el('end-title').textContent = '山河长在，来日再逢。';
  el('end-copy').textContent = '此刻暂别，随时启程。';
  render();
  focusPanel('end-card');
};
el('restart').onclick = () => location.reload();
el('retry').onclick = () => location.reload();
function setPhoto(active: boolean) {
  if (failed || !study) return;
  photoMode = active;
  if (active) {
    resumeAfterPhoto = state.phase === 'playing';
    if (resumeAfterPhoto) state = { ...state, phase: 'paused' };
  } else if (resumeAfterPhoto && state.phase === 'paused') {
    state = continueStudy(state);
    resumeAfterPhoto = false;
  }
  shell.classList.toggle('photo-mode', active);
  el('photo-exit').hidden = !active;
  el('photo-corners').hidden = !active;
  root.querySelectorAll<HTMLElement>('.hud').forEach((node) => {
    node.inert = active;
  });
  render();
  (active ? el('photo-exit') : el('photo')).focus();
}
el('photo').onclick = () => setPhoto(true);
el('photo-exit').onclick = () => setPhoto(false);
function openSettings(about = false) {
  if (state.phase === 'playing') {
    state = { ...state, phase: 'paused' };
    render();
  }
  el<HTMLDetailsElement>('about-details').open = about;
  settings.showModal();
}
el('settings-open').onclick = () => openSettings();
el('about-open').onclick = () => openSettings(true);
el('settings-close').onclick = () => settings.close();
settings.addEventListener('click', (event) => {
  if (event.target === settings) {
    const r = settings.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      settings.close();
  }
});
function syncQuality() {
  el('quality').textContent = low ? '轻量' : '精细';
  el('quality').setAttribute('aria-pressed', String(low));
}
el('quality').onclick = () => {
  low = !low;
  study?.quality(low);
  syncQuality();
};
el('sound').onclick = async () => {
  if (!study) return;
  try {
    const enabled = await ambience.toggle();
    el('sound').innerHTML = icon(enabled ? 'sound' : 'muted');
    el('sound').setAttribute(
      'aria-label',
      enabled ? '关闭环境声' : '开启环境声',
    );
    el('sound').setAttribute('aria-pressed', String(enabled));
    tell(enabled ? '环境声已开启' : '环境声已关闭');
  } catch {
    tell('环境声暂时无法开启');
  }
};
el<HTMLInputElement>('volume').oninput = (event) =>
  ambience.volume(Number((event.target as HTMLInputElement).value) / 100);
el('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await shell.requestFullscreen();
  } catch {
    tell('当前窗口不支持全屏');
  }
};
const fullscreenChange = () => {
  el('fullscreen').setAttribute(
    'aria-label',
    document.fullscreenElement ? '退出全屏' : '进入全屏',
  );
};
document.addEventListener('fullscreenchange', fullscreenChange);
const onKey = (event: KeyboardEvent) => {
  if (
    settings.open ||
    ['INPUT', 'BUTTON', 'A', 'SUMMARY', 'TEXTAREA'].includes(
      (event.target as HTMLElement).tagName,
    )
  )
    return;
  if (event.code === 'Space') {
    event.preventDefault();
    togglePause();
  }
  if (event.key.toLowerCase() === 'h') {
    event.preventDefault();
    setPhoto(!photoMode);
  }
  if (event.key === 'Escape' && photoMode) {
    event.preventDefault();
    setPhoto(false);
  }
};
const onEscape = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && photoMode) {
    event.preventDefault();
    setPhoto(false);
  }
};
document.addEventListener('keydown', onKey);
document.addEventListener('keydown', onEscape);
const onVisibility = () => {
  ambience.visibility();
  if (document.hidden && state.phase === 'playing') {
    state = { ...state, phase: 'paused' };
    render();
  }
};
document.addEventListener('visibilitychange', onVisibility);
function dispose() {
  if (disposed) return;
  disposed = true;
  stopScene();
  clearTimeout(toastTimer);
  document.removeEventListener('visibilitychange', onVisibility);
  document.removeEventListener('keydown', onKey);
  document.removeEventListener('keydown', onEscape);
  document.removeEventListener('fullscreenchange', fullscreenChange);
}
window.addEventListener('pagehide', dispose, { once: true });
if (import.meta.hot) import.meta.hot.dispose(dispose);
if (reduced) el('input-hint').textContent = '减少动态 · 逐段观景';
syncQuality();
render();
