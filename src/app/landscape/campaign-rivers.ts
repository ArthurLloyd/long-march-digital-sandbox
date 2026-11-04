import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import water from './data/details/modern-water.json';
import { geography, projectGeo } from './geography';

export type CampaignRiver = '赤水河' | '金沙江' | '乌江';
export function campaignRiver(
  id: string | undefined,
  heading: string | undefined,
): CampaignRiver | null {
  if (
    id?.startsWith('chapter-event-sd') ||
    id === 'chapter-event-zy-resolution'
  )
    return '赤水河';
  if (id === 'chapter-event-js')
    return heading === '乌江以南' || heading === '贵阳方向' ? '乌江' : '金沙江';
  return null;
}

/** A cartographic highlight directly over the existing modern river centrelines. */
export function campaignRivers(height: (x: number, z: number) => number) {
  const root = new THREE.Group();
  const strokes = [
    new LineMaterial({ color: 0x5bb7ff, linewidth: 7.5, opacity: 0.19 }),
    new LineMaterial({ color: 0xc9f1ff, linewidth: 2.3, opacity: 0.95 }),
  ];
  for (const mat of strokes) {
    mat.transparent = true;
    mat.depthTest = false;
    mat.depthWrite = false;
    mat.toneMapped = false;
  }
  const groups = new Map<CampaignRiver, THREE.Group>();
  const geometries: LineSegmentsGeometry[] = [];
  function draw(
    name: CampaignRiver,
    lines: readonly number[][][],
    clip?: (x: number, y: number) => boolean,
  ) {
    const positions: number[] = [];
    for (const line of lines) {
      let previous: number[] | null = null;
      for (const [lon, lat] of line) {
        if (clip && !clip(lon!, lat!)) {
          previous = null;
          continue;
        }
        const [x, z] = projectGeo([lon!, lat!]);
        const point = [x, height(x, z) + 0.002, z];
        if (previous) positions.push(...previous, ...point);
        previous = point;
      }
    }
    if (!positions.length) return;
    const group = new THREE.Group();
    const geometry = new LineSegmentsGeometry().setPositions(positions);
    geometries.push(geometry);
    strokes.forEach((material, i) => {
      const stroke = new LineSegments2(geometry, material);
      stroke.renderOrder = 3 + i;
      group.add(stroke);
    });
    group.visible = false;
    groups.set(name, group);
    root.add(group);
  }
  const build = () => {
    root.clear();
    groups.clear();
    for (const g of geometries.splice(0)) g.dispose();
    draw(
      '赤水河',
      water.regions
        .find((r) => r.regionId === 'chishui')!
        .lines.map((l) => l.coordinates),
    );
    draw(
      '金沙江',
      geography.rivers
        .filter((r) => r.name === 'Yangtze')
        .flatMap((r) => r.coordinates),
      (lon, lat) => lon > 100.9 && lon < 104.7 && lat > 25.4 && lat < 29,
    );
    draw(
      '乌江',
      geography.rivers
        .filter((r) => r.name === 'Wu')
        .flatMap((r) => r.coordinates),
      (lon, lat) => lon > 105.4 && lon < 108 && lat < 28.5,
    );
  };
  let active: CampaignRiver | null = null;
  const select = (name: CampaignRiver | null) => {
    if (name && !groups.size) build();
    active = name;
    for (const [key, g] of groups) g.visible = key === name;
  };
  return {
    root,
    select,
    redrape() {
      if (groups.size) {
        build();
        select(active);
      }
    },
    dispose() {
      for (const g of geometries) g.dispose();
      for (const mat of strokes) mat.dispose();
      root.removeFromParent();
      root.clear();
    },
  };
}
