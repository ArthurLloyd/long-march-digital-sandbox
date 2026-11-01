import type {
  ForceSnapshot,
  ForceTrack,
  HistoryDatasetV2,
  RouteFeature,
} from '../../shared/contracts';

export const CAMP_LABELS = {
  red_army: '红军相关部队',
  nationalist_army: '国民党军相关部队',
  other: '其他部队',
} as const;
export const SPATIAL_LABELS = {
  exact: '精确',
  approximate: '近似',
  schematic: '示意',
  unknown: '未知',
} as const;
export const FORCE_MODE_LABELS = {
  point: '点位',
  region: '区域',
  route: '路线',
  hidden: '隐藏',
} as const;
export interface VisibleForceEntry {
  track: ForceTrack;
  snapshot: ForceSnapshot;
  route: RouteFeature | null;
}
export interface ForcePhaseState {
  phaseId: string | null;
  entries: VisibleForceEntry[];
  tracks: ForceTrack[];
  snapshots: ForceSnapshot[];
  routes: RouteFeature[];
  schematic: boolean;
}

/** Full validated published input only. No interpolation, geometry creation or historical clock. */
export function selectForceStateForPhase(
  published: HistoryDatasetV2,
  phaseId: string | null,
): ForcePhaseState {
  const phase = published.phases.find((p) => p.phaseId === phaseId);
  const valid =
    phase &&
    published.topics.some(
      (t) => t.topicId === phase.topicId && t.phaseIds.includes(phase.phaseId),
    );
  const entries: VisibleForceEntry[] = [];
  if (valid) {
    for (const snapshot of published.forceSnapshots) {
      if (
        snapshot.phaseId !== phaseId ||
        snapshot.releaseStatus !== 'published' ||
        snapshot.reviewStatus !== 'reviewed' ||
        snapshot.displayMode === 'hidden'
      )
        continue;
      const track = published.forceTracks.find(
        (t) =>
          t.trackId === snapshot.trackId &&
          t.snapshotIds.includes(snapshot.snapshotId) &&
          t.releaseStatus === 'published' &&
          t.reviewStatus === 'reviewed',
      );
      if (!track) continue;
      const route =
        snapshot.displayMode === 'route'
          ? (published.routes.find(
              (r) =>
                r.id === snapshot.routeId &&
                r.displayMode !== 'hidden' &&
                r.releaseStatus === 'published' &&
                r.reviewStatus === 'reviewed',
            ) ?? null)
          : null;
      if (
        (snapshot.displayMode === 'point' && snapshot.coordinates === null) ||
        (snapshot.displayMode === 'region' && snapshot.region === null) ||
        (snapshot.displayMode === 'route' && route === null)
      )
        continue;
      entries.push({ track, snapshot, route });
    }
  }
  const snapshots = entries.map((e) => e.snapshot);
  const tracks = [
    ...new Map(entries.map((e) => [e.track.trackId, e.track])).values(),
  ].map((t) => ({
    ...t,
    snapshotIds: snapshots
      .filter((s) => s.trackId === t.trackId)
      .map((s) => s.snapshotId),
  }));
  const routes = [
    ...new Map(
      entries.flatMap((e) => (e.route ? [[e.route.id, e.route] as const] : [])),
    ).values(),
  ];
  return {
    phaseId: valid ? phaseId : null,
    entries,
    tracks,
    snapshots,
    routes,
    schematic: entries.some((e) =>
      e.snapshot.displayMode === 'point'
        ? e.snapshot.coordinatePrecision === 'schematic'
        : e.snapshot.displayMode === 'region'
          ? e.snapshot.region?.precision === 'schematic'
          : e.route?.spatialPrecision === 'schematic',
    ),
  };
}

export function forcePrecision(entry: VisibleForceEntry) {
  return entry.snapshot.displayMode === 'point'
    ? entry.snapshot.coordinatePrecision
    : entry.snapshot.displayMode === 'region'
      ? entry.snapshot.region!.precision
      : entry.route!.spatialPrecision;
}
