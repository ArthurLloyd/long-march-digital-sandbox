import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import {
  EventMapLayer,
  type EventMapLayerHandle,
} from '../app/landscape/EventMapLayer';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import raw from '../data/verified/dataset.json';
import { createMarchLayer } from '../app/landscape/march-layer';
import {
  createJourneyTransport,
  journeyChapters,
} from '../features/timeline/journey';
import { CampaignNarration } from '../app/exhibition/CampaignNarration';
import { JourneyArrival } from '../app/exhibition/JourneyArrival';
import {
  CHISHUI_CAMPAIGN,
  campaignBeat,
  campaignSourceList,
} from '../shared/content/chishui-campaign';
afterEach(() => vi.useRealTimers());
it('keeps both first-crossing sites, but presents one event headline and a clearly named related ferry', () => {
  const content = createJourneyContent(raw, 'exhibition'),
    entries = content.map.entries.filter((e) => e.eventId === 'event-sd-1');
  const ref = createRef<EventMapLayerHandle>(),
    read = vi.fn();
  render(
    <EventMapLayer
      model={{ ...content.map, entries }}
      ref={ref}
      activeEventIds={['event-sd-1']}
      onChoose={vi.fn()}
      onRead={read}
      onOverview={vi.fn()}
      onRegion={vi.fn()}
      reading={false}
      directRead
    />,
  );
  act(() =>
    ref.current!.project(
      entries.map((p, i) => ({
        id: `placement:${p.placementId}`,
        x: 400 + i * 250,
        y: 300 + i * 60,
        visible: true,
      })),
      { width: 1200, height: 800, distance: 3 },
    ),
  );
  expect(screen.getByText('一渡赤水 · 土城')).toBeVisible();
  expect(screen.getByText('猿猴场渡河（同属一渡）')).toBeVisible();
  expect(
    screen.queryByText('一渡赤水', { exact: true }),
  ).not.toBeInTheDocument();
  for (const e of entries)
    fireEvent.click(
      screen.getByRole('button', {
        name: `${e.displayLabel ?? e.event.title}，${e.locationLabel}`,
      }),
    );
  expect(read.mock.calls).toEqual([['event-sd-1'], ['event-sd-1']]);
  expect(entries.map((e) => e.anchorCoordinates)).toEqual([
    [105.993, 28.284],
    [105.935, 28.368],
  ]);
});
it('renders visible blue pursuit or blockade lines for every Chishui crossing and Zhaxi, without changing selected red-army tracking', () => {
  const content = createJourneyContent(raw, 'exhibition'),
    t = createJourneyTransport(content.plan),
    scene = new THREE.Scene(),
    layer = createMarchLayer(scene, () => 3);
  layer.setTransport(t);
  const group = scene.children[0]!;
  for (const id of [
    'chapter-event-sd-1',
    'chapter-event-zy-resolution',
    'chapter-event-sd-2',
    'chapter-event-sd-3',
    'chapter-event-sd-4',
  ]) {
    const c = journeyChapters(content.plan, 'central').find(
      (c) => c.id === id,
    )!;
    t.seek(c.start + c.duration * 0.7);
    layer.update(3);
    const blue = group.children.filter(
      (o) => o instanceof Line2 && o.visible && o.name.endsWith(':active-blue'),
    ) as Line2[];
    expect(blue.length).toBeGreaterThan(0);
    for (const line of blue) {
      expect(line.material.linewidth).toBeGreaterThanOrEqual(3);
      expect(line.material.depthTest).toBe(false);
      expect(line.geometry.instanceCount).toBeGreaterThan(1);
    }
  }
  const count = group.children.length;
  t.seek(0);
  layer.update(3);
  t.seek(
    journeyChapters(content.plan, 'central').find(
      (c) => c.id === 'chapter-event-sd-4',
    )!.start + 30,
  );
  layer.update(3);
  expect(group.children).toHaveLength(count);
  layer.dispose();
  expect(scene.children).toHaveLength(0);
});
it('pairs real enemy deployments with an explanation of response and significance, and exposes the source for the current beat', () => {
  const sources = vi.fn(),
    beat = vi.fn();
  const view = render(
    <CampaignNarration
      chapterId="chapter-event-sd-1"
      progress={0}
      onBeat={beat}
      onSources={sources}
    />,
  );
  expect(screen.getByText(/川军后续部队增援/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /红军应对/ }));
  expect(beat).toHaveBeenCalledWith(1);
  view.rerender(
    <CampaignNarration
      chapterId="chapter-event-zy-resolution"
      progress={0.4}
      onBeat={beat}
      onSources={sources}
    />,
  );
  expect(screen.getByText(/2月8日通过遵义会议决议/)).toBeInTheDocument();
  expect(
    screen.getByText(/会议通过遵义会议决议，进一步落实军事和组织调整/),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '本段史料依据' }));
  expect(sources).toHaveBeenCalledWith(['ex-src-zhaxi-meetings']);
  fireEvent.click(screen.getByRole('button', { name: /扎西会议 · 为什么/ }));
  expect(screen.queryByText(/2月8日通过遵义会议决议/)).not.toBeInTheDocument();
});
it('never opens a Chishui arrival story automatically over the battlefield explanation', () => {
  vi.useFakeTimers();
  const open = vi.fn();
  render(
    <JourneyArrival
      eventId="event-sd-1"
      title="一渡赤水"
      autoOpen={false}
      onOpen={open}
    />,
  );
  act(() => vi.advanceTimersByTime(30000));
  expect(open).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole('button', { name: '已到达一渡赤水，点击阅读' }),
  );
  expect(open).toHaveBeenCalledOnce();
});
it('every battle beat has source links registered in the real exhibition and remains distinct when seeking backwards', () => {
  const content = createJourneyContent(raw, 'exhibition');
  for (const [id, chapter] of Object.entries(CHISHUI_CAMPAIGN)) {
    for (const progress of [0, 0.3, 0.7, 0.3, 0]) {
      const frame = campaignBeat(id, progress)!;
      expect(frame.beat.threat.length).toBeGreaterThan(15);
      expect(frame.beat.response.length).toBeGreaterThan(15);
      expect(frame.beat.significance.length).toBeGreaterThan(15);
      for (const source of campaignSourceList(frame.beat.sourceKeys))
        expect(
          content.dataset.sources.some((s) => s.sourceId === source.id),
        ).toBe(true);
    }
    expect(new Set(chapter.beats.map((b) => b.title)).size).toBe(3);
  }
  expect(campaignBeat('chapter-event-js', 0.4)).toBeNull();
});

it('continues the campaign explanation after the first-crossing cue instead of stopping at one percent', () => {
  const content = createJourneyContent(raw, 'exhibition'),
    t = createJourneyTransport(content.plan),
    c = journeyChapters(content.plan, 'central').find(
      (c) => c.id === 'chapter-event-sd-1',
    )!;
  t.seek(c.start);
  t.play();
  t.advance(c.duration * 0.31);
  expect(t.read().playing).toBe(true);
  expect(t.read().pendingEventId).toBeNull();
  expect(t.read().time).toBeCloseTo(c.start + c.duration * 0.31);
});

it('selects the intended explanation at exact seek boundaries despite floating-point rounding', () => {
  const content = createJourneyContent(raw, 'exhibition');
  for (const c of journeyChapters(content.plan, 'central').filter(
    (c) => CHISHUI_CAMPAIGN[c.id],
  )) {
    for (const [i, start] of [0, 0.28, 0.6].entries()) {
      const progress = (c.start + c.duration * start - c.start) / c.duration;
      expect(campaignBeat(c.id, progress)!.index).toBe(i);
    }
  }
});
