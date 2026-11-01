import { assetsForPerson } from './asset-selection';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import raw from '../../data/verified/dataset.json';
import { normalizeDataset } from '../../shared/contracts';
import { validateDataset } from '../../shared/utils/validate-dataset';
import { HistoryAssetGallery } from './HistoryAssetGallery';
import { ReviewPanel } from './review/ReviewPanel';
const data = normalizeDataset(validateDataset(raw));
afterEach(cleanup);
it('ships each claimed photo and art file with matching provenance and hash', () => {
  expect(data.assets).toHaveLength(10);
  for (const key of ['mao', 'zhou', 'zhu', 'liu', 'yang']) {
    const person = data.people.find((p) => p.personId === `person-${key}`)!;
    const pair = assetsForPerson(data.assets, person.personId, true);
    expect(pair.map((a) => a.assetType).sort()).toEqual([
      'ai_recreation',
      'historical_photo',
    ]);
    expect(pair.every((a) => person.assetIds.includes(a.assetId))).toBe(true);
    for (const a of pair) {
      const file = `public${a.filePath}`;
      const sidecar = JSON.parse(
        readFileSync(file.replace(/\.(jpg|png)$/, '.source.json'), 'utf8'),
      );
      expect(
        createHash('sha256').update(readFileSync(file)).digest('hex'),
      ).toBe(sidecar.sha256);
      expect(sidecar.personId).toBe(person.personId);
    }
  }
});
it('public person filtering rejects candidates and prevents unpaired art', () => {
  expect(assetsForPerson(data.assets, 'person-mao')).toEqual([]);
  const pair = assetsForPerson(data.assets, 'person-mao', true);
  const art = pair.find((a) => a.assetType === 'ai_recreation')!;
  const allowed = pair.map((a) => ({
    ...a,
    releaseStatus: 'published' as const,
    reviewStatus: 'reviewed' as const,
    rightsStatus: 'cleared' as const,
  }));
  expect(assetsForPerson(allowed, 'person-mao')).toHaveLength(2);
  expect(assetsForPerson([art], 'person-mao', true)).toEqual([]);
  expect(assetsForPerson(allowed, 'person-zhou')).toEqual([]);
  expect(
    assetsForPerson(
      allowed.map((a) => ({ ...a, rightsStatus: 'unknown' as const })),
      'person-mao',
    ),
  ).toEqual([]);
});
it('labels archival and generated imagery separately and handles a missing image', () => {
  render(
    <HistoryAssetGallery
      assets={assetsForPerson(data.assets, 'person-mao', true)}
      review
    />,
  );
  expect(
    screen.getByRole('heading', { name: '真实历史照片' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'AI 生成艺术形象' }),
  ).toBeInTheDocument();
  fireEvent.error(screen.getAllByRole('img')[0]!);
  expect(
    screen.getByText('图片加载失败，文字与出处仍可阅读。'),
  ).toBeInTheDocument();
});
it('separates conference dates, document adoption and alias identity; fallbacks match subtitles', () => {
  expect(data.events.find((e) => e.id === 'event-zy')?.dateText).toContain(
    '1月15',
  );
  expect(
    data.events.find((e) => e.id === 'event-zy-resolution')?.dateText,
  ).toBe('1935年2月8日');
  expect(data.people.find((p) => p.personId === 'person-huang')?.name).toBe(
    '黄开湘',
  );
  expect(data.people.some((p) => p.name === '王开湘')).toBe(false);
  expect(data.events.find((e) => e.id === 'event-ld')?.detail).toContain(
    '黄开湘',
  );
  for (const fallback of data.fallbackContents)
    for (const step of fallback.steps)
      expect(step.text).toBe(
        data.segments.find((s) => s.segmentId === step.segmentId)?.text,
      );
});
it('review navigation exposes all six topics, all events, six people and ten images without publication', async () => {
  const user = userEvent.setup();
  render(<ReviewPanel dataset={data} />);
  for (const t of data.topics) {
    await user.click(screen.getByRole('button', { name: t.title }));
    expect(
      screen.getByRole('heading', { level: 2, name: t.title }),
    ).toBeInTheDocument();
  }
  const events = screen.getByRole('combobox', {
    name: '选择事件（含阶段卡与补充阅读）',
  });
  await user.selectOptions(events, 'event-zy-resolution');
  expect(
    screen.getByRole('heading', { name: '遵义会议相关决议通过' }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '人物与照片' }));
  for (const key of ['mao', 'zhou', 'zhu', 'liu', 'yang']) {
    await user.selectOptions(
      screen.getByRole('combobox', { name: '选择人物' }),
      `person-${key}`,
    );
    expect(screen.getAllByRole('img')).toHaveLength(2);
  }
  await user.selectOptions(
    screen.getByRole('combobox', { name: '选择人物' }),
    'person-huang',
  );
  expect(screen.queryAllByRole('img')).toHaveLength(0);
  expect(screen.getByText(/仅本地候选审阅/)).toBeInTheDocument();
});
it('review runs the complete five-step Luding interaction sequence without saving completion', async () => {
  const save = vi.spyOn(Storage.prototype, 'setItem');
  const user = userEvent.setup();
  render(<ReviewPanel dataset={data} />);
  await user.click(screen.getByRole('button', { name: '五段体验与互动' }));
  expect(screen.getByRole('button', { name: '继续下一段' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: '我已阅读本段' }));
  await user.click(screen.getByRole('button', { name: '继续下一段' }));
  await user.click(screen.getByRole('button', { name: '我已阅读本段' }));
  const observe = data.interactions.find((i) => i.interactionId === 'ld-01')!;
  if (observe.interactionType !== 'observe_hotspots')
    throw new Error('wrong fixture');
  for (const material of observe.materials) {
    await user.click(screen.getByRole('button', { name: material.title }));
    await user.click(screen.getByRole('button', { name: '确认已阅读此材料' }));
  }
  expect(screen.getByRole('button', { name: '继续下一段' })).toBeDisabled();
  await user.click(screen.getByRole('button', { name: '我已阅读并理解解释' }));
  await user.click(screen.getByRole('button', { name: '继续下一段' }));
  await user.click(screen.getByRole('button', { name: '我已阅读本段' }));
  await user.click(screen.getByRole('button', { name: '继续下一段' }));
  await user.click(screen.getByRole('button', { name: '我已阅读本段' }));
  await user.click(screen.getByRole('button', { name: '提交本次判断' }));
  await user.click(screen.getByRole('button', { name: '我已阅读并理解解释' }));
  await user.click(screen.getByRole('button', { name: '继续下一段' }));
  expect(
    screen.getByRole('button', { name: '完成本次本地审阅' }),
  ).toBeDisabled();
  await user.click(screen.getByRole('button', { name: '我已阅读本段' }));
  await user.click(screen.getByRole('button', { name: '完成本次本地审阅' }));
  expect(screen.getByText(/本次候选流程已走完/)).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole('button', {
      name: data.topics.find((t) => t.topicId === 'topic-zy')!.title,
    }),
  );
  expect(
    screen.getByRole('heading', { name: '第 1 / 5 步' }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/本次候选流程已走完/)).not.toBeInTheDocument();
});
