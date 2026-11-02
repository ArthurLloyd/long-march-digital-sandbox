import { describe, expect, it } from 'vitest';
import { createDraftV2Dataset } from './fixtures/v2-dataset';
import { buildSpatialView } from '../features/scene/atlas/spatial-view';

// Synthetic positions exercise the adapter only; no dataset or review is published.
describe('phase spatial projection', () => {
  it('keeps unknown positions hidden and does not guess a route origin', () => {
    const data = createDraftV2Dataset();
    expect(buildSpatialView(data, 'fixture-phase').units).toEqual([]);
    data.forceSnapshots[0]!.displayMode = 'route';
    data.forceSnapshots[0]!.routeId = 'absent-route';
    expect(buildSpatialView(data, 'fixture-phase').units).toEqual([]);
  });
  it('switches only to a matching dated point and clears a previous phase', () => {
    const data = createDraftV2Dataset();
    Object.assign(data.forceSnapshots[0]!, {
      displayMode: 'point',
      coordinates: [102.1, 29.9],
      coordinatePrecision: 'approximate',
    });
    expect(buildSpatialView(data, 'fixture-phase').units[0]?.point).toEqual([
      102.1, 29.9,
    ]);
    expect(buildSpatialView(data, 'next-phase').units).toEqual([]);
    expect(buildSpatialView(data, null).units).toEqual([]);
    data.forceSnapshots[0]!.coordinatePrecision = 'unknown';
    expect(buildSpatialView(data, 'fixture-phase').units).toEqual([]);
  });
  it('rejects ambiguous duplicate snapshots and snapshots not owned by the track', () => {
    const data = createDraftV2Dataset();
    Object.assign(data.forceSnapshots[0]!, {
      displayMode: 'point',
      coordinates: [102.1, 29.9],
      coordinatePrecision: 'schematic',
    });
    data.forceSnapshots.push({
      ...data.forceSnapshots[0]!,
      snapshotId: 'duplicate',
    });
    data.forceTracks[0]!.snapshotIds.push('duplicate');
    expect(buildSpatialView(data, 'fixture-phase').units).toEqual([]);
    data.forceTracks[0]!.snapshotIds = [];
    expect(buildSpatialView(data, 'fixture-phase').units).toEqual([]);
  });
  it('preserves a known area without inventing a centroid unit or point labels', () => {
    const data = createDraftV2Dataset();
    Object.assign(data.forceSnapshots[0]!, {
      displayMode: 'region',
      region: {
        coordinates: [
          [102, 29],
          [103, 29],
          [102, 30],
        ],
        precision: 'schematic',
      },
    });
    const view = buildSpatialView(data, 'fixture-phase');
    expect(view.units[0]?.point).toBeNull();
    expect(view.units[0]?.region).toHaveLength(3);
    expect(view.objects).toEqual([]);
  });
});
