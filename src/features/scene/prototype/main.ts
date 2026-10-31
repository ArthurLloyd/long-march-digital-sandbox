import '@fontsource/noto-serif-sc/600.css';
import '@fontsource/noto-sans-sc/400.css';
import './study.css';
import { createBridgeStudy } from './bridge-renderer';
import {
  advanceStudy,
  continueStudy,
  createStudy,
  observeStudy,
} from './sequence';

// This entry has no route from the production application and cannot run in production.
if (!import.meta.env.DEV)
  throw new Error('A0 study is available in development only.');

const root = document.querySelector<HTMLDivElement>('#study')!;
root.innerHTML = `
  <main class="study-shell" data-phase="idle">
    <div class="canvas-host" id="canvas-host"></div><div class="vignette" aria-hidden="true"></div>
    <header class="study-header">
      <a class="brand" href="/" aria-label="回到长征数字展馆"><span class="brand-seal" aria-hidden="true">征</span><span>长征<small>不灭的火种</small></span></a>
      <div class="edition"><span>SCENE STUDY</span><b>01 / 河谷与桥</b></div>
      <button class="text-button" id="exit">退出小样 <span aria-hidden="true">↗</span></button>
    </header>
    <div class="study-label"><span></span>非地理艺术场景 · 工程预览</div>
    <section class="intro" id="intro" aria-labelledby="study-title">
      <p class="eyebrow">山河之间 · 一次空间叙事的探索</p>
      <h1 id="study-title">一桥，<br>连接山河。</h1>
      <p class="intro-copy">从远山到桥索，从俯瞰到凝望。<br>沿着镜头，走近空间里的每一处细节。</p>
      <button class="begin-button" id="begin"><span>进入场景<small>约 60 秒 · 两处观察停点</small></span><span class="begin-arrow" aria-hidden="true">→</span></button>
      <p class="intro-footnote">原创程序几何，不代表泸定桥历史原貌。</p>
    </section>
    <aside class="chapter-note" id="chapter-note" hidden>
      <span class="eyebrow" id="chapter-number">01 / 远观</span>
      <h2 id="chapter-title">让视线进入山河</h2>
      <p id="chapter-copy">拖动环顾，或用右侧预设视角观察。</p>
    </aside>
    <nav class="view-controls" aria-label="场景视角">
      <span class="vertical-label" aria-hidden="true">VIEWPOINT</span>
      <button data-pose="0" aria-label="远观河谷" title="远观河谷">01<small>远观</small></button>
      <button data-pose="1" aria-label="近看桥体" title="近看桥体">02<small>近看</small></button>
      <button data-pose="2" aria-label="回望两岸" title="回望两岸">03<small>回望</small></button>
      <button id="camera-reset" aria-label="恢复预设镜头" title="恢复预设镜头">↺<small>复位</small></button>
    </nav>
    <section class="interaction" id="interaction" aria-labelledby="interaction-title" hidden tabindex="-1">
      <p class="eyebrow">镜头已暂停 · 观察以后再继续</p>
      <h2 id="interaction-title">桥与两岸，如何构成空间？</h2>
      <p class="interaction-description">分别打开两个观察项。这里说明设计方法，不作为历史材料。</p>
      <div class="observation-list">
        <button data-observe="bridge"><span>01</span><b>看桥体<small>轮廓 · 结构 · 尺度</small></b><i>打开 ↗</i></button>
        <button data-observe="banks"><span>02</span><b>看两岸<small>层次 · 光线 · 留白</small></b><i>打开 ↗</i></button>
      </div>
      <p class="material-copy" id="material-copy" role="status">选择一个观察项，查看它的设计说明。</p>
      <button class="solid-button" id="observe-continue" disabled>查看两项后继续 →</button>
    </section>
    <section class="interaction reflection" id="reflection" aria-labelledby="reflection-title" hidden tabindex="-1">
      <p class="eyebrow">第二个停点 · 区分画面与证据</p>
      <h2 id="reflection-title">画面所呈现的，<br>不等于历史已被证实。</h2>
      <p>桥的尺寸、山体起伏、雾、水与光均为程序设计。正式体验须由经核验的剧本与素材约束这些表现。</p>
      <button class="outlined-button" id="acknowledge">查看说明并确认</button>
      <p id="reflection-feedback" role="status"></p>
      <button class="solid-button" id="reflect-continue" disabled>确认后继续 →</button>
    </section>
    <section class="end-card" id="end-card" hidden tabindex="-1">
      <p class="eyebrow">SCENE STUDY / 01</p><h2 id="end-title">镜头抵达，故事待续。</h2>
      <p id="end-copy">工程小样已走完两个观察停点。<br>正式历史体验仍待剧本、素材与系统接入。</p>
      <button class="solid-button" id="restart">重新体验 ↺</button><a href="/" class="outlined-button">回到数字展馆 ↗</a>
    </section>
    <section class="error-card" id="error-card" role="alert" hidden><h2>场景暂时无法显示</h2><p id="error-copy"></p><button id="retry" class="solid-button">重新载入</button><a href="/">回到展馆</a></section>
    <footer class="study-footer">
      <div class="playback"><button class="pause-button" id="pause" aria-label="暂停镜头" disabled>Ⅱ</button><div><p id="playback-caption">一段关于空间、光线与信念的视觉习作</p><div class="progress-track" role="progressbar" aria-label="小样进度" aria-valuemin="0" aria-valuemax="60" aria-valuenow="0"><span id="progress"></span></div></div><output id="time">00:00 / 01:00</output><button class="text-button" id="step" hidden>下一段 →</button></div>
      <div class="footer-meta"><span id="input-hint">拖动环顾 · 滚轮缩放 · 方向键微调</span><div><button class="text-button" id="quality" aria-pressed="false">画质：标准</button><span class="muted-label">无声 · 文字引导</span><button class="text-button" id="metrics-toggle" aria-expanded="false">运行信息 ＋</button></div></div>
    </footer>
    <output class="metrics" id="metrics" hidden>正在采集实际渲染数据…</output>
    <p class="sr-only" id="announcer" role="status" aria-live="polite"></p>
  </main>`;

function element<T extends HTMLElement = HTMLElement>(id: string) {
  return document.getElementById(id) as T;
}
const shell = root.querySelector<HTMLElement>('.study-shell')!;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let state = createStudy();
let study: ReturnType<typeof createBridgeStudy> | undefined;
let failed = false;
let low = matchMedia('(max-width: 700px)').matches;
let previousPhase = state.phase;
let announce = '';
const intro = element('intro');
const pause = element<HTMLButtonElement>('pause');
const step = element<HTMLButtonElement>('step');
if (reduced) {
  element('input-hint').textContent = '减少动态已开启 · 使用「下一段」逐步观察';
}

function focusPanel(id: string) {
  element(id).focus({ preventScroll: true });
}
function render() {
  shell.dataset.phase = failed ? 'error' : state.phase;
  intro.hidden = state.phase !== 'idle' || failed;
  const ongoing =
    ['playing', 'paused', 'observe', 'reflect'].includes(state.phase) &&
    !failed;
  element('chapter-note').hidden = !ongoing;
  element('interaction').hidden = state.phase !== 'observe' || failed;
  element('reflection').hidden = state.phase !== 'reflect' || failed;
  element('end-card').hidden =
    !['ended', 'exited'].includes(state.phase) || failed;
  pause.disabled =
    !['playing', 'paused'].includes(state.phase) || failed || reduced;
  pause.textContent = state.phase === 'paused' ? '▷' : 'Ⅱ';
  pause.setAttribute(
    'aria-label',
    state.phase === 'paused' ? '继续镜头' : '暂停镜头',
  );
  step.hidden = !reduced || state.phase !== 'playing' || failed;
  const elapsed = Math.floor(state.elapsed);
  element('time').textContent =
    `00:${String(elapsed % 60).padStart(2, '0')} / 01:00`;
  if (elapsed === 60) element('time').textContent = '01:00 / 01:00';
  element('progress').style.width = `${(state.elapsed / 60) * 100}%`;
  root
    .querySelector('[role="progressbar"]')!
    .setAttribute('aria-valuenow', String(elapsed));
  study?.setTime(state.elapsed);
  const chapter = state.elapsed < 16 ? 0 : state.elapsed < 40 ? 1 : 2;
  element('chapter-number').textContent = [
    '01 / 远观河谷',
    '02 / 近看桥体',
    '03 / 回望两岸',
  ][chapter]!;
  element('chapter-title').textContent = [
    '让视线进入山河',
    '凝望连接的力量',
    '在山河之间回望',
  ][chapter]!;
  element('chapter-copy').textContent =
    state.phase === 'paused'
      ? '镜头已暂停。继续后从此处推进。'
      : '可自由环顾，也可选择预设视角。';
  element('playback-caption').textContent =
    state.phase === 'observe' || state.phase === 'reflect'
      ? '等待你的观察 · 时间已暂停'
      : state.phase === 'paused'
        ? '已暂停 · 观察此刻的光与影'
        : state.phase === 'idle'
          ? '一段关于空间、光线与信念的视觉习作'
          : '艺术工程小样 · 不写入历史体验完成记录';
  if (state.phase !== previousPhase) {
    if (state.phase === 'observe') {
      focusPanel('interaction');
      announce = '到达第一个停点。请分别打开桥体与两岸的设计说明。';
    }
    if (state.phase === 'reflect') {
      focusPanel('reflection');
      announce = '到达第二个停点。请阅读并确认艺术表现与历史证据的区别。';
    }
    if (state.phase === 'ended') {
      focusPanel('end-card');
      announce = '工程演示结束，未记录历史体验完成状态。';
    }
    element('announcer').textContent = announce;
    previousPhase = state.phase;
  }
}
function fail(message: string) {
  failed = true;
  if (state.phase === 'playing') state = { ...state, phase: 'paused' };
  element('error-card').hidden = false;
  element('error-copy').textContent = message;
  render();
}
try {
  study = createBridgeStudy(element('canvas-host'), {
    reduced,
    onFrame(delta) {
      if (!reduced) {
        const next = advanceStudy(state, delta);
        if (next !== state) {
          state = next;
          render();
        }
      }
    },
    onMetrics(metrics) {
      const text = `${metrics.fps.toFixed(1)} FPS · 帧间隔 p95 ${metrics.p95.toFixed(1)} ms\n${metrics.calls} draw calls · ${metrics.triangles.toLocaleString()} triangles\n${metrics.geometries} geometries · ${metrics.textures} textures\n${innerWidth} × ${innerHeight} · DPR ≤ ${low ? 1 : 1.5}\n${low ? '低画质 / 无阴影' : '标准画质'} · 渲染上限约 30 FPS`;
      element('metrics').textContent = text;
      element('metrics').dataset.sample = JSON.stringify(metrics);
    },
    onError: fail,
  });
  study.quality(low);
} catch {
  fail(
    '当前浏览器无法创建 WebGL 场景。可以返回展馆阅读说明；未生成体验完成记录。',
  );
}
element('begin').onclick = () => {
  state = continueStudy(state);
  study?.resumeCamera();
  render();
  (reduced ? step : pause).focus();
};
pause.onclick = () => {
  state =
    state.phase === 'playing'
      ? { ...state, phase: 'paused' }
      : continueStudy(state);
  render();
};
step.onclick = () => {
  state = advanceStudy(
    state,
    state.elapsed < 16
      ? 16 - state.elapsed
      : state.elapsed < 40
        ? 40 - state.elapsed
        : 60 - state.elapsed,
  );
  study?.pose(state.elapsed <= 16 ? 1 : 2);
  render();
};
root.querySelectorAll<HTMLButtonElement>('[data-pose]').forEach((button) => {
  button.onclick = () => study?.pose(Number(button.dataset.pose));
});
element('camera-reset').onclick = () => {
  study?.pose(0);
  if (state.phase === 'playing') study?.resumeCamera();
};
root.querySelectorAll<HTMLButtonElement>('[data-observe]').forEach((button) => {
  button.onclick = () => {
    const id = button.dataset.observe as 'bridge' | 'banks';
    state = observeStudy(state, id);
    button.querySelector('i')!.textContent = '已查看 ✓';
    button.setAttribute('aria-pressed', 'true');
    study?.pose(id === 'bridge' ? 1 : 2);
    element('material-copy').textContent =
      id === 'bridge'
        ? '桥体｜桥面、悬索和吊杆以原创几何构成。尺寸与结构均为工程设定，仅用于验证镜头和可观察性，不是泸定桥测绘或历史复原。'
        : '两岸｜层叠岩体、冷暖对比与薄雾形成纵深。山体、水位和天气均为艺术表现，不支持真实地点、当时天气或行军路线的判断。';
    const buttonContinue = element<HTMLButtonElement>('observe-continue');
    buttonContinue.disabled = state.observed.length !== 2;
    buttonContinue.textContent = buttonContinue.disabled
      ? '再查看另一项'
      : '已查看两项，继续 →';
  };
});
element('observe-continue').onclick = () => {
  state = continueStudy(state);
  study?.resumeCamera();
  render();
  (reduced ? step : pause).focus();
};
element('acknowledge').onclick = () => {
  state = { ...state, confirmed: true };
  element('reflection-feedback').textContent =
    '已确认：场景提供空间感受，历史结论须回到可核验的资料。';
  element<HTMLButtonElement>('reflect-continue').disabled = false;
  element('reflect-continue').textContent = '已确认，继续 →';
};
element('reflect-continue').onclick = () => {
  state = continueStudy(state);
  study?.resumeCamera();
  render();
  (reduced ? step : pause).focus();
};
element('exit').onclick = () => {
  state = { ...state, phase: 'exited' };
  study?.dispose();
  study = undefined;
  element('end-title').textContent = '暂别山河，随时再来。';
  element('end-copy').textContent =
    '已退出工程小样。本次不会保存任何历史体验完成状态。';
  render();
  focusPanel('end-card');
};
element('restart').onclick = () => window.location.reload();
element('retry').onclick = () => window.location.reload();
element('quality').textContent = low ? '画质：低' : '画质：标准';
element('quality').setAttribute('aria-pressed', String(low));
element('quality').onclick = () => {
  low = !low;
  study?.quality(low);
  element('quality').textContent = low ? '画质：低' : '画质：标准';
  element('quality').setAttribute('aria-pressed', String(low));
};
element('metrics-toggle').onclick = () => {
  const metrics = element('metrics');
  metrics.hidden = !metrics.hidden;
  element('metrics-toggle').setAttribute(
    'aria-expanded',
    String(!metrics.hidden),
  );
};
const onVisibility = () => {
  if (document.hidden && state.phase === 'playing') {
    state = { ...state, phase: 'paused' };
    render();
  }
};
document.addEventListener('visibilitychange', onVisibility);
window.addEventListener(
  'pagehide',
  () => {
    study?.dispose();
    document.removeEventListener('visibilitychange', onVisibility);
  },
  { once: true },
);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    study?.dispose();
    document.removeEventListener('visibilitychange', onVisibility);
  });
render();
