import * as THREE from 'three';

/** A symbolic field around the selected formation, never a map of individual soldiers. */
export function createFilmSignals(parent: THREE.Object3D) {
  const root = new THREE.Group();
  root.visible = false;
  parent.add(root);
  const geometry = new THREE.BufferGeometry();
  const sites: number[] = [];
  for (let i = 0; i < 550; i++) {
    const theta = i * 2.39996,
      radius = 0.76 + 0.08 * Math.sin(i * 14.21) + 0.035 * Math.cos(i * 3.19);
    sites.push(
      Math.cos(theta) * radius,
      0.04 + 0.008 * Math.sin(i),
      Math.sin(theta) * radius,
    );
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(sites, 3));
  const pressure = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0x82bbff,
      size: 0.009,
      transparent: true,
      opacity: 0.83,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.086, 0.091, 64),
    new THREE.MeshBasicMaterial({
      color: 0xffb25b,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  root.add(pressure, ring);
  return {
    root,
    update(
      point: THREE.Vector3 | undefined,
      distance: number,
      progress: number,
      encircled: boolean,
      reduced: boolean,
    ) {
      root.visible = !!point;
      if (!point) return;
      root.position.copy(point);
      root.scale.setScalar(THREE.MathUtils.clamp(distance * 0.42, 0.5, 6));
      pressure.visible = encircled;
      ring.visible = !encircled;
      const phase = reduced ? 0.45 : THREE.MathUtils.clamp(progress, 0, 1);
      pressure.scale.setScalar(
        reduced ? 1 : 1.48 - 0.44 * THREE.MathUtils.smoothstep(phase, 0, 1),
      );
      ring.scale.setScalar(1 + phase);
      ring.material.opacity = 0.82 - phase * 0.6;
    },
    dispose() {
      geometry.dispose();
      pressure.material.dispose();
      ring.geometry.dispose();
      ring.material.dispose();
      root.removeFromParent();
    },
  };
}
