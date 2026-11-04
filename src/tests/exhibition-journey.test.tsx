import { useEffect } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import raw from '../data/verified/dataset.json';
import { COMPLETION_STORAGE_KEY } from '../app/experience/experience-completion-service';
import { GEOGRAPHIC_VIEWS } from '../app/landscape/map-regions';
import { isGeographicRegion } from '../app/exhibition/exhibition-content';
import { eventTerrainBounds } from '../app/landscape/event-terrain';
import type { ComponentProps } from 'react';
import type { ExhibitionPanorama } from '../app/landscape/ExhibitionPanorama';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import {
  journeyChapters,
  type JourneyTransport,
} from '../features/timeline/journey';
const cameraBoundary = vi.hoisted(() => ({
  focusGeo: vi.fn(),
  focus: vi.fn(),
  overview: vi.fn(),
  frameMarch: vi.fn(),
  focusMarch: vi.fn(),
  prepareRegion: vi.fn(),
  holdCamera: vi.fn(),
  transport: null as JourneyTransport | null,
  restore: vi.fn(),
}));

// GPU only: the normal shell, C2 transport, C1 reducer and B components remain real.
vi.mock('../app/landscape/ExhibitionPanorama', () => ({
  ExhibitionPanorama: function MapBoundary(
    p: ComponentProps<typeof ExhibitionPanorama>,
  ) {
    const { onSceneReady, onMapAdapter } = p;
    useEffect(() => {
      cameraBoundary.transport = p.journey ?? null;
    }, [p.journey]);
    useEffect(() => onSceneReady(), [onSceneReady]);
    useEffect(() => {
      onMapAdapter?.({
        ...cameraBoundary,
        bookmark: () => ({
          sceneId: 'long-march-modern-panorama',
          position: [0, 4, 6],
          target: [0, 0, 0],
        }),
        setJourneyMarker: vi.fn(),
        entry: vi.fn(),
        setMarkers: vi.fn(),
        setForceRegions: vi.fn(),
        zoom: vi.fn(),
        setRoutes: vi.fn(),
        setRivers: vi.fn(),
        setVerticalExaggeration: vi.fn(),
        suspend: vi.fn(),
        dispose: vi.fn(),
      });
      return () => onMapAdapter?.(null);
    }, [onMapAdapter]);
    return (
      <section aria-label="地图GPU边界" data-march={p.showMarch}>
        <output aria-label="当前区域">{p.geographicRegion ?? 'global'}</output>
        <button onClick={() => p.onGeographicBrowse?.(null)}>缩小到全景</button>
        <button onClick={() => p.onGeographicBrowse?.('chishui')}>
          滚轮靠近赤水
        </button>
        {GEOGRAPHIC_VIEWS.map((v) => (
          <button key={v.id} onClick={() => p.onBrowseRegion?.(v.id)}>
            {v.title}
          </button>
        ))}
        {(p.eventMap?.entries ?? []).map((e) => (
          <button
            key={e.placementId}
            onClick={() => p.onExhibitionRead?.(e.eventId)}
          >
            阅读地图{e.event.title}
          </button>
        ))}
        {p.observationRequest && (
          <aside aria-label="A场景公共边界">
            <p>
              {p.observationRequest} / {p.observationScope}
            </p>
            <button onClick={p.onObservationClosed}>退出A场景</button>
          </aside>
        )}
      </section>
    );
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

it('drives the camera for every chapter of all three sequences, with regional and local handoffs', async () => {
  const user = await enter(),
    content = createJourneyContent(raw, 'exhibition');
  await user.click(screen.getByRole('button', { name: '自由探索山河' }));
  let checked = 0;
  for (const sequence of content.plan.sequences) {
    await user.selectOptions(screen.getByLabelText('序列'), sequence.id);
    for (const chapter of sequence.chapterIds) {
      const before =
        cameraBoundary.focusMarch.mock.calls.length +
        cameraBoundary.focusGeo.mock.calls.length +
        cameraBoundary.focus.mock.calls.length +
        cameraBoundary.overview.mock.calls.length;
      await user.selectOptions(screen.getByLabelText('跳转行军章节'), chapter);
      if (checked > 0)
        expect(
          cameraBoundary.focusMarch.mock.calls.length +
            cameraBoundary.focusGeo.mock.calls.length +
            cameraBoundary.focus.mock.calls.length +
            cameraBoundary.overview.mock.calls.length,
        ).toBeGreaterThanOrEqual(before);
      expect(screen.getByLabelText('跳转行军章节')).toHaveValue(chapter);
      checked++;
    }
  }
  expect(checked).toBe(33);
  expect(
    cameraBoundary.focusGeo.mock.calls.some((c) => c[2] === 'regional'),
  ).toBe(true);
  expect(cameraBoundary.focusGeo.mock.calls.some((c) => c[2] === 'local')).toBe(
    true,
  );
  expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it('uses the same overview, moving corridor and close arrival flow for all regional transfer chapters', async () => {
  const user = await enter(),
    c = createJourneyContent(raw, 'exhibition');
  await user.click(screen.getByRole('button', { name: '自由探索山河' }));
  for (const chapter of journeyChapters(c.plan, 'central')) {
    if (chapter.id === 'chapter-event-sd') continue; // The joined field has its own seamless handoff regression below.
    if (
      !c.plan.tracks.some(
        (t) =>
          t.chapterId === chapter.id && t.presentation === 'regional_transfer',
      )
    )
      continue;
    await user.selectOptions(screen.getByLabelText('跳转行军章节'), chapter.id);
    expect(screen.getByLabelText('当前区域')).toHaveTextContent('global');
    expect(cameraBoundary.frameMarch).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('行军演示进度'), {
      target: { value: chapter.start + chapter.duration * 0.5 },
    });
    expect(cameraBoundary.frameMarch).toHaveBeenCalled();
    expect(screen.getByLabelText('当前区域')).toHaveTextContent('global');
    const before = cameraBoundary.focusMarch.mock.calls.length;
    fireEvent.change(screen.getByLabelText('行军演示进度'), {
      target: { value: chapter.start + chapter.duration * chapter.arrival },
    });
    expect(
      cameraBoundary.focusMarch.mock.calls.length,
      chapter.id,
    ).toBeGreaterThan(before);
  }
});

it('loads the arriving region and moves into follow scale before opening every story from Jinsha onward', async () => {
  await enter();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  const c = createJourneyContent(raw, 'exhibition');
  const chapters = journeyChapters(c.plan, 'central');
  const remaining = chapters.slice(
    chapters.findIndex((c) => c.id === 'chapter-event-js'),
  );
  for (const chapter of remaining) {
    fireEvent.change(screen.getByLabelText('跳转行军章节'), {
      target: { value: chapter.id },
    });
    fireEvent.change(screen.getByLabelText('行军演示进度'), {
      target: {
        value: chapter.start + chapter.duration * chapter.arrival - 0.1,
      },
    });
    cameraBoundary.focusMarch.mockClear();
    cameraBoundary.prepareRegion.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '开始或继续行军' }));
    act(() => cameraBoundary.transport!.advance(1));
    const event = c.dataset.events.find((e) => e.id === chapter.eventIds[0])!;
    if (chapter.id === 'chapter-ex-event-jiangtai') {
      const book = screen.getByRole('dialog', { name: '长征胜利 · 薪火长明' });
      expect(book).toBeVisible();
      expect(
        within(book).getByText('长征的胜利，保存和锻炼了'),
      ).toBeInTheDocument();
      expect(cameraBoundary.focusMarch).toHaveBeenCalledWith('follow');
      fireEvent.click(within(book).getByRole('button', { name: '返回地图' }));
      expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
      continue;
    }
    expect(
      screen.getByRole('button', { name: `已到达${event.title}，点击阅读` }),
      chapter.id,
    ).toBeVisible();
    expect(cameraBoundary.focusMarch, chapter.id).toHaveBeenCalledWith(
      'follow',
    );
    const placement = c.map.entries.find((p) =>
      chapter.eventIds.includes(p.eventId),
    )!;
    const eventBounds = eventTerrainBounds(placement.anchorCoordinates);
    if (eventBounds) {
      expect(cameraBoundary.prepareRegion, chapter.id).toHaveBeenCalledWith(
        null,
        eventBounds,
      );
    } else if (isGeographicRegion(chapter.regionId)) {
      expect(cameraBoundary.prepareRegion, chapter.id).toHaveBeenCalledWith(
        chapter.regionId,
      );
      expect(screen.getByLabelText('当前区域')).toHaveTextContent(
        chapter.regionId,
      );
    } else {
      const placement = c.map.entries.find((p) =>
        chapter.eventIds.includes(p.eventId),
      )!;
      expect(cameraBoundary.prepareRegion, chapter.id).toHaveBeenCalledWith(
        null,
        placement.bounds,
      );
      expect(
        screen.getByRole('button', { name: `阅读地图${event.title}` }),
      ).toBeVisible();
    }
    expect(
      screen.getByRole('button', { name: '开始或继续行军' }),
    ).toBeVisible();
    act(() => vi.advanceTimersByTime(3000));
    expect(
      screen.getByRole('dialog', { name: event.title }),
      chapter.id,
    ).toBeVisible();
    fireEvent.click(
      within(screen.getByRole('dialog', { name: event.title })).getByRole(
        'button',
        { name: '关闭面板' },
      ),
    );
    act(() => vi.advanceTimersByTime(20));
    expect(
      screen.getByRole('button', { name: '开始或继续行军' }),
    ).toBeVisible();
  }
  expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
});

it('loads the arriving terrain in free mode while keeping the chosen camera mode and composition', async () => {
  const user = await enter();
  const c = createJourneyContent(raw, 'exhibition');
  const chapter = journeyChapters(c.plan, 'central').find(
    (c) => c.id === 'chapter-event-js',
  )!;
  await user.selectOptions(screen.getByLabelText('跳转行军章节'), chapter.id);
  fireEvent.change(screen.getByLabelText('行军演示进度'), {
    target: { value: chapter.start + chapter.duration * chapter.arrival - 0.1 },
  });
  await user.click(screen.getByRole('button', { name: '自由' }));
  cameraBoundary.focusMarch.mockClear();
  cameraBoundary.prepareRegion.mockClear();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  fireEvent.click(screen.getByRole('button', { name: '开始或继续行军' }));
  act(() => cameraBoundary.transport!.advance(1));
  expect(
    screen.getByRole('button', { name: '已到达巧渡金沙江，点击阅读' }),
  ).toBeVisible();
  expect(cameraBoundary.prepareRegion).toHaveBeenCalledWith('jinsha');
  expect(cameraBoundary.focusMarch).not.toHaveBeenCalled();
  expect(cameraBoundary.holdCamera).toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '自由' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('keeps the joined Zunyi–Chishui terrain and user composition through both automatic and manual chapter handoffs', async () => {
  const user = await enter(),
    c = createJourneyContent(raw, 'exhibition');
  await user.selectOptions(
    screen.getByLabelText('跳转行军章节'),
    'chapter-event-zy',
  );
  await user.click(screen.getByRole('button', { name: '自由' }));
  for (const method of [
    cameraBoundary.focusMarch,
    cameraBoundary.frameMarch,
    cameraBoundary.focusGeo,
    cameraBoundary.overview,
  ])
    method.mockClear();
  await user.click(screen.getByRole('button', { name: '下一行军章节' }));
  expect(screen.getByLabelText('跳转行军章节')).toHaveValue('chapter-event-sd');
  expect(screen.getByRole('button', { name: '自由' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByLabelText('当前区域')).toHaveTextContent('chishui');
  expect(cameraBoundary.prepareRegion).toHaveBeenCalledWith('chishui');
  for (const method of [
    cameraBoundary.focusMarch,
    cameraBoundary.frameMarch,
    cameraBoundary.focusGeo,
    cameraBoundary.overview,
  ])
    expect(method).not.toHaveBeenCalled();
  const next = journeyChapters(c.plan, 'central').find(
    (x) => x.id === 'chapter-event-sd',
  )!;
  await user.selectOptions(
    screen.getByLabelText('跳转行军章节'),
    'chapter-event-zy',
  );
  fireEvent.change(screen.getByLabelText('行军演示进度'), {
    target: { value: next.start + 0.1 },
  });
  expect(screen.getByLabelText('当前区域')).toHaveTextContent('chishui');
  expect(cameraBoundary.frameMarch).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: '自由' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

it('the final book can reveal text, open the reunion story, close, and restart without creating completion', async () => {
  const user = await enter(),
    c = createJourneyContent(raw, 'exhibition');
  const final = journeyChapters(c.plan, 'central').at(-1)!;
  fireEvent.change(screen.getByLabelText('行军演示进度'), {
    target: { value: final.start + final.duration * final.arrival - 0.1 },
  });
  await user.click(screen.getByRole('button', { name: '开始或继续行军' }));
  act(() => cameraBoundary.transport!.advance(1));
  const book = screen.getByRole('dialog', { name: '长征胜利 · 薪火长明' });
  await user.click(within(book).getByRole('button', { name: '显示全文' }));
  expect(book.querySelector('.victory-book')).toHaveClass('is-complete');
  expect(within(book).getByRole('link', { name: '资料来源' })).toHaveAttribute(
    'href',
    expect.stringContaining('20161021'),
  );
  await user.click(within(book).getByRole('button', { name: '会师纪事' }));
  const story = screen.getByRole('dialog', { name: final.title });
  expect(story).toHaveTextContent('1936年10月22日');
  await user.click(
    within(story).getByRole('button', { name: '返回地图，继续行军' }),
  );
  expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
  await user.click(screen.getByRole('button', { name: '瑞金开篇' }));
  expect(screen.getByRole('button', { name: '开始行军' })).toBeVisible();
  expect(cameraBoundary.transport!.read().time).toBe(0);
});
async function enter() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: '开启征程' }));
  await user.click(screen.getByRole('button', { name: '立即进入' }));
  await screen.findByText('预览已就绪');
  return user;
}
async function read(user: ReturnType<typeof userEvent.setup>, id: string) {
  await user.selectOptions(
    screen.getByLabelText('跳转行军章节'),
    'chapter-' + id,
  );
  await user.click(screen.getByRole('button', { name: '历史章节' }));
  const row = screen.getByRole('dialog').querySelector(`article`);
  expect(row).toBeTruthy();
  const title =
    id === 'event-ld'
      ? '飞夺泸定桥'
      : id === 'event-zy'
        ? '遵义会议'
        : id === 'ex-event-ruijin'
          ? '瑞金启程：机关转移的开始'
          : null;
  const articles = within(screen.getByRole('dialog')).getAllByRole('article');
  const target = articles.find((a) => a.textContent?.includes(title ?? ''));
  if (!target) throw new Error('missing story row ' + id);
  await user.click(within(target).getByRole('button', { name: '阅读故事' }));
  return screen.getByRole('dialog');
}
it('keeps all geographic regions including empty regions, and only unfolds local events after selection', async () => {
  const user = await enter();
  for (const v of GEOGRAPHIC_VIEWS)
    expect(screen.getByRole('button', { name: v.title })).toBeEnabled();
  expect(screen.getByLabelText('当前区域')).toHaveTextContent('ruijin');
  expect(
    screen.queryByRole('button', { name: '阅读地图飞夺泸定桥' }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '自由探索' }));
  expect(screen.getByLabelText('当前区域')).toHaveTextContent('global');
  expect(screen.getByLabelText('地图GPU边界')).toHaveAttribute(
    'data-march',
    'false',
  );
  expect(
    screen.queryByRole('button', { name: /阅读地图/ }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '大渡河谷' }));
  expect(
    screen.getAllByRole('button', { name: '阅读地图飞夺泸定桥' }).length,
  ).toBeGreaterThan(0);
  expect(
    screen.queryByRole('button', { name: '阅读地图遵义会议' }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '瑞金开篇' }));
  expect(screen.getByLabelText('当前区域')).toHaveTextContent('ruijin');
  expect(screen.getByRole('button', { name: '开始行军' })).toBeVisible();
});
it('map and chapter links use the same central story without completing C1', async () => {
  const user = await enter();
  await user.click(screen.getByRole('button', { name: '黔北山地' }));
  await user.click(
    screen.getAllByRole('button', { name: '阅读地图遵义会议' })[0]!,
  );
  expect(screen.getByRole('dialog')).toHaveClass('journey-story-dialog');
  expect(screen.getByText('1935年1月15—17日')).toBeInTheDocument();
  expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
  await user.click(screen.getByRole('button', { name: '返回地图，继续行军' }));
  const d = await read(user, 'event-zy');
  expect(d).toHaveClass('journey-story-dialog');
  expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
  expect(
    screen.getByRole('button', { name: '开始或继续行军', hidden: true }),
  ).toBeInTheDocument();
});

it('preserves the user-selected camera on playback and has no overview option', async () => {
  const user = await enter();
  await user.selectOptions(
    screen.getByLabelText('跳转行军章节'),
    'chapter-event-sd-2',
  );
  await user.click(screen.getByRole('button', { name: '自由' }));
  const before =
    cameraBoundary.focusGeo.mock.calls.length +
    cameraBoundary.frameMarch.mock.calls.length;
  await user.click(screen.getByRole('button', { name: '开始或继续行军' }));
  expect(screen.getByRole('button', { name: '自由' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(
    screen.queryByRole('button', { name: '俯瞰' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '区域俯瞰' }),
  ).not.toBeInTheDocument();
  expect(
    cameraBoundary.focusGeo.mock.calls.length +
      cameraBoundary.frameMarch.mock.calls.length,
  ).toBe(before);
});

it('unfolds regions from wheel browsing and restores names without seeking the C2 clock', async () => {
  const user = await enter();
  await user.click(screen.getByRole('button', { name: '自由探索山河' }));
  const time = (screen.getByLabelText('行军演示进度') as HTMLInputElement)
    .value;
  await user.click(screen.getByRole('button', { name: '缩小到全景' }));
  expect(screen.getByLabelText('当前区域')).toHaveTextContent('global');
  await user.click(screen.getByRole('button', { name: '滚轮靠近赤水' }));
  expect(screen.getByLabelText('当前区域')).toHaveTextContent('chishui');
  expect(
    screen.getAllByRole('button', { name: /阅读地图三渡赤水/ }).length,
  ).toBeGreaterThan(0);
  expect(
    (screen.getByLabelText('行军演示进度') as HTMLInputElement).value,
  ).toBe(time);
});
it('pins one person card, switches people, closes card before story and restores name focus', async () => {
  const user = await enter();
  await read(user, 'event-zy');
  const mao = within(screen.getByRole('dialog')).getAllByRole('button', {
    name: '毛泽东',
  })[0]!;
  await user.click(mao);
  expect(screen.getByRole('dialog', { name: '人物：毛泽东' })).toBeVisible();
  expect(screen.getByRole('button', { name: '取消固定' })).toBeVisible();
  await user.keyboard('{Escape}');
  expect(
    screen.queryByRole('dialog', { name: '人物：毛泽东' }),
  ).not.toBeInTheDocument();
  expect(mao).toHaveFocus();
  expect(screen.getByRole('dialog', { name: '遵义会议' })).toBeVisible();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('keeps filtered sources, reverse story links and the operation guide separate', async () => {
  const user = await enter();
  await read(user, 'event-zy');
  await user.click(
    within(screen.getByRole('dialog', { name: '遵义会议' })).getByRole(
      'button',
      { name: '资料来源' },
    ),
  );
  const d = screen.getByRole('dialog', { name: '资料来源' });
  expect(d.textContent).toContain('src-zy');
  await user.click(within(d).getByText('来源关联的故事'));
  await user.click(within(d).getByRole('button', { name: '遵义会议' }));
  expect(screen.getByRole('dialog', { name: '遵义会议' })).toBeVisible();
  await user.keyboard('{Escape}');
  await user.click(screen.getByRole('button', { name: '使用说明' }));
  expect(screen.getByRole('dialog', { name: '使用说明' })).toHaveTextContent(
    '随行与自由取景',
  );
});
it('passes single and continuous A scopes and restores macro time, unit, camera and paused state', async () => {
  const user = await enter();
  await user.selectOptions(
    screen.getByLabelText('跳转行军章节'),
    'chapter-event-sd-2',
  );
  await user.selectOptions(
    screen.getByLabelText('当前观察部队'),
    'red-alternative',
  );
  await user.click(screen.getByRole('button', { name: '随行' }));
  const time = (screen.getByLabelText('行军演示进度') as HTMLInputElement)
    .value;
  await user.click(screen.getByText('赤水河谷 · 区域体验'));
  expect(
    screen.queryByRole('button', { name: '仅体验本区域' }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: '从本区域继续连续体验' }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText('A场景公共边界')).toHaveTextContent(
    'chishui / single',
  );
  await user.click(screen.getByRole('button', { name: '退出A场景' }));
  expect(
    (screen.getByLabelText('行军演示进度') as HTMLInputElement).value,
  ).toBe(time);
  expect(screen.getByLabelText('当前观察部队')).toHaveValue('red-alternative');
  expect(screen.getByRole('button', { name: '随行' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByRole('button', { name: '开始或继续行军' })).toBeVisible();
  await user.click(screen.getByRole('button', { name: '完整互动体验' }));
  expect(screen.getByLabelText('A场景公共边界')).toHaveTextContent(
    'ruijin / continuous',
  );
  expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
});
it('moves teaching knowledge into ordinary reading with sources, no task gate, and no false completion record', async () => {
  const user = await enter();
  await read(user, 'event-ld');
  const dialog = screen.getByRole('dialog', { name: '飞夺泸定桥' });
  expect(
    within(dialog).queryByRole('button', { name: '开始图文互动' }),
  ).not.toBeInTheDocument();
  expect(
    within(dialog).queryByRole('button', { name: '我已阅读本段' }),
  ).not.toBeInTheDocument();
  expect(dialog).toHaveTextContent('桥梁');
  expect(dialog).toHaveTextContent('铺板');
  expect(
    within(dialog).getByRole('button', { name: '资料来源' }),
  ).toBeEnabled();
  expect(
    within(dialog).getByRole('button', { name: '返回地图，继续行军' }),
  ).toBeEnabled();
  expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
  await user.click(
    within(dialog).getByRole('button', { name: '返回地图，继续行军' }),
  );
  await read(user, 'event-ld');
  expect(screen.getByRole('dialog', { name: '飞夺泸定桥' })).toHaveTextContent(
    '铺板',
  );
  expect(localStorage.getItem(COMPLETION_STORAGE_KEY)).toBeNull();
});
