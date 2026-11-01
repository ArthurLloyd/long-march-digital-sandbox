import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';
import { CompletionStore } from '../app/experience/experience-completion-service';
import { loadExperienceModules } from '../app/experience/experience-modules';
import {
  EquivalentExperience,
  HistoricalDetailPanel,
  TeachingInteraction,
} from '../features/history';
import { simulatePublishedSample } from './fixtures/c1-sample';

// Only the existing v1 WebGL boundary is replaced in jsdom. There is no
// immersive renderer, ready callback, or terminal callback in this test.
vi.mock('../features/scene', async () => {
  const { useEffect } = await import('react');
  return {
    // Vitest's strict mock namespace throws on absent export reads; undefined
    // preserves the actual missing-module behavior instead of providing a stub.
    ImmersiveExperienceRenderer: undefined,
    LongMarchSceneV2: undefined,
    LongMarchScene: ({ onSceneReady }: { onSceneReady: () => void }) => {
      useEffect(() => onSceneReady(), [onSceneReady]);
      return <div aria-label="三维场景测试替身" />;
    },
  };
});

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});
afterEach(() => vi.unstubAllGlobals());

describe('C3 准备：真实 B 公共组件与 C1 的隔离接口验证', () => {
  it('动态发现三个真实 B 出口，不补造缺失的 A v2 接口', async () => {
    const actualScene =
      await vi.importActual<Record<string, unknown>>('../features/scene');
    expect(actualScene).not.toHaveProperty('ImmersiveExperienceRenderer');
    expect(actualScene).not.toHaveProperty('LongMarchSceneV2');
    const modules = await loadExperienceModules();
    expect(modules.Details).toBe(HistoricalDetailPanel);
    expect(modules.Teaching).toBe(TeachingInteraction);
    expect(modules.Equivalent).toBe(EquivalentExperience);
    expect(modules.Renderer).toBeUndefined();
    expect(modules.Map).toBeUndefined();
  });

  it('真实图文与教学操作经过 C1 主动完成后才保存，缺失渲染器时安全拒绝重播', async () => {
    const user = userEvent.setup();
    // Synthetic content and simulated review structures stay in test memory.
    // Never promote B's candidate records or use the formal completion key.
    const data = simulatePublishedSample();
    const memory = new Map<string, string>();
    const store = new CompletionStore({
      key: 'c3-audit-memory-only',
      storage: () => ({
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => void memory.set(key, value),
      }),
    });
    render(
      <App
        input={data}
        modules={await loadExperienceModules()}
        completionStore={store}
      />,
    );
    await user.click(screen.getByRole('button', { name: '开启征程' }));
    await user.click(screen.getByRole('button', { name: '立即进入' }));
    await screen.findByText('预览已就绪');
    await user.click(screen.getByRole('button', { name: /历史专题/ }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: /测试事件（非史实）/,
      }),
    );
    expect(screen.getByRole('heading', { name: '走进这段历史' })).toBeVisible();
    expect(screen.getByRole('button', { name: '开始体验' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '开始等价图文体验' }));

    for (let index = 0; index < 5; index++) {
      if (index < 4)
        expect(screen.getByRole('button', { name: '下一段' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: '我已阅读本段' }));
      if (index === 1) {
        const observe = data.interactions.find(
          (d) => d.interactionId === 'ld-01',
        )!;
        if (observe.interactionType !== 'observe_hotspots')
          throw new Error('invalid sample');
        for (const material of observe.materials) {
          await user.click(
            screen.getByRole('button', { name: material.title }),
          );
          await user.click(
            screen.getByRole('button', { name: '确认已阅读此材料' }),
          );
        }
      }
      if (index === 3) {
        await user.click(screen.getByRole('button', { name: '第1项下移' }));
        await user.click(screen.getByRole('button', { name: '提交本次判断' }));
      }
      if (index === 1 || index === 3) {
        expect(screen.getByRole('button', { name: '继续主线' })).toBeDisabled();
        await user.click(
          screen.getByRole('button', { name: '我已阅读并理解解释' }),
        );
        await user.click(screen.getByRole('button', { name: '继续主线' }));
      }
      expect(store.getSnapshot().records).toHaveLength(0);
      if (index < 4)
        await user.click(screen.getByRole('button', { name: '下一段' }));
    }
    await user.click(
      screen.getByRole('button', { name: '完成体验，阅读资料' }),
    );
    expect(store.getSnapshot().records).toHaveLength(1);
    expect(store.getSnapshot().records[0]).toMatchObject({
      experienceId: 'exp-feiduo-ludingqiao',
      completionMode: 'equivalent',
      completedInteractionIds: ['ld-01', 'ld-02'],
    });
    expect(screen.getByRole('dialog', { name: '事件资料' })).toBeVisible();
    expect(
      screen.getByRole('heading', { name: '测试事件（非史实）' }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: '重播体验' }));
    // Current replay defaults to 3d. This is a documented C3 UX gap, but it
    // must still reject absent A modules and retain the genuine prior record.
    expect(screen.getByRole('heading', { name: '暂未开放' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: '完成体验，阅读资料' }),
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: '返回沙盘' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(store.getSnapshot().records).toHaveLength(1);
    expect([...memory.keys()]).toEqual(['c3-audit-memory-only']);
  });
});
