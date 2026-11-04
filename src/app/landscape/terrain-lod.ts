import * as THREE from 'three';
import {
  createTerrainTile,
  snapTerrainWindow,
  type Surface,
  type TerrainTile,
} from './terrain-tile';
import type { GeoBounds } from './geography';

/** A cell-aligned base, resident regional relief and one optional close inspection tile. */
export function createTerrainLod(
  root: THREE.Group,
  material: THREE.MeshStandardMaterial,
  bounds: GeoBounds,
  cols: number,
  rows: number,
  surface: Surface,
  metres: Surface,
  bank: Surface,
  windows: readonly GeoBounds[] = [],
) {
  const attach = (tile: TerrainTile) => {
    const mesh = new THREE.Mesh(tile.geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return { tile, mesh };
  };
  const base = attach(
    createTerrainTile(bounds, cols, rows, surface, metres, bank),
  );
  type Layer = ReturnType<typeof attach>;
  const regions: Layer[] = [];
  let close: Layer | null = null,
    closeParent: Layer | null = null;
  let blending: { start: number; step: number } | null = null;
  const release = (layer: Layer | null) => {
    if (layer) {
      layer.mesh.removeFromParent();
      layer.tile.geometry.dispose();
    }
  };
  const overlaps = (a: GeoBounds, b: GeoBounds) =>
    a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  const cutBase = () =>
    base.tile.cut([
      ...regions.map((r) => r.tile.bounds),
      ...(close && closeParent === base ? [close.tile.bounds] : []),
    ]);
  const clearClose = () => {
    if (!close) return;
    blending = null;
    release(close);
    close = null;
    if (closeParent === base) cutBase();
    else closeParent?.tile.cut();
    closeParent = null;
  };
  const snapped = (b: GeoBounds) =>
    snapTerrainWindow(
      base.tile,
      (b[0] + b[2]) / 2,
      (b[1] + b[3]) / 2,
      b[2] - b[0],
      b[3] - b[1],
    );
  const addRegion = (b: GeoBounds, subdivisions: number) => {
    const c = Math.round((b[2] - b[0]) / base.tile.dx) * subdivisions + 1;
    const r = Math.round((b[3] - b[1]) / base.tile.dz) * subdivisions + 1;
    regions.push(
      attach(createTerrainTile(b, c, r, surface, metres, bank, base.tile)),
    );
  };
  // Merge overlapping source envelopes before cutting the parent. Every
  // rendered cell has exactly one owner, including Zunyi/Chishui and snow passes.
  const joined: GeoBounds[] = [];
  for (const window of windows) {
    let box = snapped(window);
    for (let i = 0; i < joined.length;) {
      const other = joined[i]!;
      if (!overlaps(box, other)) {
        i++;
        continue;
      }
      joined.splice(i, 1);
      box = [
        Math.min(box[0], other[0]),
        Math.min(box[1], other[1]),
        Math.max(box[2], other[2]),
        Math.max(box[3], other[3]),
      ];
      i = 0;
    }
    joined.push(box);
  }
  for (const box of joined) addRegion(box, 6);
  if (joined.length) cutBase();
  const setRegion = (window: GeoBounds | null) => {
    if (windows.length) return;
    clearClose();
    for (const layer of regions.splice(0)) release(layer);
    base.tile.update();
    if (window) addRegion(snapped(window), 8);
    cutBase();
  };
  const refine = (
    x: number,
    z: number,
    distance: number,
    now = performance.now(),
  ) => {
    if (distance > 1.8) {
      if (close) {
        clearClose();
        return true;
      }
      return false;
    }
    const parent = regions.find((r) => r.tile.contains(x, z)) ?? base;
    const span = THREE.MathUtils.clamp(distance * 2.8, 0.06, 2.4);
    const b = snapTerrainWindow(parent.tile, x, z, span);
    if (parent === base && regions.some((r) => overlaps(b, r.tile.bounds))) {
      if (!close) return false;
      clearClose();
      return true;
    }
    if (b[2] - b[0] < parent.tile.dx || b[3] - b[1] < parent.tile.dz)
      return false;
    if (close) {
      const old = close.tile.bounds,
        w = old[2] - old[0],
        h = old[3] - old[1];
      if (
        closeParent === parent &&
        x > old[0] + w * 0.22 &&
        x < old[2] - w * 0.22 &&
        z > old[1] + h * 0.22 &&
        z < old[3] - h * 0.22 &&
        (b[2] - b[0]) / w > 0.6 &&
        (b[2] - b[0]) / w < 1.6
      )
        return false;
      clearClose();
    }
    // For off-topic terrain this is display resampling of the coarse DEM.
    const c = Math.min(
      257,
      Math.max(65, Math.round((b[2] - b[0]) / parent.tile.dx) * 12 + 1),
    );
    const r = Math.min(
      257,
      Math.max(65, Math.round((b[3] - b[1]) / parent.tile.dz) * 12 + 1),
    );
    close = attach(
      createTerrainTile(b, c, r, surface, metres, bank, parent.tile),
    );
    close.tile.morph(0);
    blending = { start: now, step: 0 };
    closeParent = parent;
    if (parent === base) cutBase();
    else parent.tile.cut(b);
    return true;
  };
  return {
    setRegion,
    refine,
    advance(now: number) {
      if (!blending || !close) return false;
      const step = Math.min(6, Math.floor((now - blending.start) / 50));
      if (step === blending.step) return false;
      blending.step = step;
      close.tile.morph(step / 6);
      if (step === 6) blending = null;
      return true;
    },
    heightAt: (x: number, z: number) =>
      close?.tile.contains(x, z)
        ? close.tile.height(x, z)
        : (regions.find((r) => r.tile.contains(x, z)) ?? base).tile.height(
            x,
            z,
          ),
    update() {
      blending = null;
      base.tile.cut();
      base.tile.update();
      for (const layer of regions) {
        layer.tile.cut();
        layer.tile.update();
      }
      close?.tile.update();
      cutBase();
      if (close && closeParent !== base)
        closeParent?.tile.cut(close.tile.bounds);
    },
    get meshes() {
      return [
        base.mesh,
        ...regions.map((r) => r.mesh),
        ...(close ? [close.mesh] : []),
      ];
    },
    get details() {
      return {
        terrainMeshes: 1 + regions.length + Number(!!close),
        morphing: !!blending,
        closeBounds: close?.tile.bounds ?? null,
        regionalBounds: regions[0]?.tile.bounds ?? null,
      };
    },
    dispose() {
      release(close);
      for (const layer of regions.splice(0)) release(layer);
      release(base);
      close = null;
      closeParent = null;
    },
  };
}
