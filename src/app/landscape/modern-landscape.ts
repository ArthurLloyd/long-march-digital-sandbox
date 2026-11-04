import * as THREE from 'three';
import { campaignRivers, type CampaignRiver } from './campaign-rivers';
import { createEnvironmentDetails } from '../../features/scene';
import {
  geography,
  projectGeo,
  unprojectGeo,
  type GeoBounds,
} from './geography';
import modernWater from './data/details/modern-water.json';
import {
  createTerrainField,
  combineTerrainFields,
  blendDetailHeight,
  type ModernHeightfield,
  type TerrainField,
} from './terrain-field';
import {
  terrainMaterial,
  waterMaterial,
  createAtmosphere,
  skyEnvironment,
} from './terrain-materials';
import { riverRibbon, createRiverChannel, type RiverPoint } from './river-mesh';
import type { RegionId } from './map-regions';
import { disposeLandscapeRoot } from './resource-lifecycle';
import { reliefBlockGeometry, reliefBlockMaterial } from './relief-block';
import {
  createExhibitionAtmosphere,
  EXHIBITION_LIGHT,
} from './exhibition-atmosphere';
import { createTerrainLod } from './terrain-lod';
import { createTerrainRequests } from './terrain-requests';
import { geographicRegionAt } from './journey-navigation';
import { eventTerrainWindow } from './event-terrain';

const loaders = import.meta.glob<ModernHeightfield>(
  './data/details/{ruijin,zunyi,chishui,jinsha,luding,snow,grass,reunion}.json',
  { import: 'default', eager: true },
);
const eventLoaders = import.meta.glob<ModernHeightfield>(
  ['./data/event-terrain/*.json', '!./data/event-terrain/provenance.json'],
  { import: 'default', eager: true },
);
// These DEMs ship with the map. Compile their shared relief once on entry,
// before the transport can start, and reuse the fields on subsequent visits.
let residentFields: Map<string, TerrainField> | undefined;
function terrainSources() {
  if (!residentFields) {
    residentFields = new Map();
    for (const [path, data] of Object.entries({
      ...loaders,
      ...eventLoaders,
    })) {
      const name = path.split('/').pop()!.replace('.json', '');
      residentFields.set(
        path.includes('/event-terrain/') ? 'event:' + name : name,
        createTerrainField(data),
      );
    }
  }
  return residentFields;
}
const point = (coordinates: readonly number[]): RiverPoint => {
  const [x, z] = projectGeo([coordinates[0]!, coordinates[1]!]);
  return { x, z };
};
const modernLines = geography.rivers.flatMap((river) =>
  river.coordinates.map((line) => ({
    name: river.name,
    points: line.map(point),
  })),
);
// Modern OSM takes precedence only inside its acquired envelope. Clip the
// Natural Earth reference there, retaining its original centreline elsewhere.
const osmDadu =
  modernWater.regions
    .find((r) => r.regionId === 'luding')
    ?.lines.flatMap((l) => l.coordinates.map(point)) ?? [];
const daduBox: GeoBounds = [
  Math.min(...osmDadu.map((p) => p.x)),
  Math.min(...osmDadu.map((p) => p.z)),
  Math.max(...osmDadu.map((p) => p.x)),
  Math.max(...osmDadu.map((p) => p.z)),
];
function outsideWater(points: RiverPoint[], b: GeoBounds) {
  const result: RiverPoint[][] = [];
  let run: RiverPoint[] = [];
  const flush = () => {
    if (run.length > 1) result.push(run);
    run = [];
  };
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!,
      p = points[i]!,
      dx = p.x - a.x,
      dz = p.z - a.z;
    let lo = 0,
      hi = 1,
      hit = true;
    for (const [v, q] of [
      [-dx, a.x - b[0]],
      [dx, b[2] - a.x],
      [-dz, a.z - b[1]],
      [dz, b[3] - a.z],
    ]) {
      if (v === 0) {
        if (q! < 0) hit = false;
        continue;
      }
      const t = q! / v!;
      if (v! < 0) lo = Math.max(lo, t);
      else hi = Math.min(hi, t);
    }
    const at = (t: number) => ({ x: a.x + dx * t, z: a.z + dz * t });
    if (!hit || lo > hi) {
      if (!run.length) run.push(a);
      run.push(p);
      continue;
    }
    if (lo > 0) {
      if (!run.length) run.push(a);
      run.push(at(lo));
    }
    flush();
    if (hi < 1) run.push(at(hi), p);
  }
  flush();
  return result;
}
const referenceWater: RiverPoint[][] = [
  ...modernLines.flatMap((line) => {
    const width =
      line.name === 'Yangtze' || line.name === 'Yellow'
        ? 0.011
        : line.name === 'Dadu'
          ? 0.007
          : 0.005;
    const paths =
      line.name === 'Dadu' && osmDadu.length
        ? outsideWater(line.points, daduBox)
        : [line.points];
    return paths.map((path) => path.map((p) => ({ ...p, width })));
  }),
  ...modernWater.regions.flatMap((r) =>
    r.lines.map((l) =>
      l.coordinates.map((c) => ({
        ...point(c),
        width: r.regionId === 'chishui' ? 0.0048 : 0.0068,
      })),
    ),
  ),
];
type FocusPivot = {
  x: number;
  z: number;
  viewDirection?: { x: number; z: number };
  waterLevel?: number;
  riverCandidates?: { x: number; z: number; level: number }[];
};

/** One modern land/water surface. No historical geometry or additional clock. */
export function createModernLandscape(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
) {
  const root = new THREE.Group();
  scene.add(root);
  const environment = skyEnvironment(renderer);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.5;
  const aEnvironment = createEnvironmentDetails();
  root.add(aEnvironment.root);
  const globalField = createTerrainField(geography);
  const atmosphere = createExhibitionAtmosphere(globalField.worldBounds);
  const landMaterial = terrainMaterial(atmosphere),
    water = waterMaterial(atmosphere, environment.texture);
  let gain = 12,
    detailField: TerrainField | null = null,
    region: RegionId | null = null,
    disposed = false;
  let focusedPivot: FocusPivot | null = null,
    visibleRivers = true;
  let areaBounds: GeoBounds | null = null;
  const sources = terrainSources();
  const fields = [...sources.values()].reverse();
  const joinedChishui = combineTerrainFields([
    sources.get('zunyi')!,
    sources.get('chishui')!,
  ]);
  // The narrow event windows take precedence and feather into the underlying
  // regional DEM, which itself feathers into the continental grid.
  const reliefAt = (x: number, z: number, scale: number, start = 0): number => {
    for (let i = start; i < fields.length; i++) {
      const field = fields[i]!;
      if (field.contains(x, z))
        return blendDetailHeight(field, x, z, scale, (a, b, g) =>
          reliefAt(a, b, g, i + 1),
        );
    }
    return globalField.height(x, z, scale);
  };
  const landHeight = (x: number, z: number) => reliefAt(x, z, gain);
  const metres = (x: number, z: number) =>
    (fields.find((f) => f.contains(x, z)) ?? globalField).metres(x, z);
  // The same bounded channel is used for terrain vertices, riverbanks and water.
  let channel = createRiverChannel(referenceWater, landHeight, 0.0068, 0.0038);
  const analyticalSurface = (x: number, z: number) => channel.surface(x, z);
  const bank = (x: number, z: number) => {
    const p = channel.at(x, z);
    if (!p) return 0;
    const u = p.distance / p.width;
    return Math.max(0, 1 - Math.abs(u - 1.25) / 1.2);
  };
  const lod = createTerrainLod(
    root,
    landMaterial,
    globalField.worldBounds,
    geography.cols,
    geography.rows,
    analyticalSurface,
    metres,
    bank,
    fields.map((f) => f.worldBounds),
  );
  const waterGroup = new THREE.Group();
  root.add(waterGroup);
  const riverInk = campaignRivers(lod.heightAt);
  root.add(riverInk.root);
  const buildWater = () => {
    for (const child of [...waterGroup.children])
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        waterGroup.remove(child);
      }
    for (const path of channel.paths) {
      if (path.length < 2) continue;
      const mesh = new THREE.Mesh(
        riverRibbon(path, landHeight, 0.0068),
        water.material,
      );
      mesh.receiveShadow = true;
      waterGroup.add(mesh);
    }
    waterGroup.visible = visibleRivers;
  };
  buildWater();
  const sky = createAtmosphere();
  root.add(sky);
  const fog = new THREE.Fog(EXHIBITION_LIGHT.fog, 27, 80);
  scene.fog = fog;
  const plinth = new THREE.Mesh(
    reliefBlockGeometry(globalField.worldBounds, lod.heightAt, -2.8),
    reliefBlockMaterial(),
  );
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  root.add(plinth);
  const refreshEnvironment = () => {
    if (!region || !detailField) {
      aEnvironment.clear();
      return;
    }
    const b = detailField.worldBounds;
    aEnvironment.populate(
      region,
      { x: (b[0] + b[2]) / 2, z: (b[1] + b[3]) / 2 },
      lod.heightAt,
      (x, z) => {
        const p = channel.at(x, z);
        return (
          detailField!.contains(x, z) && (!p || p.distance > p.width * 2.2)
        );
      },
    );
  };
  let heightVersion = 0;
  const updateTerrain = () => {
    channel = createRiverChannel(referenceWater, landHeight, 0.0068, 0.0038);
    lod.update();
    riverInk.redrape();
    plinth.geometry.dispose();
    plinth.geometry = reliefBlockGeometry(
      globalField.worldBounds,
      lod.heightAt,
      -2.8,
    );
    buildWater();
    refreshEnvironment();
    heightVersion++;
  };
  let requestedRegion: RegionId = 'ruijin';
  let focusedAreaKey: string | null = null;
  const terrainKey = (id: RegionId) =>
    id === 'zunyi' || id === 'chishui' ? 'zunyi-chishui' : id;
  const commit = (field: TerrainField, id: string) => {
    detailField = field;
    areaBounds = null;
    region = id.startsWith('event:') ? null : requestedRegion;
    focusedPivot = null;
    const b = field.worldBounds;
    const center = { x: (b[0] + b[2]) / 2, z: (b[1] + b[3]) / 2 };
    atmosphere.origin.value.set(
      center.x,
      landHeight(center.x, center.z),
      center.z,
    );
    atmosphere.local.value = 0.18;
    refreshEnvironment();
  };
  const requests = createTerrainRequests<TerrainField>(async (id) => {
    const field = id === 'zunyi-chishui' ? joinedChishui : sources.get(id);
    if (!field) throw new Error('缺少现代地形');
    return field;
  }, commit);
  let observerKey = '',
    pendingObservation: {
      x: number;
      z: number;
      distance: number;
      since: number;
    } | null = null;
  let retryAfter = 0;
  const wantedRegion = (x: number, z: number) =>
    geographicRegionAt(unprojectGeo([x, z]), region);
  const waterAt = (x: number, z: number) => {
    const p = channel.at(x, z);
    return p && p.distance <= p.width ? p.level : null;
  };
  return {
    heightAt: lod.heightAt,
    waterHeightAt: waterAt,
    navigationHeightAt: (x: number, z: number) =>
      Math.max(lod.heightAt(x, z), waterAt(x, z) ?? -Infinity),
    get worldBounds() {
      return globalField.worldBounds;
    },
    async focus(
      id: RegionId,
      entryComposition = false,
    ): Promise<FocusPivot | null> {
      focusedAreaKey = null;
      pendingObservation = null;
      atmosphere.local.value = entryComposition ? 0.12 : 0.18;
      observerKey = '';
      retryAfter = 0;
      requests.cancel();
      if (region !== id || !focusedPivot) {
        if (region !== id) {
          requestedRegion = id;
          if (!(await requests.request(terrainKey(id)))) return null;
        }
        const b = detailField!.worldBounds,
          center = { x: (b[0] + b[2]) / 2, z: (b[1] + b[3]) / 2 };
        const paths = channel.paths
          .flatMap((p) => p)
          .filter((p) => detailField!.contains(p.x, p.z));
        const nearest = paths.sort(
          (a, b) =>
            Math.hypot(a.x - center.x, a.z - center.z) -
            Math.hypot(b.x - center.x, b.z - center.z),
        )[0];
        focusedPivot = nearest
          ? { ...nearest, waterLevel: nearest.level }
          : center;
      }
      return focusedPivot;
    },
    overview() {
      focusedAreaKey = null;
      requests.cancel();
      pendingObservation = null;
      observerKey = '';
      retryAfter = 0;
      region = null;
      detailField = null;
      areaBounds = null;
      focusedPivot = null;
      atmosphere.local.value = 0;
      refreshEnvironment();
    },
    async focusArea(bounds: GeoBounds) {
      const w = eventTerrainWindow([
        (bounds[0] + bounds[2]) / 2,
        (bounds[1] + bounds[3]) / 2,
      ]);
      if (w) {
        const key = `event:${w.id}`;
        if (
          focusedAreaKey === key &&
          detailField &&
          region === null &&
          requests.pendingId === null
        )
          return;
        focusedAreaKey = key;
        pendingObservation = null;
        observerKey = key;
        await requests.request(key);
        return;
      }
      focusedAreaKey = null;
      const a = projectGeo([bounds[0], bounds[3]]),
        b = projectGeo([bounds[2], bounds[1]]);
      const next: GeoBounds = [a[0], a[1], b[0], b[1]];
      if (areaBounds?.every((v, i) => v === next[i])) return;
      requests.cancel();
      pendingObservation = null;
      observerKey = '';
      region = null;
      detailField = null;
      focusedPivot = null;
      areaBounds = next;
      atmosphere.local.value = 0.18;
      // Local display resampling of the existing continental DEM, never a
      // newly claimed high-resolution source or a historical boundary.
      refreshEnvironment();
    },
    observe(
      x: number,
      z: number,
      distance: number,
      now: number,
      navigating = true,
    ) {
      if (disposed) return;
      if (lod.advance(now)) {
        heightVersion++;
        if (!lod.details.morphing) refreshEnvironment();
      }
      // Explicit chapter/arrival requests must finish before the old camera
      // target can infer another region. A failed/cancelled request releases
      // this guard, preserving ordinary wheel browsing and retries.
      if (!navigating || requests.pendingId !== null) return;
      const p = pendingObservation;
      if (
        !p ||
        Math.hypot(x - p.x, z - p.z) > Math.max(0.008, distance * 0.12) ||
        Math.abs(Math.log(distance / p.distance)) > 0.22
      ) {
        pendingObservation = { x, z, distance, since: now };
        return;
      }
      if (now - p.since < 220) return;
      pendingObservation = null;
      const id =
        focusedAreaKey && detailField?.contains(x, z)
          ? null
          : distance < 4.2
            ? wantedRegion(x, z)
            : null;
      const key = id ?? 'base';
      if (
        distance < 4.2 &&
        key !== observerKey &&
        id !== region &&
        now >= retryAfter
      ) {
        observerKey = key;
        if (id) {
          requestedRegion = id;
          void requests.request(terrainKey(id)).then((result) => {
            if (!result && !disposed && observerKey === key) {
              observerKey = '';
              retryAfter = performance.now() + 1500;
            }
          });
        } else {
          requests.cancel();
          region = null;
          detailField = null;
          focusedPivot = null;
          refreshEnvironment();
        }
      }
      if (lod.refine(x, z, distance, now)) {
        refreshEnvironment();
        heightVersion++;
      }
    },
    pick(ray: THREE.Raycaster) {
      const hits = ray.intersectObjects(
        [...lod.meshes, ...(visibleRivers ? waterGroup.children : [])],
        false,
      );
      const hit = hits[0];
      return hit ? hit.point.clone() : null;
    },
    setExaggeration(value: number) {
      if (value === gain) return;
      gain = value;
      focusedPivot = null;
      updateTerrain();
      const o = atmosphere.origin.value;
      o.y = landHeight(o.x, o.z);
    },
    setFilmWater(enabled: boolean, river: CampaignRiver | null = null) {
      atmosphere.film.value = enabled ? 1 : 0;
      riverInk.select(enabled ? river : null);
      water.material.emissive.setHex(enabled ? 0x80cfff : 0);
      water.material.emissiveIntensity = enabled ? (river ? 0.18 : 0.48) : 0;
    },
    setRivers(value: boolean) {
      visibleRivers = value;
      waterGroup.visible = value;
      riverInk.root.visible = value;
    },
    cancelPending() {
      requests.cancel();
      pendingObservation = null;
      observerKey = '';
    },
    update(seconds: number, viewDistance: number, position?: THREE.Vector3) {
      water.time.value = seconds;
      aEnvironment.update(seconds);
      aEnvironment.root.visible = viewDistance < 6;
      fog.near = Math.max(0.035, viewDistance * 0.95);
      fog.far = Math.max(0.8, viewDistance * 4 + 2);
      if (position) {
        sky.position.copy(position);
        sky.scale.setScalar(
          Math.max(12, Math.min(160, viewDistance * 4 + 4)) * 0.006,
        );
      }
    },
    get region() {
      return region;
    },
    get bounds(): GeoBounds {
      return detailField?.worldBounds ?? areaBounds ?? globalField.worldBounds;
    },
    get heightVersion() {
      return heightVersion;
    },
    get diagnostics() {
      const materials = new Set<THREE.Material>();
      root.traverse((object) => {
        if (object instanceof THREE.Mesh)
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((m) => materials.add(m));
      });
      return {
        ...lod.details,
        region,
        heightVersion,
        fieldCache: requests.size,
        exaggeration: gain,
        materials: materials.size,
      };
    },
    get modernWaterSource() {
      return 'OSM + Natural Earth';
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      requests.dispose();
      scene.environment = null;
      aEnvironment.dispose();
      riverInk.dispose();
      lod.dispose();
      environment.dispose();
      disposeLandscapeRoot(root, [landMaterial, water.material]);
    },
  };
}
