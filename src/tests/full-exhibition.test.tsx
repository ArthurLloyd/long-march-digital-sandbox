import { useEffect } from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import raw from '../data/verified/dataset.json';
import { createExhibitionCatalog } from '../app/history/exhibition-catalog';
import {
  createExperienceCatalog,
  resolveHistoricalRoute,
} from '../app/experience/historical-experience-routing';
import { COMPLETION_STORAGE_KEY } from '../app/experience/experience-completion-service';
import type { LongMarchSceneProps } from '../shared/contracts';
import type { EventMapModel } from '../app/history/event-map/event-map-selectors';

vi.mock('../features/scene', () => ({ LongMarchScene: () => <div /> }));
// Only the GPU boundary is replaced. App, routing, drawers, B components and C1 run for real.
vi.mock('../app/landscape/ExhibitionPanorama', () => ({
  ExhibitionPanorama: function MapBoundary(
    props: LongMarchSceneProps & {
      onRegionHistory?: (region: string) => void;
      observationRequest?: string | null;
      onObservationClosed?: () => void;
      eventMap?: EventMapModel | null;
      onExhibitionRead?: (eventId: string) => void;
    },
  ) {
    const { onSceneReady } = props;
    useEffect(() => onSceneReady(), [onSceneReady]);
    return (
      <div aria-label="地图GPU测试边界">
        {props.eventMap && (
          <section aria-label="展陈位置接线测试边界">
            <p>
              {new Set(props.eventMap.entries.map((p) => p.eventId)).size}事件/
              {props.eventMap.entries.length}标记
            </p>
            {[
              ...new Map(
                props.eventMap.entries.map((p) => [p.eventId, p]),
              ).values(),
            ].map((p) => (
              <button
                key={p.eventId}
                onClick={() => props.onExhibitionRead?.(p.eventId)}
              >
                地图阅读{p.displayLabel ?? p.event.title}
              </button>
            ))}
          </section>
        )}
        {props.observationRequest && (
          <section aria-label="区域演绎GPU边界">
            {props.observationRequest}
            <button onClick={props.onObservationClosed}>返回故事资料</button>
          </section>
        )}
        <button onClick={() => props.onRegionHistory?.('snow')}>
          阅读川西高山历史
        </button>
      </div>
    );
  },
}));
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});
async function enter() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: '开启征程' }));
  await user.click(screen.getByRole('button', { name: '立即进入' }));
  await screen.findByText('预览已就绪');
  return user;
}
async function chapters(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole('button', { name: '历史专题6 个专题 · 12 个事件' }),
  );
  return screen.getByRole('dialog', { name: '历史专题' });
}
it('exhibits the exact recorded dataset without manufacturing review or geographic facts', () => {
  const exhibit = createExhibitionCatalog(raw);
  expect(exhibit.published).toEqual(raw);
  expect(exhibit.published.assets).toHaveLength(10);
  expect(exhibit.published.routes).toHaveLength(0);
  expect(exhibit.published.events.every((e) => e.coordinates === null)).toBe(
    true,
  );
  expect(exhibit.published.people.every((p) => p.reviewedBy.length === 0)).toBe(
    true,
  );
  const selection = { kind: 'event' as const, id: 'event-ld' };
  expect(resolveHistoricalRoute(exhibit, selection, []).status).toBe('reading');
  expect(
    resolveHistoricalRoute(createExperienceCatalog(raw), selection, []).status,
  ).toBe('unavailable');
});
it('normal App entry exposes all six real topic bodies directly from the exhibition drawer', async () => {
  const user = await enter();
  expect(screen.queryByText('暂无可发布历史阶段')).not.toBeInTheDocument();
  for (const topic of raw.topics) {
    const dialog = await chapters(user);
    await user.click(
      within(dialog).getByRole('button', { name: `阅读${topic.title}` }),
    );
    const event = raw.events.find((e) => e.id === topic.eventIds[0])!;
    expect(
      screen.getByRole('heading', { name: event.title, level: 3 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText((_text, node) => node?.textContent === event.detail),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始图文互动' })).toBeEnabled();
    expect(screen.queryByText('走进这段历史')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭当前资料' }));
  }
});
it('正常展馆给地图全局事件投影，跨当前阶段直接阅读原正文，不产生C1完成', async () => {
  const user = await enter();
  const boundary = screen.getByLabelText('展陈位置接线测试边界');
  expect(boundary).toHaveTextContent(`${raw.events.length}事件/15标记`);
  await user.click(
    within(boundary).getByRole('button', { name: '地图阅读安顺场渡河' }),
  );
  expect(
    screen.getByRole('heading', { name: '安顺场渡河' }),
  ).toBeInTheDocument();
  const original = raw.events.find((e) => e.id === 'event-anshunchang')!;
  expect(
    screen.getByText((_t, node) => node?.textContent === original.detail),
  ).toBeInTheDocument();
  expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
  await user.click(screen.getByRole('button', { name: '关闭当前资料' }));
  expect(screen.getByLabelText('展陈位置接线测试边界')).toHaveTextContent(
    `${raw.events.length}事件/15标记`,
  );
  expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
});
it('all five same-person photo/art pairs are visible through normal people navigation', async () => {
  const user = await enter();
  for (const id of ['mao', 'zhou', 'zhu', 'liu', 'yang']) {
    const dialog = await chapters(user);
    await user.click(within(dialog).getByText('全部人物与地点资料'));
    const person = raw.people.find((p) => p.personId === 'person-' + id)!;
    await user.click(within(dialog).getByRole('button', { name: person.name }));
    expect(
      screen
        .getAllByRole('img')
        .filter((img) =>
          img.getAttribute('src')?.startsWith('/assets/archive/portraits/'),
        ),
    ).toHaveLength(2);
    expect(screen.getByText('AI 生成艺术形象')).toBeInTheDocument();
    expect(
      screen.queryByText('候选资料，尚未发布；当前展示用于隔离审阅。'),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭当前资料' }));
  }
});
it('supplementary events, all sources and both-army stage evidence are accessible', async () => {
  const user = await enter();
  const dialog = await chapters(user);
  await user.click(within(dialog).getByText('双方部队与阶段资料'));
  for (const track of raw.forceTracks)
    expect(
      within(dialog).getByRole('heading', { name: track.name }),
    ).toBeInTheDocument();
  await user.click(within(dialog).getByText('补充历史事件'));
  await user.click(
    within(dialog).getByRole('button', {
      name: '遵义会议相关决议通过',
    }),
  );
  expect(screen.getByText('1935年2月8日')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '关闭当前资料' }));
  await user.click(screen.getByRole('button', { name: '资料来源' }));
  const sources = screen.getByRole('dialog');
  for (const source of raw.sources)
    expect(sources.textContent).toContain(source.title);
});
it('the existing geographic view opens its associated B history without inventing event points', async () => {
  const user = await enter();
  await user.click(screen.getByRole('button', { name: '阅读川西高山历史' }));
  expect(screen.getByRole('heading', { name: '翻越雪山' })).toBeInTheDocument();
  expect(screen.getByText('未知，不在地图补造位置')).toBeInTheDocument();
});
it('the real C1 five-step Luding flow requires operations, explanations and active completion, then reopens body', async () => {
  const user = await enter();
  const dialog = await chapters(user);
  await user.click(
    within(dialog).getByRole('button', { name: '阅读飞夺泸定桥' }),
  );
  await user.click(screen.getByRole('button', { name: '开始图文互动' }));
  expect(
    screen.getByRole('button', { name: '完成体验，阅读资料' }),
  ).toBeDisabled();
  for (let step = 0; step < 5; step++) {
    await user.click(screen.getByRole('button', { name: '我已阅读本段' }));
    if (step === 1) {
      const q = raw.interactions.find((i) => i.interactionId === 'ld-01')!;
      if (q.interactionType !== 'observe_hotspots')
        throw new Error('bad definition');
      for (const material of q.materials!) {
        await user.click(screen.getByRole('button', { name: material.title }));
        await user.click(
          screen.getByRole('button', { name: '确认已阅读此材料' }),
        );
      }
    }
    if (step === 3)
      await user.click(screen.getByRole('button', { name: '提交本次判断' }));
    if (step === 1 || step === 3) {
      expect(screen.getByRole('button', { name: '继续主线' })).toBeDisabled();
      await user.click(
        screen.getByRole('button', { name: '我已阅读并理解解释' }),
      );
      await user.click(screen.getByRole('button', { name: '继续主线' }));
    }
    if (step < 4)
      await user.click(screen.getByRole('button', { name: '下一段' }));
  }
  expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
  await user.click(screen.getByRole('button', { name: '完成体验，阅读资料' }));
  expect(
    screen.getByRole('heading', { name: '飞夺泸定桥', level: 3 }),
  ).toBeInTheDocument();
  const saved = JSON.parse(localStorage.getItem(COMPLETION_STORAGE_KEY)!);
  expect(saved.records).toHaveLength(1);
  expect(saved.records[0].completedInteractionIds.sort()).toEqual([
    'ld-01',
    'ld-02',
  ]);
  await user.click(screen.getByRole('button', { name: '开始图文互动' }));
  expect(
    screen.getByRole('heading', { name: '第 1 / 5 步' }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '退出体验' }));
  await user.click(screen.getByRole('button', { name: '确认退出，返回沙盘' }));
  expect(
    screen.getByRole('button', { name: '历史专题6 个专题 · 12 个事件' }),
  ).toBeInTheDocument();
});
it('B body remains readable when the photo fails to load', async () => {
  const user = await enter();
  const dialog = await chapters(user);
  await user.click(within(dialog).getByRole('button', { name: '毛泽东' }));
  const image = screen
    .getAllByRole('img')
    .find((img) => img.getAttribute('src')?.endsWith('mao-photo.jpg'))!;
  fireEvent.error(image);
  expect(
    screen.getByText('图片加载失败，仍可阅读文字资料。'),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: '毛泽东', level: 3 }),
  ).toBeInTheDocument();
});

it.each([
  ['飞夺泸定桥', 'luding'],
  ['遵义会议', 'zunyi'],
  ['翻越雪山', 'snow'],
])(
  'opens %s through the existing A scene request and restores B reading on return',
  async (title, region) => {
    const user = await enter();
    const dialog = await chapters(user);
    await user.click(
      within(dialog).getByRole('button', { name: `阅读${title}` }),
    );
    await user.click(screen.getByRole('button', { name: '观看场景演绎' }));
    expect(
      screen.getByRole('region', { name: '区域演绎GPU边界' }),
    ).toHaveTextContent(region);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
    await user.click(screen.getByRole('button', { name: '返回故事资料' }));
    expect(
      await screen.findByRole('heading', { name: title, level: 3 }),
    ).toBeInTheDocument();
    expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
  },
);
