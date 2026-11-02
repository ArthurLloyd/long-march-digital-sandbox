import * as THREE from 'three';
import { createEnvironmentDetails, REGION_MOOD } from '../../features/scene';
import { geography, projectGeo, type GeoBounds } from './geography';
import modernWater from './data/details/modern-water.json';
import {
  createTerrainField,
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
import {
  riverRibbon,
  channelCarver,
  createRiverChannel,
  type RiverPoint,
} from './river-mesh';
import type { RegionId } from './map-regions';
import { disposeLandscapeRoot } from './resource-lifecycle';
import { reliefBlockGeometry, reliefBlockMaterial } from './relief-block';
import {
  createExhibitionAtmosphere,
  EXHIBITION_LIGHT,
} from './exhibition-atmosphere';

const loaders = import.meta.glob<ModernHeightfield>(
  './data/details/{ruijin,zunyi,chishui,jinsha,luding,snow,grass,reunion}.json',
  {
    import: 'default',
  },
);
const cache = new Map<RegionId, Promise<ModernHeightfield>>();
const exhibitionBase = -2.8;
type FocusPivot = {
  x: number;
  z: number;
  viewDirection?: { x: number; z: number };
  waterLevel?: number;
  riverCandidates?: { x: number; z: number; level: number }[];
};
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

/** Modern land and water visual layer; no historical routes or timeline state. */
export function createModernLandscape(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
) {
  const root = new THREE.Group();
  const environment = skyEnvironment(renderer);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.5;
  scene.add(root);
  const aEnvironment = createEnvironmentDetails();
  root.add(aEnvironment.root);
  const globalField = createTerrainField(geography);
  const atmosphere = createExhibitionAtmosphere(globalField.worldBounds);
  const landMaterial = terrainMaterial(atmosphere),
    water = waterMaterial(atmosphere, environment.texture);
  const bankMaterial = new THREE.MeshStandardMaterial({
    color: '#777c7b',
    roughness: 0.94,
    side: THREE.DoubleSide,
  });
  let gain = 12,
    detailField: TerrainField | null = null,
    region: RegionId | null = null,
    disposed = false,
    revision = 0;
  let visibleRivers = true;
  let focusedPivot: FocusPivot | null = null;
  let activeLines: RiverPoint[][] = modernLines.map((line) => line.points);
  let halfWidth = 0.018;
  let carve = channelCarver(activeLines, halfWidth);
  const landHeight = (x: number, z: number) =>
    detailField
      ? blendDetailHeight(detailField, x, z, gain, globalField.height)
      : globalField.height(x, z, gain);
  let channel: ReturnType<typeof createRiverChannel> | null = null;
  const surface = (x: number, z: number) =>
    channel ? channel.surface(x, z) : landHeight(x, z) - carve(x, z);
  const buildTerrain = (field: TerrainField, cols: number, rows: number) => {
    const [left, top, right, bottom] = field.worldBounds;
    const geometry = new THREE.PlaneGeometry(
      right - left,
      bottom - top,
      cols - 1,
      rows - 1,
    );
    geometry.rotateX(-Math.PI / 2);
    geometry.translate((left + right) / 2, 0, (top + bottom) / 2);
    const positions = geometry.getAttribute('position'),
      elevation = new Float32Array(positions.count);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        z = positions.getZ(i);
      positions.setY(i, surface(x, z));
      elevation[i] = field.metres(x, z);
    }
    geometry.setAttribute(
      'panElevation',
      new THREE.BufferAttribute(elevation, 1),
    );
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, landMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };
  const globe = buildTerrain(globalField, geography.cols, geography.rows);
  root.add(globe);
  const globalIndex = globe.geometry.index!;
  const originalIndex = new Uint32Array(globalIndex.array);
  let detailMesh: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshStandardMaterial
  > | null = null;
  const waterGroup = new THREE.Group();
  root.add(waterGroup);
  const clearWater = () => {
    for (const object of [...waterGroup.children])
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        waterGroup.remove(object);
      }
  };
  const buildWater = () => {
    clearWater();
    for (const points of channel?.paths ?? activeLines) {
      if (points.length < 2) continue;
      const bed = new THREE.Mesh(
        riverRibbon(points, surface, halfWidth, true, 0.0035),
        bankMaterial,
      );
      const top = new THREE.Mesh(
        riverRibbon(points, landHeight, halfWidth),
        water.material,
      );
      bed.receiveShadow = true;
      top.receiveShadow = true;
      waterGroup.add(bed, top);
    }
    waterGroup.visible = visibleRivers;
  };
  buildWater();
  const sky = createAtmosphere();
  root.add(sky);
  const fog = new THREE.Fog(EXHIBITION_LIGHT.fog, 27, 80);
  scene.fog = fog;
  const [left, top, right, bottom] = globalField.worldBounds;
  const plinth = new THREE.Mesh(
    reliefBlockGeometry([left, top, right, bottom], surface, exhibitionBase),
    reliefBlockMaterial(),
  );
  plinth.receiveShadow = true;
  plinth.castShadow = true;
  root.add(plinth);
  const stitch = () => {
    globalIndex.array.set(originalIndex);
    if (detailField) {
      const p = globe.geometry.getAttribute('position');
      for (let i = 0; i < originalIndex.length; i += 3) {
        const a = originalIndex[i]!,
          b = originalIndex[i + 1]!,
          c = originalIndex[i + 2]!;
        if (
          [a, b, c].every((index) =>
            detailField!.contains(p.getX(index), p.getZ(index)),
          )
        ) {
          globalIndex.setX(i + 1, a);
          globalIndex.setX(i + 2, a);
        }
      }
    }
    globalIndex.needsUpdate = true;
  };
  const updateTerrain = () => {
    const p = globe.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++)
      p.setY(
        i,
        globalField.height(p.getX(i), p.getZ(i), gain) -
          (detailField ? 0 : carve(p.getX(i), p.getZ(i))),
      );
    p.needsUpdate = true;
    globe.geometry.computeBoundingSphere();
    if (detailMesh) {
      root.remove(detailMesh);
      detailMesh.geometry.dispose();
      detailMesh = null;
    }
    if (detailField) {
      detailMesh = buildTerrain(detailField, 769, 641);
      root.add(detailMesh);
    }
    plinth.geometry.dispose();
    plinth.geometry = reliefBlockGeometry(
      globalField.worldBounds,
      surface,
      exhibitionBase,
    );
    stitch();
    // Restored overview triangles need their normals recomputed AFTER indices.
    // Degenerate detail cut-outs otherwise leave a black rectangle on return.
    globe.geometry.computeVertexNormals();
    buildWater();
    if (region && detailField) {
      const b = detailField.worldBounds;
      aEnvironment.populate(
        region,
        focusedPivot ?? { x: (b[0] + b[2]) / 2, z: (b[1] + b[3]) / 2 },
        surface,
        (x, z) => {
          const water = channel?.at(x, z);
          return (
            detailField!.contains(x, z) &&
            (!water || water.distance > water.width * 1.8)
          );
        },
      );
    }
  };
  const localLines = (id: RegionId, field: TerrainField) => {
    const osm = modernWater.regions.find((item) => item.regionId === id);
    const candidates = [
      ...modernLines
        .filter((line) => !(id === 'luding' && osm && line.name === 'Dadu'))
        .map((line) => line.points),
      ...(osm?.lines.map((line) => line.coordinates.map(point)) ?? []),
    ];
    const output: RiverPoint[][] = [];
    for (const points of candidates) {
      let segment: RiverPoint[] = [];
      for (const point of points) {
        if (field.contains(point.x, point.z)) segment.push(point);
        else {
          if (segment.length > 1) output.push(segment);
          segment = [];
        }
      }
      if (segment.length > 1) output.push(segment);
    }
    return output;
  };
  return {
    heightAt: surface,
    async focus(id: RegionId, entryComposition = false) {
      const ticket = ++revision;
      if (region === id && focusedPivot) return focusedPivot;
      try {
        const loader = loaders[`./data/details/${id}.json`];
        if (!loader) return null;
        let pending = cache.get(id);
        if (!pending) {
          pending = loader();
          cache.set(id, pending);
        }
        const data = await pending;
        if (disposed || ticket !== revision) return null;
        region = id;
        focusedPivot = null;
        detailField = createTerrainField(data);
        const mood = REGION_MOOD[id];
        atmosphere.regionActive.value = 1;
        atmosphere.regionBounds.value.set(...detailField.worldBounds);
        atmosphere.regionForest.value.set(mood.forest);
        atmosphere.regionGround.value.set(mood.ground);
        atmosphere.regionRock.value.set(mood.rock);
        activeLines = localLines(id, detailField);
        halfWidth = 0.0065;
        channel = createRiverChannel(
          activeLines,
          landHeight,
          halfWidth,
          0.0035,
        );
        updateTerrain();
        fog.near = entryComposition ? 10 : 5;
        fog.far = entryComposition ? 36 : 22;
        const bounds = detailField.worldBounds;
        const center = {
          x: (bounds[0] + bounds[2]) / 2,
          z: (bounds[1] + bounds[3]) / 2,
        };
        atmosphere.origin.value.set(
          center.x,
          landHeight(center.x, center.z),
          center.z,
        );
        atmosphere.local.value = entryComposition ? 0.15 : 0.3;
        atmosphere.bounds.value.set(...globalField.worldBounds);
        const osm = modernWater.regions.find((item) => item.regionId === id);
        if (osm) {
          const nearest = osm.lines
            .flatMap((line) =>
              line.coordinates.map((coordinates, index) => {
                const p = point(coordinates),
                  a = point(line.coordinates[Math.max(0, index - 1)]!),
                  b = point(
                    line.coordinates[
                      Math.min(line.coordinates.length - 1, index + 1)
                    ]!,
                  );
                const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
                return {
                  ...p,
                  viewDirection: {
                    x: (b.x - a.x) / length,
                    z: (b.z - a.z) / length,
                  },
                  waterLevel:
                    channel!.at(p.x, p.z)?.level ??
                    landHeight(p.x, p.z) + 0.0007,
                };
              }),
            )
            .filter((p) => detailField!.contains(p.x, p.z))
            .sort(
              (a, b) =>
                Math.hypot(a.x - center.x, a.z - center.z) -
                Math.hypot(b.x - center.x, b.z - center.z),
            )[0];
          if (nearest) {
            atmosphere.origin.value.set(
              nearest.x,
              nearest.waterLevel,
              nearest.z,
            );
            const riverCandidates = channel!.paths
              .flatMap((line) =>
                line.filter(
                  (p, index) =>
                    index % 4 === 0 &&
                    Math.hypot(p.x - nearest.x, p.z - nearest.z) > 0.02 &&
                    Math.hypot(p.x - nearest.x, p.z - nearest.z) < 0.7,
                ),
              )
              .map((p) => ({ x: p.x, z: p.z, level: p.level }));
            return (focusedPivot = { ...nearest, riverCandidates });
          }
        }
        return (focusedPivot = center);
      } catch {
        cache.delete(id);
        return null;
      }
    },
    overview() {
      atmosphere.local.value = 0;
      revision++;
      region = null;
      aEnvironment.clear();
      atmosphere.regionActive.value = 0;
      atmosphere.bounds.value.set(...globalField.worldBounds);
      focusedPivot = null;
      detailField = null;
      channel = null;
      activeLines = modernLines.map((line) => line.points);
      halfWidth = 0.018;
      carve = channelCarver(activeLines, halfWidth);
      updateTerrain();
      fog.near = 27;
      fog.far = 80;
    },
    setExaggeration(value: number) {
      if (value === gain) return;
      gain = value;
      focusedPivot = null;
      if (region)
        channel = createRiverChannel(
          activeLines,
          landHeight,
          halfWidth,
          0.0035,
        );
      carve = channelCarver(
        activeLines,
        halfWidth,
        region ? 0.0018 * gain : 0.0028,
      );
      updateTerrain();
      if (region) {
        const origin = atmosphere.origin.value;
        origin.y =
          channel?.at(origin.x, origin.z)?.level ??
          landHeight(origin.x, origin.z);
      }
    },
    setRivers(value: boolean) {
      visibleRivers = value;
      waterGroup.visible = value;
    },
    cancelPending() {
      revision++;
    },
    update(seconds: number, viewDistance: number) {
      water.time.value = seconds;
      aEnvironment.update(seconds);
      // Pulling back keeps the same terrain and camera. Move the fog envelope
      // with the viewer so a regional view never dissolves into opaque haze.
      if (region) {
        fog.near = Math.max(10, viewDistance * 0.8);
        fog.far = Math.max(36, viewDistance * 3 + 12);
      }
    },
    get region() {
      return region;
    },
    get modernWaterSource() {
      return modernWater.regions.some((item) => item.regionId === region)
        ? 'OSM + Natural Earth'
        : 'Natural Earth';
    },
    get bounds(): GeoBounds {
      return detailField?.worldBounds ?? globalField.worldBounds;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.environment = null;
      aEnvironment.dispose();
      environment.dispose();
      disposeLandscapeRoot(root, [landMaterial, water.material, bankMaterial]);
      revision++;
    },
  };
}
