import * as THREE from 'three';

/** Water can have no active meshes after changing region; shared materials still
 * belong to this landscape and must be released with its attached resources. */
export function disposeLandscapeRoot(
  root: THREE.Group,
  shared: readonly THREE.Material[],
) {
  const geometry = new Set<THREE.BufferGeometry>(),
    materials = new Set(shared);
  root.traverse((object) => {
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.Points
    ) {
      geometry.add(object.geometry);
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material])
        materials.add(material);
    }
  });
  root.removeFromParent();
  geometry.forEach((value) => value.dispose());
  materials.forEach((value) => value.dispose());
  root.clear();
}
