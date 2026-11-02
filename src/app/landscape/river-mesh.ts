import * as THREE from 'three';

export interface RiverPoint {
  x: number;
  z: number;
  level?: number;
  width?: number;
}
/** A visual channel profile; width/depth are artistic, never historical bathymetry. */
export function riverRibbon(
  points: readonly RiverPoint[],
  height: (x: number, z: number) => number,
  halfWidth: number,
  bed = false,
  depth = 0.0025,
) {
  const vertices: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  // The bed stays inside the shared channel; no draped outer strip can pierce
  // the terrain as pale triangular teeth at a bend.
  const profile = [-1, -0.6, 0, 0.6, 1];
  let distance = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i]!,
      previous = points[Math.max(0, i - 1)]!,
      next = points[Math.min(points.length - 1, i + 1)]!;
    const dx = next.x - previous.x,
      dz = next.z - previous.z,
      length = Math.hypot(dx, dz) || 1;
    if (i) distance += Math.hypot(point.x - previous.x, point.z - previous.z);
    const level = point.level ?? height(point.x, point.z) + 0.0007;
    const width = point.width ?? halfWidth;
    for (const u of profile) {
      const x = point.x - (dz / length) * width * u,
        z = point.z + (dx / length) * width * u;
      const y = bed ? level - (1 - Math.abs(u) * 0.75) * depth : level;
      vertices.push(x, y, z);
      uv.push((u + 1) / 2, distance);
    }
    if (i > 0)
      for (let c = 0; c < profile.length - 1; c++) {
        const a = (i - 1) * profile.length + c,
          b = i * profile.length + c;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Resampling is confined to modern water display; original centerlines stay intact.
 * Width, bank shape, level smoothing and depth are art direction, not hydrology.
 */
export function createRiverChannel(
  source: readonly (readonly RiverPoint[])[],
  height: (x: number, z: number) => number,
  halfWidth: number,
  depth: number,
) {
  const paths = source.map((line) => {
    const samples: RiverPoint[] = [];
    for (let i = 0; i < line.length; i++) {
      const a = line[Math.max(0, i - 1)]!,
        b = line[i]!;
      const count = i
        ? Math.max(
            1,
            Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (halfWidth * 0.6)),
          )
        : 1;
      for (let j = 1; j <= count; j++)
        samples.push({
          x: a.x + ((b.x - a.x) * j) / count,
          z: a.z + ((b.z - a.z) * j) / count,
          width:
            (a.width ?? halfWidth) +
            (((b.width ?? halfWidth) - (a.width ?? halfWidth)) * j) / count,
        });
    }
    const heights = samples.map((p) => height(p.x, p.z));
    let along = 0;
    return samples.map((p, i) => {
      if (i)
        along += Math.hypot(p.x - samples[i - 1]!.x, p.z - samples[i - 1]!.z);
      let sum = 0,
        weights = 0;
      for (
        let j = Math.max(0, i - 8);
        j <= Math.min(samples.length - 1, i + 8);
        j++
      ) {
        const other = samples[j]!,
          d = Math.hypot(other.x - p.x, other.z - p.z);
        const weight = Math.exp((-d * d) / 0.0005);
        sum += heights[j]! * weight;
        weights += weight;
      }
      return {
        ...p,
        level:
          (i === 0 || i === samples.length - 1 ? heights[i]! : sum / weights) +
          0.0007,
        width:
          p.width! *
          (1 + 0.12 * Math.sin(along * 31) + 0.07 * Math.sin(along * 73)),
      };
    });
  });
  type Segment = {
    a: RiverPoint & { level: number; width: number };
    b: RiverPoint & { level: number; width: number };
  };
  const cell = 0.05,
    bins = new Map<string, Segment[]>();
  for (const line of paths)
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1]!,
        b = line[i]!,
        reach = Math.max(a.width, b.width) * 3;
      for (
        let x = Math.floor((Math.min(a.x, b.x) - reach) / cell);
        x <= Math.floor((Math.max(a.x, b.x) + reach) / cell);
        x++
      )
        for (
          let z = Math.floor((Math.min(a.z, b.z) - reach) / cell);
          z <= Math.floor((Math.max(a.z, b.z) + reach) / cell);
          z++
        ) {
          const key = `${x}:${z}`,
            entries = bins.get(key) ?? [];
          entries.push({ a, b });
          bins.set(key, entries);
        }
    }
  const at = (x: number, z: number) => {
    let result: null | { distance: number; level: number; width: number } =
      null;
    for (const { a, b } of bins.get(
      `${Math.floor(x / cell)}:${Math.floor(z / cell)}`,
    ) ?? []) {
      const dx = b.x - a.x,
        dz = b.z - a.z,
        t = Math.max(
          0,
          Math.min(
            1,
            ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1),
          ),
        );
      const distance = Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
      if (!result || distance < result.distance)
        result = {
          distance,
          level: a.level + (b.level - a.level) * t,
          width: a.width + (b.width - a.width) * t,
        };
    }
    return result;
  };
  return {
    paths,
    at,
    surface(x: number, z: number) {
      const base = height(x, z),
        near = at(x, z);
      if (!near) return base;
      const u = near.distance / near.width;
      if (u >= 2.5) return base;
      const t = Math.min(1, Math.max(0, (u - 0.85) / 1.65)),
        blend = t * t * (3 - 2 * t);
      const bed =
        near.level - depth * Math.max(0.1, 1 - Math.min(1, u * u) * 0.75);
      return bed * (1 - blend) + base * blend;
    },
  };
}
/** Bounded grid makes visual channel carving linear in nearby river segments. */
export function channelCarver(
  lines: readonly (readonly RiverPoint[])[],
  halfWidth: number,
  depth = 0.0028,
) {
  const cell = 0.05;
  const bins = new Map<string, { a: RiverPoint; b: RiverPoint }[]>();
  for (const line of lines)
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1]!,
        b = line[i]!;
      for (
        let x = Math.floor((Math.min(a.x, b.x) - halfWidth * 2) / cell);
        x <= Math.floor((Math.max(a.x, b.x) + halfWidth * 2) / cell);
        x++
      )
        for (
          let z = Math.floor((Math.min(a.z, b.z) - halfWidth * 2) / cell);
          z <= Math.floor((Math.max(a.z, b.z) + halfWidth * 2) / cell);
          z++
        ) {
          const key = `${x}:${z}`,
            entry = bins.get(key) ?? [];
          entry.push({ a, b });
          bins.set(key, entry);
        }
    }
  return (x: number, z: number) => {
    let nearest = Infinity;
    for (const { a, b } of bins.get(
      `${Math.floor(x / cell)}:${Math.floor(z / cell)}`,
    ) ?? []) {
      const dx = b.x - a.x,
        dz = b.z - a.z,
        t = Math.max(
          0,
          Math.min(
            1,
            ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1),
          ),
        );
      nearest = Math.min(
        nearest,
        Math.hypot(x - a.x - dx * t, z - a.z - dz * t),
      );
    }
    return depth * Math.pow(Math.max(0, 1 - nearest / (halfWidth * 1.8)), 1.5);
  };
}
