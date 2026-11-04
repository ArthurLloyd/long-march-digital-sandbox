import { expect, it } from 'vitest';
import { eventNarrative, readingCopy } from '../app/exhibition/story-display';
import { createJourneyContent } from '../app/exhibition/exhibition-content';
import raw from '../data/verified/dataset.json';

it('keeps existing historical facts in reading prose and preserves B editorial notes in the original records', () => {
  const before = JSON.stringify(raw),
    c = createJourneyContent(raw, 'exhibition');
  const event = c.dataset.events.find((e) => e.id === 'event-js')!;
  const text = eventNarrative(event).join('');
  expect(text).toContain('刘伯承');
  expect(text).toContain('5月3日至9日');
  expect(text).not.toMatch(/资料边界|src-|不从文字计算|不能等同/);
  expect(event.detail).toContain('资料边界');
  expect(JSON.stringify(raw)).toBe(before);
});

it('removes inline editorial citations before sentence filtering so no orphan source fragment appears', () => {
  expect(
    readingCopy(
      '这段本页说明应移到出处。（src-example，“引文线索”）真实叙事。',
    ),
  ).toBe('真实叙事。');
});
