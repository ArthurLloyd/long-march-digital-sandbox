import { createPanorama } from './panorama';
import './immersive-gallery.css';

const base = '/assets/textures/immersive-landscapes/';
const scenes = [
  {
    id: 'river-valley',
    title: '山河之间',
    subtitle: '峡谷 · 水脉 · 晨光',
    line: '循着水声，走进群山的深处。',
    number: '01',
  },
  {
    id: 'snow-pass',
    title: '雪岭微光',
    subtitle: '雪脊 · 云海 · 远山',
    line: '越过雪脊，天光仍在远方。',
    number: '02',
  },
  {
    id: 'grassland',
    title: '草地回声',
    subtitle: '湿地 · 草甸 · 天际',
    line: '风经过草甸，天地渐渐开阔。',
    number: '03',
  },
];

/** Independent art gallery. No invented event dates, locations or history IDs. */
export function createImmersiveGallery(
  container: HTMLElement,
  hooks: { onOpen(): void; onClose(): void },
) {
  const dialog = document.createElement('dialog');
  dialog.className = 'landscape-dialog';
  dialog.setAttribute('aria-label', '走进山河，沉浸环境艺术再现');
  dialog.innerHTML = `<div class="landscape-stage" hidden></div><div class="landscape-shade" aria-hidden="true"></div>
    <header class="landscape-header"><button class="landscape-return">← 返回沙盘</button><span>山河行迹 <i>/</i> IMMERSIVE LANDSCAPES</span><small>AI 艺术再现</small></header>
    <section class="landscape-directory"><div class="landscape-heading"><p class="eyebrow">A JOURNEY INTO THE LANDSCAPE</p><h2>走进<span>山河</span></h2><p>从一幅地图，走进一片天地。</p></div><div class="landscape-cards">${scenes.map((s) => `<button class="landscape-card" data-scene="${s.id}" aria-label="环顾${s.title}"><img src="${base}${s.id}-cover.webp" alt=""/><span class="landscape-card-shade"></span><span class="landscape-card-number">${s.number} / 环境篇</span><span class="landscape-card-copy"><small>${s.subtitle}</small><strong>${s.title}</strong><span>进入环顾 <b>↗</b></span></span></button>`).join('')}</div><p class="landscape-disclosure">环境概念场景 · 非历史实景复原</p></section>
    <section class="landscape-view-ui" hidden><div class="landscape-caption"><p class="eyebrow">LANDSCAPE <span class="landscape-number"></span> / 03</p><h2></h2><p class="landscape-line"></p></div><div class="landscape-view-tools"><button data-action="out" aria-label="全景缩小">−</button><button data-action="in" aria-label="全景放大">＋</button><button data-action="home">初始视角</button><button data-action="fullscreen">全屏</button></div><nav class="landscape-switch" aria-label="切换沉浸场景">${scenes.map((s) => `<button data-scene="${s.id}" aria-label="切换到${s.title}" aria-pressed="false"><img src="${base}${s.id}-cover.webp" alt=""/><span>${s.title}</span></button>`).join('')}</nav><p class="landscape-gesture">拖动环顾 · 滚轮或双指缩放</p><button class="landscape-seam" data-action="seam" hidden>查看接缝</button></section>
    <div class="landscape-loading" hidden role="status"><span class="loading-ring"></span><p>正在走进山河</p><button hidden>重新载入</button></div>`;
  container.append(dialog);
  if (new URLSearchParams(location.search).has('inspect'))
    dialog.querySelector<HTMLButtonElement>('.landscape-seam')!.hidden = false;
  const $ = <T extends HTMLElement>(selector: string) =>
    dialog.querySelector<T>(selector)!;
  const stage = $<HTMLDivElement>('.landscape-stage');
  const directory = $<HTMLElement>('.landscape-directory');
  const ui = $<HTMLElement>('.landscape-view-ui');
  const loading = $<HTMLElement>('.landscape-loading');
  const back = $<HTMLButtonElement>('.landscape-return');
  let viewer: ReturnType<typeof createPanorama> | null = null,
    current = '',
    request = 0;
  let returnFocus: HTMLElement | null = null;
  function clearViewer() {
    request++;
    viewer?.dispose();
    viewer = null;
    stage.hidden = true;
    ui.hidden = true;
    loading.hidden = true;
    current = '';
  }
  async function select(id: string) {
    const scene = scenes.find((s) => s.id === id);
    if (!scene) return;
    current = id;
    const ticket = ++request;
    directory.hidden = true;
    stage.hidden = false;
    ui.hidden = false;
    dialog.classList.add('is-viewing');
    back.textContent = '← 场景目录';
    $<HTMLElement>('.landscape-caption h2').textContent = scene.title;
    $<HTMLElement>('.landscape-line').textContent = scene.line;
    $<HTMLElement>('.landscape-number').textContent = scene.number;
    for (const b of dialog.querySelectorAll<HTMLButtonElement>(
      '.landscape-switch button',
    ))
      b.setAttribute('aria-pressed', String(b.dataset.scene === id));
    loading.hidden = false;
    loading.querySelector('p')!.textContent = '正在走进山河';
    loading.querySelector('button')!.hidden = true;
    try {
      viewer ??= createPanorama(stage);
      const loaded = await viewer.load(`${base}${id}.webp`);
      if (!loaded || ticket !== request) return;
      loading.hidden = true;
      viewer.focus();
    } catch {
      if (ticket !== request) return;
      loading.querySelector('p')!.textContent = '画面暂时未能载入';
      loading.querySelector('button')!.hidden = false;
    }
  }
  dialog.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
      'button',
    );
    if (button?.dataset.scene) void select(button.dataset.scene);
    switch (button?.dataset.action) {
      case 'in':
        viewer?.zoom(-6);
        break;
      case 'out':
        viewer?.zoom(6);
        break;
      case 'home':
        viewer?.home();
        break;
      case 'seam':
        viewer?.seam();
        break;
      case 'fullscreen':
        void (
          document.fullscreenElement
            ? document.exitFullscreen()
            : dialog.requestFullscreen()
        ).catch(() => {
          button.textContent = '窗口观看';
        });
        break;
    }
  });
  loading
    .querySelector('button')!
    .addEventListener('click', () => void select(current));
  back.addEventListener('click', () => {
    if (current) {
      clearViewer();
      directory.hidden = false;
      dialog.classList.remove('is-viewing');
      back.textContent = '← 返回沙盘';
      $<HTMLButtonElement>('.landscape-card').focus();
    } else dialog.close();
  });
  dialog.addEventListener('close', () => {
    clearViewer();
    hooks.onClose();
    returnFocus?.focus({ preventScroll: true });
  });
  return {
    open() {
      if (dialog.open) return;
      returnFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      directory.hidden = false;
      dialog.classList.remove('is-viewing');
      back.textContent = '← 返回沙盘';
      hooks.onOpen();
      dialog.showModal();
    },
    dispose() {
      if (dialog.open) dialog.close();
      clearViewer();
      dialog.remove();
    },
  };
}
