import { expect, it } from 'vitest';
import { layoutAnchoredMapLabels } from '../app/landscape/event-marker-layout';
it('hides crowded labels instead of relocating their geographic anchor across camera changes', () => {
  const a = { id: 'a', x: 520, y: 380, visible: true },
    b = { id: 'b', x: 530, y: 390, visible: true };
  const first = layoutAnchoredMapLabels([a, b], 1366, 642, null);
  expect(first[0]).toMatchObject({ labelX: 520, labelY: 365, visible: true });
  expect(first[1]!.visible).toBe(false);
  const moved = layoutAnchoredMapLabels(
    [
      { ...a, x: 300, y: 270 },
      { ...b, x: 900, y: 400 },
    ],
    1366,
    642,
    null,
  );
  expect(moved[0]).toMatchObject({ labelX: 300, labelY: 255, visible: true });
  expect(moved[1]).toMatchObject({ labelX: 900, labelY: 385, visible: true });
  const blocked = layoutAnchoredMapLabels([a], 1366, 642, null, [
    { x: 450, y: 300, width: 300, height: 200 },
  ]);
  expect(blocked[0]).toMatchObject({
    labelX: 520,
    labelY: 365,
    visible: false,
  });
  expect(a).toEqual({ id: 'a', x: 520, y: 380, visible: true });
});
