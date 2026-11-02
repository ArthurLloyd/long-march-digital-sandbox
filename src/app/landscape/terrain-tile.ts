import * as THREE from 'three';
import type { GeoBounds } from './geography';

export type Surface = (x: number, z: number) => number;
export interface TerrainTile {
  bounds: GeoBounds;
  cols: number;
  rows: number;
  dx: number;
  dz: number;
  geometry: THREE.PlaneGeometry;
  contains(x: number, z: number): boolean;
  height: Surface;
  update(): void;
  morph(progress: number): void;
  cut(child?: GeoBounds | readonly GeoBounds[]): void;
}

/** A bounded display grid. Subdivision interpolates existing DEM, not new survey data. */
export function createTerrainTile(
  bounds: GeoBounds,
  cols: number,
  rows: number,
  surface: Surface,
  metres: Surface,
  bank: Surface,
  parent?: TerrainTile,
): TerrainTile {
  const [left, top, right, bottom] = bounds;
  const dx = (right - left) / (cols - 1),
    dz = (bottom - top) / (rows - 1);
  const geometry = new THREE.PlaneGeometry(
    right - left,
    bottom - top,
    cols - 1,
    rows - 1,
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.translate((left + right) / 2, 0, (top + bottom) / 2);
  const positions = geometry.getAttribute('position');
  const elevation = new Float32Array(positions.count),
    shore = new Float32Array(positions.count);
  const originalHeights = new Float32Array(positions.count),
    refinedHeights = new Float32Array(positions.count);
  const originalIndex = new Uint32Array(geometry.index!.array);
  const contains = (x: number, z: number) =>
    x >= left && x <= right && z >= top && z <= bottom;
  const height = (x: number, z: number): number => {
    const c = Math.max(0, Math.min(cols - 1, (x - left) / dx)),
      r = Math.max(0, Math.min(rows - 1, (z - top) / dz));
    const i = Math.min(cols - 2, Math.floor(c)),
      j = Math.min(rows - 2, Math.floor(r));
    const u = c - i,
      v = r - j,
      a = j * cols + i;
    // Match PlaneGeometry's actual diagonal, including in collision/arrow queries.
    return u + v <= 1
      ? positions.getY(a) * (1 - u - v) +
          positions.getY(a + 1) * u +
          positions.getY(a + cols) * v
      : positions.getY(a + cols + 1) * (u + v - 1) +
          positions.getY(a + 1) * (1 - v) +
          positions.getY(a + cols) * (1 - u);
  };
  const update = () => {
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col,
          x = left + col * dx,
          z = top + row * dz;
        // Adjacent coarse/fine surfaces share exactly the same edge heights.
        const edge = Math.min(col, row, cols - 1 - col, rows - 1 - row);
        const t = Math.min(1, edge / 3),
          blend = t * t * (3 - 2 * t);
        positions.setY(
          i,
          parent
            ? parent.height(x, z) * (1 - blend) + surface(x, z) * blend
            : surface(x, z),
        );
        refinedHeights[i] = positions.getY(i);
        originalHeights[i] = parent?.height(x, z) ?? positions.getY(i);
        elevation[i] = metres(x, z);
        shore[i] = bank(x, z);
      }
    positions.needsUpdate = true;
    geometry.getAttribute('panElevation').needsUpdate = true;
    geometry.getAttribute('panBank').needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  };
  geometry.setAttribute(
    'panElevation',
    new THREE.BufferAttribute(elevation, 1),
  );
  geometry.setAttribute('panBank', new THREE.BufferAttribute(shore, 1));
  const cut = (child?: GeoBounds | readonly GeoBounds[]) => {
    const holes: readonly GeoBounds[] = !child
      ? []
      : typeof child[0] === 'number'
        ? [child as GeoBounds]
        : (child as readonly GeoBounds[]);
    const index = geometry.index!;
    index.array.set(originalIndex);
    for (let i = 0; i < originalIndex.length; i += 3) {
      const a = originalIndex[i]!,
        b = originalIndex[i + 1]!,
        c = originalIndex[i + 2]!;
      const x = (positions.getX(a) + positions.getX(b) + positions.getX(c)) / 3;
      const z = (positions.getZ(a) + positions.getZ(b) + positions.getZ(c)) / 3;
      if (holes.some((b) => x > b[0] && x < b[2] && z > b[1] && z < b[3])) {
        index.setX(i + 1, a);
        index.setX(i + 2, a);
      }
    }
    // Reuse the uploaded index buffer; no abandoned GL buffer per LOD switch.
    index.needsUpdate = true;
    // Keep pre-cut normals at the joint rather than a dark artificial cliff.
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  };
  update();
  const morph = (progress: number) => {
    const t = Math.max(0, Math.min(1, progress));
    for (let i = 0; i < positions.count; i++)
      positions.setY(i, originalHeights[i]! * (1 - t) + refinedHeights[i]! * t);
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  };
  return {
    bounds,
    cols,
    rows,
    dx,
    dz,
    geometry,
    contains,
    height,
    update,
    cut,
    morph,
  };
}

/** Whole parent cells only: exact coverage with no overlapping surface or crack. */
export function snapTerrainWindow(
  parent: Pick<TerrainTile, 'bounds' | 'dx' | 'dz'>,
  x: number,
  z: number,
  spanX: number,
  spanZ = spanX,
): GeoBounds {
  const [l, t, r, b] = parent.bounds;
  return [
    Math.max(l, l + Math.floor((x - spanX / 2 - l) / parent.dx) * parent.dx),
    Math.max(t, t + Math.floor((z - spanZ / 2 - t) / parent.dz) * parent.dz),
    Math.min(r, l + Math.ceil((x + spanX / 2 - l) / parent.dx) * parent.dx),
    Math.min(b, t + Math.ceil((z + spanZ / 2 - t) / parent.dz) * parent.dz),
  ];
}
