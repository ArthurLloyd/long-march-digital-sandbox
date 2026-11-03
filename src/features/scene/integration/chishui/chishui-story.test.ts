import { describe, expect, it } from 'vitest';
import {
  CHAPTER_SECONDS,
  CHISHUI_CHAPTERS,
  CHISHUI_SOURCES,
  sampleChishui,
  TOTAL_SECONDS,
} from './chishui-story';
describe('四渡赤水回放边界', () => {
  it.each([
    [0, 0, 0],
    [21.9, 0, 21.9 / 22],
    [22, 1, 0],
    [44, 2, 0],
    [66, 3, 0],
    [88, 3, 1],
    [200, 3, 1],
    [-10, 0, 0],
  ])('时间 %s 对应第 %s 幕', (time, chapter, progress) => {
    const state = sampleChishui(time);
    expect(state.chapter).toBe(chapter);
    expect(state.progress).toBeCloseTo(progress);
  });
  it('拒绝非有限时间并保持四幕连续', () => {
    expect(sampleChishui(NaN).time).toBe(0);
    expect(sampleChishui(Infinity).time).toBe(0);
    expect(CHISHUI_CHAPTERS).toHaveLength(4);
    expect(TOTAL_SECONDS).toBe(CHAPTER_SECONDS * 4);
  });
  it('四幕叙事具备日期、行动说明、史料入口，且图示不冒充经纬度', () => {
    expect(CHISHUI_SOURCES).toHaveLength(2);
    for (const chapter of CHISHUI_CHAPTERS) {
      expect(chapter.date).toContain('1935');
      expect(chapter.path.length).toBeGreaterThan(4);
      expect(chapter.text.length).toBeGreaterThan(35);
      expect(chapter.narration).toContain(chapter.name);
      expect(chapter).not.toHaveProperty('coordinates');
    }
  });
});
