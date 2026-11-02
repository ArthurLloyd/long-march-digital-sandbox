import * as THREE from 'three';
import {
  createTerrainTile,
  snapTerrainWindow,
  type Surface,
  type TerrainTile,
} from './terrain-tile';
import type { GeoBounds } from './geography';

/** At most three terrain meshes; no additional RAF or unbounded GPU cache. */
export function createTerrainLod(
  root: THREE.Group,
  material: THREE.MeshStandardMaterial,
  bounds: GeoBounds,
  cols: number,
  rows: number,
  surface: Surface,
  metres: Surface,
  bank: Surface,
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
  let regional: ReturnType<typeof attach> | null = null,
    close: ReturnType<typeof attach> | null = null;
  let blending: { start: number; step: number } | null = null;
  const release = (layer: ReturnType<typeof attach> | null) => {
    if (layer) {
      layer.mesh.removeFromParent();
      layer.tile.geometry.dispose();
    }
  };
  const clearClose = () => {
    blending = null;
    release(close);
    close = null;
    regional?.tile.cut();
    base.tile.cut(regional?.tile.bounds);
  };
  const setRegion = (window: GeoBounds | null) => {
    clearClose();
    release(regional);
    regional = null;
    base.tile.cut();
    base.tile.update();
    if (window) {
      const b = snapTerrainWindow(
        base.tile,
        (window[0] + window[2]) / 2,
        (window[1] + window[3]) / 2,
        window[2] - window[0],
        window[3] - window[1],
      );
      const c = Math.round((b[2] - b[0]) / base.tile.dx) * 8 + 1;
      const r = Math.round((b[3] - b[1]) / base.tile.dz) * 8 + 1;
      regional = attach(
        createTerrainTile(b, c, r, surface, metres, bank, base.tile),
      );
      base.tile.cut(b);
    }
  };
  const refine = (
    x: number,
    z: number,
    distance: number,
    now = performance.now(),
  ) => {
    if (distance > 1.8) {
      if (close) clearClose();
      return false;
    }
    const parent = regional?.tile.contains(x, z) ? regional : base;
    const span = THREE.MathUtils.clamp(distance * 2.8, 0.06, 2.4);
    const b = snapTerrainWindow(parent.tile, x, z, span);
    if (b[2] - b[0] < parent.tile.dx || b[3] - b[1] < parent.tile.dz)
      return false;
    if (close) {
      const old = close.tile.bounds,
        w = old[2] - old[0],
        h = old[3] - old[1];
      if (
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
    if (parent === base)
      base.tile.cut(regional ? [regional.tile.bounds, b] : b);
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
        : regional?.tile.contains(x, z)
          ? regional.tile.height(x, z)
          : base.tile.height(x, z),
    update() {
      blending = null;
      base.tile.cut();
      regional?.tile.cut();
      base.tile.update();
      regional?.tile.update();
      close?.tile.update();
      base.tile.cut(regional?.tile.bounds);
      if (close) (regional ?? base).tile.cut(close.tile.bounds);
    },
    get meshes() {
      return [
        base.mesh,
        ...(regional ? [regional.mesh] : []),
        ...(close ? [close.mesh] : []),
      ];
    },
    get details() {
      return {
        terrainMeshes: 1 + Number(!!regional) + Number(!!close),
        morphing: !!blending,
        closeBounds: close?.tile.bounds ?? null,
        regionalBounds: regional?.tile.bounds ?? null,
      };
    },
    dispose() {
      release(close);
      release(regional);
      release(base);
      close = null;
      regional = null;
    },
  };
}
