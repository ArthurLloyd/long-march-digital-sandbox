import { describe, expect, it } from 'vitest';
import type { HistoryEvent, RouteFeature } from '../../shared/contracts';
import {
  completeSegmentCount,
  createProjection,
  visibleEvents,
  visibleRoutes,
} from './scene-data';

// In-memory engineering inputs only: these deliberately contain no human signatures.
const event: HistoryEvent = {
  id: 'test-event',
  title: '工程测试',
  dateText: '未知',
  datePrecision: 'unknown',
  locationName: '测试位置',
  coordinates: [105, 28],
  coordinatePrecision: 'approximate',
  summary: '测试',
  detail: '测试',
  sourceIds: ['test-source'],
  contentType: 'teaching_simulation',
  reviewStatus: 'reviewed',
  releaseStatus: 'published',
  reviewedBy: [],
  reviewedAt: null,
  reviews: [],
};
const route: RouteFeature = {
  id: 'test-route',
  name: '测试几何',
  coordinates: [
    [105, 28],
    [106, 29],
    [107, 28],
  ],
  sourceIds: ['test-source'],
  evidenceLevel: 'documented_geometry',
  displayMode: 'solid',
  spatialPrecision: 'approximate',
  reviewStatus: 'reviewed',
  releaseStatus: 'published',
  reviewedBy: [],
  reviewedAt: null,
  reviews: [],
};

describe('scene geometry boundary', () => {
  it('does not turn an empty dataset or unknown location into markers', () => {
    expect(visibleEvents([])).toEqual([]);
    expect(visibleRoutes([])).toEqual([]);
    expect(
      visibleEvents([
        { ...event, coordinates: null, coordinatePrecision: 'unknown' },
      ]),
    ).toEqual([]);
  });
  it('rejects draft and malformed coordinates even if accidentally passed by a consumer', () => {
    expect(
      visibleEvents([
        { ...event, releaseStatus: 'unpublished' },
        { ...event, reviewStatus: 'draft' },
        { ...event, coordinates: [181, 29] },
      ]),
    ).toEqual([]);
    expect(
      visibleRoutes([
        { ...route, releaseStatus: 'unpublished' },
        { ...route, displayMode: 'hidden' },
        {
          ...route,
          coordinates: [
            [NaN, 28],
            [107, 28],
          ],
        },
      ]),
    ).toEqual([]);
  });
  it('keeps confirmed places as independent points, rejecting a connected route', () => {
    const places: RouteFeature = {
      ...route,
      evidenceLevel: 'confirmed_locations',
      displayMode: 'points',
    };
    expect(visibleRoutes([places])).toEqual([places]);
    expect(visibleRoutes([{ ...places, displayMode: 'solid' }])).toEqual([]);
    expect(places.coordinates).toEqual(route.coordinates);
  });
  it('requires explicit schematic precision for dashed routes', () => {
    expect(
      visibleRoutes([
        { ...route, evidenceLevel: 'schematic', displayMode: 'dashed' },
      ]),
    ).toEqual([]);
    const schematic: RouteFeature = {
      ...route,
      evidenceLevel: 'schematic',
      displayMode: 'dashed',
      spatialPrecision: 'schematic',
    };
    expect(visibleRoutes([schematic])).toEqual([schematic]);
  });
  it('preserves orientation and fits supplied coordinates without inserting geometry', () => {
    const coordinates: [number, number][] = [
      [105, 28],
      [107, 30],
    ];
    const original = structuredClone(coordinates);
    const projection = createProjection(coordinates);
    const southwest = projection.project(coordinates[0]!);
    const northeast = projection.project(coordinates[1]!);
    expect(northeast[0]).toBeGreaterThan(southwest[0]);
    expect(northeast[2]).toBeLessThan(southwest[2]);
    expect(Math.abs(northeast[2] - southwest[2])).toBe(13);
    expect(coordinates).toEqual(original);
  });
  it('handles a single coordinate and antimeridian without an enormous span', () => {
    expect(createProjection([[105, 28]]).project([105, 28])).toEqual([
      0, 0.22, -0,
    ]);
    const projection = createProjection([
      [179, 20],
      [-179, 20],
    ]);
    expect(projection.project([-179, 20])[0]).toBeGreaterThan(
      projection.project([179, 20])[0],
    );
    expect(projection.center[0]).toBe(180);
  });
  it('progress reveals whole source segments only and clamps invalid progress', () => {
    expect(completeSegmentCount(4, 0)).toBe(0);
    expect(completeSegmentCount(4, 0.32)).toBe(0);
    expect(completeSegmentCount(4, 0.34)).toBe(1);
    expect(completeSegmentCount(4, 1)).toBe(3);
    expect(completeSegmentCount(4, 9)).toBe(3);
    expect(completeSegmentCount(4, -1)).toBe(0);
    expect(completeSegmentCount(4, NaN)).toBe(0);
    expect(completeSegmentCount(1, 1)).toBe(0);
  });
});
