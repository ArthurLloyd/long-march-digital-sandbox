import { useState } from 'react';
import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import raw from '../../data/verified/dataset.json';
import {
  normalizeDataset,
  EXPERIENCE_IDS,
  type InteractionDefinition,
  type InteractionResponse,
} from '../../shared/contracts';
import {
  getPublishedDatasetV2,
  validateDataset,
} from '../../shared/utils/validate-dataset';
import { interactionResponseSchema } from '../../shared/contracts';
import { TeachingInteraction } from './TeachingInteraction';
import { EquivalentExperience } from './EquivalentExperience';
import { HistoricalDetailPanel } from './HistoricalDetailPanel';
import { HistoryEventPanel } from './HistoryEventPanel';

const data = normalizeDataset(validateDataset(raw));
afterEach(cleanup);
function Harness({
  definition,
  report = vi.fn(),
  ack = vi.fn(),
}: {
  definition: InteractionDefinition;
  report?: (r: InteractionResponse) => void;
  ack?: () => void;
}) {
  const [response, setResponse] = useState<InteractionResponse | null>(null);
  const [done, setDone] = useState(false);
  return (
    <TeachingInteraction
      interaction={definition}
      response={response}
      explanationAcknowledged={done}
      onResponse={(_, r) => {
        report(r);
        setResponse(r);
      }}
      onExplanationAcknowledged={() => {
        ack();
        setDone(true);
      }}
    />
  );
}

describe('B full candidate and publication boundary', () => {
  it('covers all six experiences, twelve interactions and ordered equivalent content', () => {
    expect(data.experiences.map((e) => e.experienceId).sort()).toEqual(
      [...EXPERIENCE_IDS].sort(),
    );
    expect(data.interactions).toHaveLength(12);
    expect(data.segments).toHaveLength(30);
    for (const manifest of data.experiences) {
      const fallback = data.fallbackContents.find(
        (f) => f.fallbackContentId === manifest.fallbackContentId,
      )!;
      expect(fallback.steps.map((s) => s.segmentId)).toEqual(
        manifest.segmentIds,
      );
      expect(manifest.requiredInteractionIds).toHaveLength(2);
    }
  });
  it('does not unlock any candidate or invent spatial geometry', () => {
    const published = getPublishedDatasetV2(data);
    expect(published.events).toHaveLength(0);
    expect(published.experiences).toHaveLength(0);
    expect(data.routes).toHaveLength(0);
    expect(data.events.every((e) => e.coordinates === null)).toBe(true);
    expect(
      data.forceSnapshots.every(
        (s) => s.displayMode === 'hidden' && s.coordinates === null,
      ),
    ).toBe(true);
    for (const collection of Object.values(data))
      if (Array.isArray(collection))
        for (const record of collection) {
          expect(record.reviews).toEqual([]);
          expect(record.reviewedBy).toEqual([]);
          expect(record.releaseStatus).toBe('unpublished');
        }
  });
});

for (const definition of data.interactions) {
  it(`${definition.interactionId}: requires genuine operations, reports contract response, permits explanation`, async () => {
    const user = userEvent.setup();
    const report = vi.fn();
    const ack = vi.fn();
    render(<Harness definition={definition} report={report} ack={ack} />);
    expect(report).not.toHaveBeenCalled();
    expect(ack).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('button', { name: '我已阅读并理解解释' }),
    ).not.toBeInTheDocument();
    switch (definition.interactionType) {
      case 'observe_hotspots':
        for (const material of definition.materials) {
          await user.click(
            screen.getByRole('button', { name: material.title }),
          );
          expect(report).toHaveBeenCalledTimes(
            definition.materials.indexOf(material),
          );
          await user.click(
            screen.getByRole('button', { name: '确认已阅读此材料' }),
          );
        }
        break;
      case 'sort_sequence':
        // Candidate starts in nonchronological order. Complete wrong attempts are allowed.
        await user.click(screen.getByRole('button', { name: '第2项上移' }));
        await user.click(screen.getByRole('button', { name: '提交本次判断' }));
        break;
      case 'evidence_selection':
        await user.click(screen.getByLabelText(definition.choices[0]!.text));
        await user.click(screen.getByRole('button', { name: '提交本次判断' }));
        break;
      case 'material_matching':
        for (let i = 0; i < definition.materials.length; i++)
          await user.selectOptions(
            screen.getAllByRole('combobox')[i]!,
            definition.conclusions[i]!.conclusionId,
          );
        await user.click(screen.getByRole('button', { name: '提交本次判断' }));
        break;
      case 'classify_source':
        for (const select of screen.getAllByRole('combobox'))
          await user.selectOptions(select, 'editorial_summary');
        await user.click(screen.getByRole('button', { name: '提交本次判断' }));
        break;
    }
    const last = report.mock.calls.at(-1)![0];
    expect(interactionResponseSchema.safeParse(last).success).toBe(true);
    expect(last.interactionType).toBe(definition.interactionType);
    expect(ack).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole('button', { name: '我已阅读并理解解释' }),
    );
    expect(ack).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '已确认解释' })).toBeDisabled();
  });
}
it('sd-01 prevents skipping a phase and requires explicit material confirmation', async () => {
  render(
    <Harness
      definition={data.interactions.find((d) => d.interactionId === 'sd-01')!}
    />,
  );
  expect(screen.getByRole('button', { name: '二渡赤水' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: '一渡赤水' }));
  expect(screen.getByRole('status')).toHaveTextContent('0 / 4');
});
it('rejects incomplete and nonbijective matching before callback', async () => {
  const report = vi.fn();
  const def = data.interactions.find((d) => d.interactionId === 'js-02')!;
  render(<Harness definition={def} report={report} />);
  await userEvent.click(screen.getByRole('button', { name: '提交本次判断' }));
  expect(report).not.toHaveBeenCalled();
  for (const select of screen.getAllByRole('combobox'))
    fireEvent.change(select, { target: { value: 'js-conclusion-control' } });
  await userEvent.click(screen.getByRole('button', { name: '提交本次判断' }));
  expect(report).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toBeInTheDocument();
});
it('equivalent steps never auto-report or advance themselves', async () => {
  const viewed = vi.fn();
  const content = data.fallbackContents[0]!;
  const view = render(
    <EquivalentExperience
      content={content}
      activeStepId={null}
      onStepViewed={viewed}
    />,
  );
  expect(viewed).not.toHaveBeenCalled();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  view.rerender(
    <EquivalentExperience
      content={content}
      activeStepId={content.steps[0]!.stepId}
      onStepViewed={viewed}
    />,
  );
  expect(viewed).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: '我已阅读本段' }));
  expect(viewed).toHaveBeenCalledWith(content.steps[0]!.stepId);
  expect(screen.getByRole('heading')).toHaveTextContent('1 / 5');
});
it('details retain long prose, safe source navigation and no made-up position', async () => {
  const nav = vi.fn();
  render(
    <HistoricalDetailPanel
      detail={{
        kind: 'event',
        record: {
          ...data.events[0]!,
          detail: '<script>bad()</script>\n第二段',
        },
      }}
      sources={data.sources}
      assets={[]}
      onNavigate={nav}
      onClose={vi.fn()}
    />,
  );
  expect(screen.getByText(/<script>bad/)).toBeInTheDocument();
  expect(document.querySelector('script')).toBeNull();
  expect(screen.getByText(/不在地图补造位置/)).toBeInTheDocument();
  await userEvent.click(
    screen.getAllByRole('button', { name: '查看来源说明' })[0]!,
  );
  expect(nav).toHaveBeenCalledWith({
    type: 'open_source',
    sourceId: data.events[0]!.sourceIds[0],
  });
});
it('person without cleared real photo is text-only and keeps related navigation', async () => {
  const nav = vi.fn();
  render(
    <HistoricalDetailPanel
      detail={{ kind: 'person', record: data.people[0]! }}
      sources={data.sources}
      assets={[]}
      onNavigate={nav}
      onClose={vi.fn()}
    />,
  );
  expect(screen.getByText(/当前没有经审核可用的真实照片/)).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole('button', { name: '事件 · event-zy' }),
  );
  expect(nav).toHaveBeenCalledWith({
    type: 'open_object',
    selection: { kind: 'event', id: 'event-zy' },
  });
});
it('retains legacy empty-event adapter', () => {
  render(
    <HistoryEventPanel
      event={null}
      sources={[]}
      teachingState={{ mode: 'observe', stepId: null }}
      onClose={vi.fn()}
    />,
  );
  expect(screen.getByText('每一段历史，都有据可循。')).toBeInTheDocument();
});
