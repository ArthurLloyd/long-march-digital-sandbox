import * as THREE from 'three';
import { inCoverage, projectGeo, type GeoPoint } from './geography';

export interface JourneyMarker {
  coordinates: GeoPoint;
  kind: 'origin' | 'force';
  prominent: boolean;
}

/** Exhibition sculpture, not an archaeological reconstruction or troop count. */
export function createJourneyTorch() {
  const root = new THREE.Group();
  root.name = 'journey-torch';
  root.visible = false;
  const sculpture = new THREE.Group();
  root.add(sculpture);
  const time = { value: 0 };
  const bronze = new THREE.MeshStandardMaterial({
    color: '#be8650',
    metalness: 0.76,
    roughness: 0.32,
  });
  const darkBronze = new THREE.MeshStandardMaterial({
    color: '#48302a',
    metalness: 0.66,
    roughness: 0.5,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: '#493025',
    roughness: 0.92,
  });
  const red = new THREE.MeshStandardMaterial({
    color: '#8e3027',
    roughness: 0.84,
  });
  const mesh = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    y: number,
  ) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.y = y;
    sculpture.add(object);
    return object;
  };
  mesh(new THREE.CylinderGeometry(0.065, 0.04, 0.74, 24), wood, 0.37);
  mesh(new THREE.CylinderGeometry(0.071, 0.055, 0.43, 24), red, 0.32);
  for (let i = 0; i < 7; i++) {
    const band = mesh(
      new THREE.TorusGeometry(0.064, 0.009, 6, 32),
      darkBronze,
      0.13 + i * 0.058,
    );
    band.rotation.x = Math.PI / 2 + 0.1;
  }
  mesh(new THREE.CylinderGeometry(0.12, 0.052, 0.15, 32), bronze, 0.72);
  const bowl = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.08, 0),
      new THREE.Vector2(0.13, 0.04),
      new THREE.Vector2(0.22, 0.18),
      new THREE.Vector2(0.23, 0.21),
    ],
    40,
  );
  mesh(bowl, bronze, 0.77);
  const rim = mesh(new THREE.TorusGeometry(0.23, 0.016, 8, 48), bronze, 0.98);
  rim.rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) {
    const prong = mesh(
      new THREE.BoxGeometry(0.023, 0.15, 0.024),
      darkBronze,
      1.01,
    );
    const angle = (i / 8) * Math.PI * 2;
    prong.position.x = Math.cos(angle) * 0.205;
    prong.position.z = Math.sin(angle) * 0.205;
    prong.rotation.z = -Math.cos(angle) * 0.14;
    prong.rotation.x = Math.sin(angle) * 0.14;
  }
  const flameShape = [
    [0, 0],
    [0.1, 0.035],
    [0.18, 0.15],
    [0.145, 0.33],
    [0.11, 0.49],
    [0.075, 0.65],
    [0.023, 0.79],
    [0, 0.89],
  ];
  const flameGeometry = new THREE.LatheGeometry(
    flameShape.map(([x, y]) => new THREE.Vector2(x!, y!)),
    32,
  );
  const position = flameGeometry.getAttribute('position');
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    position.setX(i, position.getX(i) + Math.sin(y * 5) * y * 0.13);
    position.setZ(i, position.getZ(i) * 0.82);
  }
  flameGeometry.computeVertexNormals();
  const flame = (color: string, opacity: number, scale: number) => {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.torchTime = time;
      shader.vertexShader =
        'uniform float torchTime; varying vec3 torchLocal;\n' +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ntorchLocal=position; transformed.x += sin(torchTime*3.1+position.y*9.)*position.y*.045; transformed.z += cos(torchTime*2.3+position.y*7.)*position.y*.025;',
      );
      shader.fragmentShader =
        'varying vec3 torchLocal;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nfloat core=exp(-dot(torchLocal.xz,torchLocal.xz)*70.)*(1.-smoothstep(.05,.8,torchLocal.y)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.92,.55),core*.85);',
      );
    };
    material.customProgramCacheKey = () => 'journey-fire-v1';
    const object = mesh(flameGeometry, material, 0.94);
    object.scale.setScalar(scale);
  };
  flame('#e95c1e', 0.56, 1.12);
  flame('#ffb62f', 0.88, 0.82);
  flame('#fff0ad', 1, 0.48);
  const light = new THREE.PointLight('#ffa03d', 0.045, 0.8, 2);
  light.position.y = 1.14;
  sculpture.add(light);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.009, 8, 64),
    bronze,
  );
  ring.rotation.x = Math.PI / 2;
  root.add(ring);
  let marker: JourneyMarker | null = null;
  let disposed = false;
  return {
    root,
    setMarker(value: JourneyMarker | null) {
      marker =
        value &&
        inCoverage(value.coordinates) &&
        value.coordinates.every(Number.isFinite)
          ? value
          : null;
      root.visible = Boolean(marker) && !disposed;
    },
    update(
      seconds: number,
      viewDistance: number,
      heightAt: (x: number, z: number) => number,
      reducedMotion: boolean,
    ) {
      if (!marker || disposed) return;
      const [x, z] = projectGeo(marker.coordinates);
      root.position.set(x, heightAt(x, z) + 0.015, z);
      // Sculpture is conspicuous on arrival and compact in the route view.
      const scale = THREE.MathUtils.clamp(
        viewDistance * (marker.prominent ? 0.075 : 0.032),
        0.045,
        marker.prominent ? 0.32 : 0.19,
      );
      root.scale.setScalar(scale);
      sculpture.position.y =
        0.1 + (reducedMotion ? 0 : Math.sin(seconds * 1.5) * 0.045);
      time.value = reducedMotion ? 0 : seconds;
      light.intensity = reducedMotion
        ? 0.045
        : 0.045 + Math.sin(seconds * 5) * 0.004;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      root.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((m) => materials.add(m));
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      light.dispose();
      root.clear();
      root.removeFromParent();
      root.visible = false;
    },
  };
}
