import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HistoryDataset } from '../shared/contracts';
import { createDraftDataset } from '../data/fixtures/draft-dataset';
import { App } from '../app/App';

// App-shell tests isolate the scene boundary. Real GPU behavior is checked in
// scene-renderer.test.ts and browser QA; jsdom has no WebGL implementation.
vi.mock('../features/scene', async () => {
  const { useEffect } = await import('react');
  return {
    LongMarchScene: ({ onSceneReady }: { onSceneReady: () => void }) => {
      useEffect(() => onSceneReady(), [onSceneReady]);
      return <div aria-label="三维场景测试替身" />;
    },
  };
});

// Mock ONLY the module boundary to test C's interactions. No fixture is published or persisted.
const mockData = vi.hoisted(
  () => ({ events: [], routes: [], sources: [] }) as HistoryDataset,
);
vi.mock('../data/verified', () => ({ publishedDataset: mockData }));
afterEach(() => {
  mockData.events = [];
  mockData.routes = [];
  mockData.sources = [];
  vi.unstubAllGlobals();
});
async function start() {
  Object.assign(mockData, createDraftDataset());
  vi.stubGlobal('matchMedia', () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: '开启征程' }));
  await user.click(screen.getByRole('button', { name: '立即进入' }));
  await screen.findByText('预览已就绪');
  await user.click(screen.getByRole('button', { name: /历史专题/ }));
  await user.click(
    within(screen.getByRole('dialog', { name: '历史专题' })).getByRole(
      'button',
      { name: /测试事件（非史实）/ },
    ),
  );
  return user;
}
describe('C 与事件模块的交互契约', () => {
  it.each(['close', 'escape', 'backdrop'])(
    '通过 %s 关闭历史抽屉时清空事件选择',
    async (method) => {
      const user = await start();
      expect(
        screen.getByRole('dialog', { name: '事件资料' }),
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole('dialog', { name: '事件资料' })).getByRole(
          'heading',
          { name: '测试事件（非史实）' },
        ),
      ).toBeInTheDocument();
      if (method === 'close')
        await user.click(screen.getByRole('button', { name: '关闭面板' }));
      else if (method === 'escape') await user.keyboard('{Escape}');
      else await user.click(document.querySelector('.drawer-backdrop')!);
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByText('尚未开放')).toBeInTheDocument();
    },
  );
  it('目录选择替换为事件资料，书目来源下可用键盘展开详情', async () => {
    const user = await start();
    expect(screen.queryByRole('dialog', { name: '历史专题' })).toBeNull();
    await user.tab(); // outer close
    await user.tab(); // B panel close
    await user.tab(); // native summary must not be trapped out
    expect(document.activeElement?.tagName).toBe('SUMMARY');
    // jsdom does not implement the native summary Enter default; click verifies expansion after keyboard focus reaches it.
    await user.click(document.activeElement!);
    expect(document.querySelector('details')).toHaveAttribute('open');
    expect(
      screen.getByText('不代表真实人物、事件、地点或日期。'),
    ).toBeVisible();
  });
});
