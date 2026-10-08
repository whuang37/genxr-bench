import * as THREE from "three";

import { expect, it } from "@xrblocks/devtools/test";

import { DetectedMesh } from "@xrblocks/source/world/mesh/DetectedMesh.ts";

const flatSource = {
  vertices: new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]),
  indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  lastChangedTime: 1,
  semanticLabel: "wall",
};

function slopedSource(lastChangedTime: number) {
  return {
    ...flatSource,
    lastChangedTime,
    vertices: new Float32Array([
      -1, -1, -0.5, 1, -1, -0.5, 1, 1, 0.5, -1, 1, 0.5,
    ]),
  };
}

function surfaceNormal(mesh: THREE.Mesh): THREE.Vector3 {
  const normal = mesh.geometry.getAttribute("normal");
  return new THREE.Vector3().fromBufferAttribute(normal, 2).normalize();
}

it("refreshes a revised room surface for shading and surface queries", () => {
  const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
  const mesh = new DetectedMesh(flatSource as never, material);
  mesh.position.set(3, 2, 1);
  mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 3);
  const lightDirection = new THREE.Vector3(0, 0, 1);

  try {
    mesh.updateVertices(slopedSource(2) as never);
    mesh.updateMatrixWorld(true);

    const normal = surfaceNormal(mesh);
    const hit = new THREE.Raycaster(
      new THREE.Vector3(3, 2, 3),
      new THREE.Vector3(0, 0, -1),
    ).intersectObject(mesh)[0];

    expect(normal.z).toBeGreaterThan(0);
    expect(normal.y).toBeLessThan(-0.1);
    expect(normal.dot(lightDirection)).toBeLessThan(0.95);
    expect(hit?.normal?.z).toBeGreaterThan(0);
    expect(hit?.normal?.y).toBeLessThan(-0.1);
    expect(mesh.position.toArray()).toEqual([3, 2, 1]);
    expect(
      mesh.quaternion.angleTo(
        new THREE.Quaternion().setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          Math.PI / 3,
        ),
      ),
    ).toBeCloseTo(0, 6);
  } finally {
    mesh.dispose();
    material.dispose();
  }
});
