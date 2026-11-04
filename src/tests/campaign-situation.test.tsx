import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import raw from '../data/verified/dataset.json';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import { CampaignSituation } from '../app/exhibition/CampaignSituation';
import {
  validateCampaignSituations,
  YUDU_FORMATIONS,
} from '../app/exhibition/campaign-situations';

const content = createJourneyContent(raw, 'exhibition');
it('covers all three sequences with sources, keeps review status draft and stores no military coordinates', () => {
  const research = content.campaign;
  expect(research.reviewStatus).toBe('draft');
  expect(research.releaseStatus).toBe('unpublished');
  expect(research.reviews).toEqual([]);
  for (const chapter of content.plan.chapters) {
    const stages = research.stages.filter((s) =>
      s.chapterIds.includes(chapter.id),
    );
    expect(stages).toHaveLength(1);
    for (const id of stages[0]!.sourceIds)
      expect(research.sources[id]?.url).toMatch(/^https:\/\//);
  }
  expect(JSON.stringify(research)).not.toMatch(
    /"coordinates"|"points"|"reviewedBy"/,
  );
  expect(() => validateCampaignSituations([])).toThrow();
});
it('Yudu shows five corps and two columns converging without implying three fronts or losing designations', () => {
  const { container, rerender } = render(
    <CampaignSituation
      research={content.campaign}
      chapterId="chapter-ex-event-yudu-assembly"
      progress={0.2}
    />,
  );
  for (const unit of YUDU_FORMATIONS)
    expect(screen.getByText(unit)).toBeVisible();
  expect(container.querySelectorAll('.campaign-flow--red')).toHaveLength(8);
  const arrow = container.querySelector('.campaign-flow-arrow')!,
    before = arrow.getAttribute('transform');
  rerender(
    <CampaignSituation
      research={content.campaign}
      chapterId="chapter-ex-event-yudu-assembly"
      progress={0.2}
    />,
  );
  expect(arrow.getAttribute('transform')).toBe(before);
  rerender(
    <CampaignSituation
      research={content.campaign}
      chapterId="chapter-ex-event-yudu-assembly"
      progress={0.6}
    />,
  );
  expect(arrow.getAttribute('transform')).not.toBe(before);
  expect(screen.getByText(/番号继续保留/)).toBeVisible();
});
it('chapter changes replace enemy designations and sources, collapse remains keyboard-accessible', () => {
  const { container, rerender } = render(
    <CampaignSituation
      research={content.campaign}
      chapterId="chapter-ex-event-blockades"
      progress={0.5}
    />,
  );
  expect(screen.getByRole('img')).toHaveAccessibleName(/陈济棠/);
  expect(container.querySelectorAll('.campaign-flow--blue')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: '史料依据' }));
  expect(screen.getByRole('link', { name: /突破三道封锁线/ })).toHaveAttribute(
    'href',
    content.campaign.sources.blockades!.url,
  );
  rerender(
    <CampaignSituation
      research={content.campaign}
      chapterId="chapter-ex-event-wuqi"
      progress={0.8}
    />,
  );
  expect(screen.getByRole('img')).toHaveAccessibleName(/东北军、马家军骑兵/);
  expect(screen.queryByText('粤军·陈济棠部')).not.toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: /突破三道封锁线/ }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '斩断尾追' }));
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
