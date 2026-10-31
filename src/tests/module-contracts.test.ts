// @vitest-environment node
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ComponentProps } from 'react';
import type { LongMarchScene } from '../features/scene';
import type { HistoryEventPanel } from '../features/history';
import {
  cameraBookmarkSchema,
  historicalObjectSelectionSchema,
  type LongMarchSceneProps,
  type LongMarchSceneV2Props,
  type HistoryEventPanelProps,
  type ImmersiveExperienceProps,
  type TeachingInteractionProps,
} from '../shared/contracts';

describe('公共模块边界', () => {
  it('旧组件参数保持兼容，新增接口由同一公共出口可导入', () => {
    expectTypeOf<
      ComponentProps<typeof LongMarchScene>
    >().toEqualTypeOf<LongMarchSceneProps>();
    expectTypeOf<
      ComponentProps<typeof HistoryEventPanel>
    >().toEqualTypeOf<HistoryEventPanelProps>();
    expectTypeOf<LongMarchSceneV2Props>().toExtend<LongMarchSceneProps>();
    expectTypeOf<ImmersiveExperienceProps['onInteractionCue']>()
      .parameter(0)
      .toHaveProperty('runId');
    expectTypeOf<TeachingInteractionProps['onResponse']>()
      .parameter(1)
      .toHaveProperty('interactionType');
  });
  it('相机和选择为可序列化普通数据，不接受 THREE/DOM 额外对象或非有限数', () => {
    const bookmark = {
      sceneId: 'test-scene',
      coordinateSystem: 'scene-local',
      position: [0, 1, 2],
      target: [0, 0, 0],
      zoom: 1,
      phaseId: null,
    };
    expect(
      cameraBookmarkSchema.parse(JSON.parse(JSON.stringify(bookmark))),
    ).toEqual(bookmark);
    expect(
      cameraBookmarkSchema.safeParse({
        ...bookmark,
        position: [Infinity, 0, 0],
      }).success,
    ).toBe(false);
    expect(
      cameraBookmarkSchema.safeParse({ ...bookmark, THREE: {} }).success,
    ).toBe(false);
    expect(
      historicalObjectSelectionSchema.parse({
        kind: 'person',
        id: 'test-person',
      }),
    ).toEqual({ kind: 'person', id: 'test-person' });
  });
  it('从公共出口遍历本地 import/export 图不存在循环依赖', async () => {
    const completed = new Set<string>();
    const visiting = new Set<string>();
    async function visit(path: string): Promise<void> {
      if (visiting.has(path)) throw new Error(`公共契约循环依赖：${path}`);
      if (completed.has(path)) return;
      visiting.add(path);
      const source = await readFile(path, 'utf8');
      for (const match of source.matchAll(
        /(?:import|export)\s[\s\S]*?\bfrom\s*['"](\.[^'"]+)['"]/g,
      )) {
        const base = resolve(dirname(path), match[1]!);
        let target: string | undefined;
        for (const candidate of [`${base}.ts`, resolve(base, 'index.ts')]) {
          try {
            if ((await stat(candidate)).isFile()) {
              target = candidate;
              break;
            }
          } catch {
            /* Try next resolution. */
          }
        }
        if (!target) throw new Error(`公共契约导入无法解析：${match[1]}`);
        await visit(target);
      }
      visiting.delete(path);
      completed.add(path);
    }
    await visit(
      fileURLToPath(new URL('../shared/contracts/index.ts', import.meta.url)),
    );
  });
});
