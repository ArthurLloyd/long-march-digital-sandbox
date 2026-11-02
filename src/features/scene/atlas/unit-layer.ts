import * as THREE from 'three';
import { createMarchingFigure } from '../prototype/marching-company';
import { projectGeo, inCoverage } from './geography';
import type { SpatialUnit } from './spatial-view';

/** Representative symbols only: no path sampling or historical-time interpolation. */
export function createUnitLayer(heightAt: (x: number, z: number) => number) {
  const group = new THREE.Group();
  group.name = 'phase-unit-layer';
  const entries: {
    root: THREE.Group;
    symbol: THREE.Group;
    model: THREE.Group;
    detail: boolean;
  }[] = [];
  const disposeContents = () => {
    const geometry = new Set<THREE.BufferGeometry>(),
      material = new Set<THREE.Material>();
    group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        geometry.add(object.geometry);
        (Array.isArray(object.material)
          ? object.material
          : [object.material]
        ).forEach((m) => material.add(m));
      }
    });
    geometry.forEach((g) => g.dispose());
    material.forEach((m) => m.dispose());
    group.clear();
    entries.length = 0;
  };
  return {
    group,
    set(units: readonly SpatialUnit[]) {
      disposeContents();
      for (const unit of units) {
        const color =
          unit.camp === 'red_army'
            ? '#d75a4d'
            : unit.camp === 'nationalist_army'
              ? '#6eafce'
              : '#d9c49a';
        if (unit.region) {
          // Preserve known area boundaries, including gaps outside coverage.
          if (!unit.region.every(inCoverage)) continue;
          const points = [...unit.region, unit.region[0]!].map((point) => {
            const [x, z] = projectGeo(point);
            return new THREE.Vector3(x, heightAt(x, z) + 0.012, z);
          });
          const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(points),
            new THREE.LineDashedMaterial({
              color,
              dashSize: 0.02,
              gapSize: 0.012,
            }),
          );
          line.computeLineDistances();
          group.add(line);
          continue;
        }
        if (!unit.point || !inCoverage(unit.point)) continue;
        const [x, z] = projectGeo(unit.point),
          root = new THREE.Group();
        root.name = unit.id;
        root.position.set(x, heightAt(x, z) + 0.012, z);
        const symbol = new THREE.Group();
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.018, 12, 8),
          new THREE.MeshBasicMaterial({ color }),
        );
        symbol.add(dot);
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.026, 0.029, 32),
          new THREE.MeshBasicMaterial({
            color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.007;
        symbol.add(ring);
        const model = new THREE.Group();
        const figure = createMarchingFigure();
        model.add(figure.group);
        model.scale.setScalar(0.012);
        model.visible = false;
        root.add(symbol, model);
        group.add(root);
        entries.push({ root, symbol, model, detail: false });
      }
    },
    update(camera: THREE.Camera) {
      for (const object of group.children) {
        if (!(object instanceof THREE.Line)) continue;
        const p = object.geometry.getAttribute('position');
        for (let i = 0; i < p.count; i++)
          p.setY(i, heightAt(p.getX(i), p.getZ(i)) + 0.012);
        p.needsUpdate = true;
        object.geometry.computeBoundingSphere();
        object.computeLineDistances();
      }
      for (const entry of entries) {
        const d = camera.position.distanceTo(entry.root.position);
        entry.detail = entry.detail ? d < 1.0 : d < 0.72;
        entry.symbol.visible = !entry.detail;
        entry.model.visible = entry.detail;
        entry.root.position.y =
          heightAt(entry.root.position.x, entry.root.position.z) + 0.012;
      }
    },
    dispose: disposeContents,
  };
}
