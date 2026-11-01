import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-serif-sc/600.css';
import './sandbox.css';
import { createRegionalRenderer } from './renderer';
import type { SandboxNode } from './renderer';
import { createTerrainSpace } from './terrain';
import type { Heightfield, RiverData } from './terrain';
import type { UnitSpec } from './units';
import type { Point3 } from './motion';
import { createImmersiveGallery } from './immersive-gallery';
import { createBridgeExperience } from './bridge-experience';

if (!import.meta.env.DEV && import.meta.env.MODE !== 'showcase')
  throw new Error('The sandbox is a development-only presentation.');
const root = document.querySelector<HTMLDivElement>('#sandbox')!;
const icons = {
  play: '<path d="m8 5 11 7-11 7Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  layers: '<path d="m12 3 10 6-10 6L2 9Zm-10 11 10 6 10-6M2 18l10 6 10-6"/>',
  focus:
    '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="4"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>',
  expand: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5m13-5v5h-5"/>',
};
const svg = (name: keyof typeof icons) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
root.innerHTML = `<main class="atlas" aria-label="长征区域沙盘交互演示">
<div class="scene-canvas" id="canvas-host"></div><div id="labels" class="map-labels"></div><div class="vignette" aria-hidden="true"></div>
<header class="topbar"><a class="brand" href="/" aria-label="返回长征展馆"><span class="brand-mark">征</span><span>长征<span class="brand-sep"> / </span>不灭的火种<small>THE LONG MARCH · DIGITAL ATLAS</small></span></a><div class="top-actions"><button id="crossing-entry" class="landscape-launch">峡谷行军 ↗</button><span class="preview-badge">交互演示</span><button class="icon" id="about" aria-label="查看资料与演示说明">${svg('info')}</button><button class="icon" id="fullscreen" aria-label="全屏观看">${svg('expand')}</button></div></header>
<section class="intro"><p class="eyebrow"><i></i> REGION STUDY / 01</p><h1>山河<span>行迹</span></h1><p class="region">大渡河谷 <span>·</span> 区域沙盘</p><p class="intro-line">循山势，观水脉。<br>让行进的轨迹，在眼前展开。</p><div class="region-rule"></div><span class="coordinate">101.96°—102.40° E<br>29.72°—30.12° N</span></section>
<nav class="view-controls" aria-label="沙盘视角"><button id="overview" class="view-button active">${svg('reset')}<span>全览</span></button><button id="top" class="view-button">${svg('layers')}<span>俯瞰</span></button><button id="near" class="view-button">${svg('focus')}<span>近观队伍</span></button><span class="control-line"></span><button id="zoom-in" class="icon" aria-label="放大沙盘">${svg('plus')}</button><button id="zoom-out" class="icon" aria-label="缩小沙盘">${svg('minus')}</button></nav>
<button class="landscape-teaser" id="landscape-teaser" aria-label="进入峡谷查看石壁与军队"><img src="/assets/terrain/scene-kit/bridge-cover.jpg" alt=""/><span>峡谷行军<b>↗</b></span></button>
<div class="compass" aria-hidden="true"><span>N</span><i></i><small>北</small></div>
<aside class="map-key"><p><i class="unit-dot red"></i>行进队伍 <span id="detail-mode">远景标识</span></p><p><i class="unit-dot blue"></i>对照队伍</p><small>示意编队 · 不代表实际兵力</small></aside>
<div class="map-tools"><label><input type="checkbox" id="contours"/>地形层次</label><label><input type="checkbox" id="routes" checked/>行进示意</label><label><input type="checkbox" id="follow"/>跟随队伍</label><button id="quality">精细画质</button><button id="assets-open">场景素材 ↓</button></div>
<p class="gesture">拖动旋转 <b>·</b> 滚轮缩放 <b>·</b> 双指平移</p>
<section class="timeline" aria-label="行进时间轴"><div class="timeline-heading"><div><span class="eyebrow">JOURNEY</span><strong id="stage-title">沿谷启程</strong><span class="timeline-disclosure">演示进度 · 非历史日期与路线</span></div><div class="playback"><button id="replay" class="icon" aria-label="回到起点">${svg('reset')}</button><button id="play" class="play-button" aria-label="播放行进">${svg('play')}</button><button id="speed" aria-label="切换播放速度">1×</button><span id="progress-text">00 / 100</span></div></div>
<div class="scrubber"><input id="time" type="range" min="0" max="1000" value="0" step="1" aria-label="行进时间轴" aria-valuetext="沿谷启程，0%"/><div class="timeline-ticks" aria-label="行进节点"></div></div></section>
<footer class="credit"><span>地形：Mapzen / AWS · USGS · 水系：© OpenStreetMap contributors</span><span>现代地理底图</span></footer>
<div class="loading" id="loading"><span class="loading-ring"></span><strong>山河渐次展开</strong><p>正在载入区域地形与场景</p></div><div class="error" id="error" hidden role="alert"><h2>暂时无法展开沙盘</h2><p></p><button id="retry">重新载入</button></div>
<dialog id="detail-dialog"><button class="dialog-close icon" aria-label="关闭资料">${svg('close')}</button><p class="eyebrow">LANDSCAPE OBSERVATION</p><h2 id="dialog-title"></h2><p id="dialog-text"></p><button id="bridge-entry" class="primary" hidden>进入峡谷行军 <span>↗</span></button><small class="dialog-note">现代地理底图 · 编队与局部场景为艺术演绎。</small></dialog>
<dialog id="assets-dialog"><button class="dialog-close icon" aria-label="关闭素材">×</button><p class="eyebrow">SCENE COLLECTION</p><h2>山河与行军</h2><p>人物、编队、岩壁、桥索与木板共同组成三维场景。环境画面提供远景氛围。</p><a href="/assets/terrain/scene-kit/clay-marcher.glb" download>人物模型 · 含行走动画 ↓</a><br/><a href="/assets/terrain/scene-kit/marching-company.glb" download>十八人编队 · 含旗帜 ↓</a><br/><a href="/assets/textures/immersive-landscapes/river-valley.webp" download>山河之间 · 环境画面 ↓</a><br/><a href="/assets/textures/immersive-landscapes/snow-pass.webp" download>雪岭微光 · 环境画面 ↓</a><br/><a href="/assets/textures/immersive-landscapes/grassland.webp" download>草地回声 · 环境画面 ↓</a><p class="dialog-note">原创白模与艺术环境，用于视觉表达。</p></dialog><dialog id="about-dialog"><button class="dialog-close icon" aria-label="关闭说明">${svg('close')}</button><p class="eyebrow">ABOUT THE ATLAS</p><h2>一张可以走近的地图</h2><p>地形采用 Mapzen / AWS 高程数据，水系来自 OpenStreetMap。当前展示现代地理背景，地形垂直放大 2 倍；树木与人物为表现性模型。</p><p>队伍、节点和时间轴用于验证交互，不对应真实历史行军。近景显示白模，远景显示点与箭头；拖动时间轴可前进或回退。</p><a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noreferrer">高程资料 ↗</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">水系资料与许可 ↗</a><button id="immersive-entry" class="primary">浏览环境印象 ↗</button><button id="legacy-entry" class="primary">体验观桥互动 ↗</button></dialog>
<dialog id="bridge-dialog" class="immersive"><button class="bridge-close" aria-label="返回区域沙盘">← 返回沙盘</button><iframe title="桥谷艺术场景漫游" loading="lazy"></iframe></dialog>
</main>`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const nodes: SandboxNode[] = [
  { id: 'start', title: '沿谷启程', progress: 0, coordinates: [102.2, 29.77] },
  {
    id: 'river',
    title: '水脉之间',
    progress: 0.25,
    coordinates: [102.22, 29.83],
  },
  {
    id: 'bridge',
    title: '峡谷行军',
    progress: 0.5,
    coordinates: [102.225, 29.91],
  },
  {
    id: 'ridge',
    title: '山势渐开',
    progress: 0.75,
    coordinates: [102.2, 29.97],
  },
  { id: 'end', title: '回望来路', progress: 1, coordinates: [102.205, 30.06] },
];
const descriptions: Record<string, string> = {
  start:
    '从河谷的低处开始观察。转动视角，比较两岸山体的高度与坡度，再拖动时间轴查看队伍在地形中的位置。',
  river:
    '水系勾勒出谷地的走向。切换俯瞰视角，观察支流与主河谷的关系；放大后，可查看队伍如何随进度移动。',
  bridge:
    '石壁垂向水面，铁索连起两岸。走近队伍，拖动时间轴，观察编队沿桥行进。',
  ridge:
    '拉近视角，箭头会切换为白色人物模型。队列的规模是视觉示意，不表示任何真实部队的兵力。',
  end: '把时间轴拖回任意位置，队伍与轨迹会同步回到该位置。你也可以回到全览，重新观察整片河谷。',
};
let engine: ReturnType<typeof createRegionalRenderer> | null = null,
  playing = false,
  progress = 0,
  speed = 1,
  low = innerWidth < 700,
  disposed = false;
const time = $<HTMLInputElement>('time');
function openNode(id: string) {
  const node = nodes.find((n) => n.id === id);
  if (!node) return;
  engine?.setProgress(node.progress);
  $('dialog-title').textContent = node.title;
  $('dialog-text').textContent = descriptions[id]!;
  $('bridge-entry').hidden = id !== 'bridge';
  $<HTMLDialogElement>('detail-dialog').showModal();
}
const ticks = document.querySelector('.timeline-ticks')!;
for (const node of nodes) {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<i></i><span>${node.title}</span>`;
  b.style.setProperty('--at', String(node.progress));
  b.setAttribute('aria-label', `前往${node.title}`);
  b.addEventListener('click', () => {
    engine?.setProgress(node.progress);
  });
  ticks.append(b);
}
for (const dialog of document.querySelectorAll<HTMLDialogElement>('dialog')) {
  dialog
    .querySelector('button')
    ?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      const b = dialog.getBoundingClientRect();
      if (
        e.clientX < b.left ||
        e.clientX > b.right ||
        e.clientY < b.top ||
        e.clientY > b.bottom
      )
        dialog.close();
    }
  });
}
$('assets-open').addEventListener('click', () => {
  engine?.play(false);
  $<HTMLDialogElement>('assets-dialog').showModal();
});
$('about').addEventListener('click', () => {
  engine?.play(false);
  $<HTMLDialogElement>('about-dialog').showModal();
});
$('bridge-entry').addEventListener('click', () => {
  $<HTMLDialogElement>('detail-dialog').close();
  crossing.open();
});
$<HTMLDialogElement>('bridge-dialog').addEventListener('close', () => {
  engine?.setSuspended(false);
  $<HTMLDialogElement>('bridge-dialog').querySelector('iframe')!.src =
    'about:blank';
});
const immersiveGallery = createImmersiveGallery(root, {
  onOpen: () => engine?.setSuspended(true),
  onClose: () => engine?.setSuspended(false),
});
const crossing = createBridgeExperience(root, {
  onOpen() {
    const current = engine?.getState().progress ?? progress;
    engine?.setSuspended(true);
    return current;
  },
  onClose(value) {
    engine?.setProgress(value);
    engine?.setSuspended(false);
  },
});
$('crossing-entry').addEventListener('click', () => {
  engine?.setProgress(0.5);
  crossing.open();
});
$('immersive-entry').addEventListener('click', () => {
  $<HTMLDialogElement>('about-dialog').close();
  immersiveGallery.open();
});
$('legacy-entry').addEventListener('click', () => {
  $<HTMLDialogElement>('about-dialog').close();
  const d = $<HTMLDialogElement>('bridge-dialog');
  d.querySelector('iframe')!.src = '../prototype/index.html';
  engine?.setSuspended(true);
  d.showModal();
});
$('landscape-teaser').addEventListener('click', () => {
  engine?.setProgress(0.5);
  crossing.open();
});
$('retry').addEventListener('click', () => location.reload());
function showError(message: string) {
  $('loading').hidden = true;
  $('error').hidden = false;
  $('error').querySelector('p')!.textContent = message;
}
function updateView(id: string) {
  for (const b of document.querySelectorAll('.view-button'))
    b.classList.toggle('active', b.id === id);
  $<HTMLInputElement>('follow').checked = false;
}
$('overview').addEventListener('click', () => {
  engine?.overview();
  updateView('overview');
});
$('top').addEventListener('click', () => {
  engine?.top();
  updateView('top');
});
$('near').addEventListener('click', () => {
  engine?.focusUnit();
  updateView('near');
});
$('zoom-in').addEventListener('click', () => engine?.zoom(0.78));
$('zoom-out').addEventListener('click', () => engine?.zoom(1.28));
time.addEventListener('input', () =>
  engine?.setProgress(Number(time.value) / 1000),
);
$('play').addEventListener('click', () => engine?.play(!playing));
$('replay').addEventListener('click', () => engine?.setProgress(0));
$('speed').addEventListener('click', () => {
  speed = speed === 1 ? 2 : speed === 2 ? 0.5 : 1;
  $('speed').textContent = speed + '×';
  engine?.setSpeed(speed);
});
$('contours').addEventListener('change', (e) =>
  engine?.setContours((e.target as HTMLInputElement).checked),
);
$('routes').addEventListener('change', (e) =>
  engine?.setRoutes((e.target as HTMLInputElement).checked),
);
$('follow').addEventListener('change', (e) =>
  engine?.setFollow((e.target as HTMLInputElement).checked),
);
$('quality').textContent = low ? '轻量画质' : '精细画质';
$('quality').addEventListener('click', () => {
  low = !low;
  engine?.setQuality(low);
  $('quality').textContent = low ? '轻量画质' : '精细画质';
});
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await root.requestFullscreen();
  } catch {
    $('fullscreen').setAttribute(
      'aria-label',
      '浏览器未允许全屏，请继续使用窗口观看',
    );
  }
});
try {
  const [a, b] = await Promise.all([
    fetch('/assets/terrain/dadu-valley/heightfield.json'),
    fetch('/assets/terrain/dadu-valley/rivers.json'),
  ]);
  if (!a.ok || !b.ok) throw new Error('区域地形资料未能载入，请重新载入。');
  const data = (await a.json()) as Heightfield,
    rivers = (await b.json()) as RiverData;
  if (disposed) throw new Error('Scene disposed');
  const space = createTerrainSpace(data);
  // Explicitly isolated engineering choreography. These are not historical routes.
  const red = [
    [102.2, 29.77],
    [102.217, 29.8],
    [102.22, 29.83],
    [102.235, 29.87],
    [102.225, 29.91],
    [102.208, 29.94],
    [102.2, 29.97],
    [102.225, 30.01],
    [102.205, 30.06],
  ];
  const blue = [
    [102.29, 30.06],
    [102.28, 30.03],
    [102.3, 30.0],
    [102.285, 29.97],
    [102.27, 29.95],
    [102.28, 29.92],
    [102.27, 29.89],
  ];
  const paths = (list: number[][]): Point3[] =>
    list.map(
      (c) => space.project(c[0]!, c[1]!).toArray() as [number, number, number],
    );
  const units: UnitSpec[] = [
    {
      id: 'demo-marching',
      name: '行进队伍',
      color: '#ed634b',
      path: paths(red),
    },
    {
      id: 'demo-comparison',
      name: '对照队伍',
      color: '#7ec5d6',
      path: paths(blue),
      offset: -0.12,
    },
  ];
  engine = createRegionalRenderer($('canvas-host'), $('labels'), {
    data,
    rivers,
    units,
    nodes,
    low,
    onNode: openNode,
    onError: showError,
    onFrame: (s) => {
      $('loading').hidden = true;
      $<HTMLInputElement>('follow').checked = s.following;
      const compass = document.querySelector<HTMLElement>('.compass')!;
      compass.style.transform = `rotate(${-s.bearing}rad)`;
      progress = s.progress;
      playing = s.playing;
      time.value = String(Math.round(progress * 1000));
      time.style.setProperty('--progress', progress * 100 + '%');
      const stage = nodes[Math.min(4, Math.floor(progress * 4 + 0.001))]!;
      $('stage-title').textContent = stage.title;
      $('progress-text').textContent =
        String(Math.round(progress * 100)).padStart(2, '0') + ' / 100';
      time.setAttribute(
        'aria-valuetext',
        stage.title + '，' + Math.round(progress * 100) + '%',
      );
      $('play').innerHTML = svg(playing ? 'pause' : 'play');
      $('play').setAttribute('aria-label', playing ? '暂停行进' : '播放行进');
      $('detail-mode').textContent = s.detail ? '近景白模' : '远景标识';
      root.dataset.detail = s.detail ? 'models' : 'symbols';
      root.dataset.progress = progress.toFixed(4);
      root.dataset.fps = String(s.fps);
      root.dataset.triangles = String(s.triangles);
      root.dataset.positions = JSON.stringify(s.positions);
      root.dataset.bearing = s.bearing.toFixed(4);
      root.dataset.playing = String(s.playing);
      for (const [i, button] of [...ticks.children].entries())
        button.classList.toggle('visited', progress >= nodes[i]!.progress);
    },
  });
} catch (error) {
  if (!disposed)
    showError(error instanceof Error ? error.message : '沙盘加载失败。');
}
function dispose() {
  disposed = true;
  crossing.dispose();
  immersiveGallery.dispose();
  engine?.dispose();
  engine = null;
}
window.addEventListener('pagehide', dispose, { once: true });
if (import.meta.hot) import.meta.hot.dispose(dispose);
