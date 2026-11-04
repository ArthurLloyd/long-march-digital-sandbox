import * as THREE from 'three';
import { projectGeo, type GeoPoint } from './geography';

/** Original exhibition marker: a red banner at the event anchor.
 * It is not a reconstruction of a building or a historical monument. */
export function createChapterLandmark(
  scene: THREE.Scene,
  heightAt: (x: number, z: number) => number,
) {
  const root = new THREE.Group();
  root.name = 'chapter-landmark';
  root.visible = false;
  scene.add(root);
  const gold = new THREE.MeshStandardMaterial({
    color: 0xc6a269,
    metalness: 0.45,
    roughness: 0.4,
  });
  const red = new THREE.MeshStandardMaterial({
    color: 0xa52b2b,
    side: THREE.DoubleSide,
    roughness: 0.8,
  });
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.003, 0.004, 0.2, 8),
    gold,
  );
  pole.position.set(0, 0.1, 0);
  root.add(pole);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.055), red);
  banner.position.set(0.045, 0.17, 0);
  root.add(banner);
  let anchor: readonly [number, number] | null = null;
  return {
    set(point: GeoPoint | null) {
      anchor = point ? projectGeo(point) : null;
      root.visible = !!anchor;
    },
    update(distance: number) {
      if (!anchor) return;
      root.position.set(anchor[0], heightAt(...anchor) + 0.018, anchor[1]);
      root.scale.setScalar(THREE.MathUtils.clamp(distance * 0.3, 0.55, 1.6));
    },
    dispose() {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      gold.dispose();

      red.dispose();
      root.removeFromParent();
    },
    root,
  };
}
