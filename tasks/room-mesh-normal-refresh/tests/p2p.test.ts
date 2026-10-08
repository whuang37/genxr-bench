import * as THREE from "three";

import { expect, it, vi } from "@xrblocks/devtools/test";

import { DetectedMesh } from "@xrblocks/source/world/mesh/DetectedMesh.ts";
import { MeshDetector } from "@xrblocks/source/world/mesh/MeshDetector.ts";
import { MeshDetectionOptions } from "@xrblocks/source/world/mesh/MeshDetectionOptions.ts";

const triangle = {
  vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 1]),
  indices: new Uint32Array([0, 1, 2]),
  lastChangedTime: 1,
  semanticLabel: "wall",
};

it("updates room topology once and releases replaced geometry", () => {
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  const mesh = new DetectedMesh(triangle as never, material);
  const disposed = vi.fn();
  mesh.geometry.addEventListener("dispose", disposed);
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(0.75, 1, 0.6),
    new THREE.Vector3(0, -1, 0),
  );

  try {
    expect(raycaster.intersectObject(mesh)).toHaveLength(0);
    const revised = {
      ...triangle,
      lastChangedTime: 2,
      vertices: new Float32Array([0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1]),
      indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    };
    mesh.updateVertices(revised as never);

    expect(raycaster.intersectObject(mesh)).toHaveLength(1);
    expect(disposed).toHaveBeenCalledOnce();
    const currentPositions = Array.from(
      mesh.geometry.getAttribute("position").array,
    );
    mesh.updateVertices({
      ...revised,
      vertices: new Float32Array(currentPositions.map(() => 9)),
    } as never);
    expect(Array.from(mesh.geometry.getAttribute("position").array)).toEqual(
      currentPositions,
    );
  } finally {
    mesh.dispose();
    material.dispose();
  }
});
it("keeps simulator debug material, collision, and cleanup behavior coherent", () => {
  const detector = new MeshDetector();
  detector.init({
    options: new MeshDetectionOptions({ showDebugVisualizations: true }),
    renderer: {} as never,
  });
  const colliders: Array<{ vertices: number[]; indices: number[] }> = [];
  const removed: object[] = [];
  const RAPIER = {
    RigidBodyDesc: {
      fixed: () => ({
        setTranslation: () => ({ setRotation: () => ({}) }),
      }),
    },
    ColliderDesc: {
      trimesh: (vertices: Float32Array, indices: Uint32Array) => ({
        vertices: Array.from(vertices),
        indices: Array.from(indices),
      }),
    },
  };
  const world = {
    createRigidBody: () => ({}),
    createCollider: (collider: { vertices: number[]; indices: number[] }) => {
      colliders.push(collider);
      return collider;
    },
    removeCollider: (collider: object) => removed.push(collider),
    removeRigidBody: () => {},
  };

  try {
    const [mesh] = detector.setSimulatorMeshes([triangle] as never);
    const material = mesh.material as THREE.MeshBasicMaterial;
    const disposed = vi.fn();
    mesh.geometry.addEventListener("dispose", disposed);
    mesh.initRapierPhysics(RAPIER as never, world as never);
    const revised = {
      ...triangle,
      lastChangedTime: 2,
      vertices: new Float32Array([0, 0, 0, 2, 0, 0, 0, 0, 1]),
    };
    mesh.updateVertices(revised as never);

    expect(material.wireframe).toBe(true);
    expect(material.color.getHex()).toBe(0x0000ff);
    expect(removed).toHaveLength(1);
    expect(colliders[1]).toEqual({
      vertices: Array.from(revised.vertices),
      indices: Array.from(revised.indices),
    });
    detector.clearSimulatorMeshes();
    expect(detector.children).toHaveLength(0);
    expect(disposed).toHaveBeenCalledOnce();
  } finally {
    detector.dispose();
  }
});
