import * as THREE from "three";

import { expect, it, vi } from "@xrblocks/devtools/test";

Object.defineProperty(globalThis, "window", {
  value: { location: { search: "" } },
  configurable: true,
});

const { MeshDetector } = await import(
  "@xrblocks/source/world/mesh/MeshDetector.ts"
);
const { MeshDetectionOptions } = await import(
  "@xrblocks/source/world/mesh/MeshDetectionOptions.ts"
);
const { WorldOptions } = await import("@xrblocks/source/world/WorldOptions.ts");
const { World } = await import("@xrblocks/source/world/World.ts");
const { placeObjectAtIntersectionFacingTarget } = await import(
  "@xrblocks/source/utils/ObjectPlacement.ts"
);

it("keeps mesh options chainable and isolated from defaults", () => {
  const configured = new MeshDetectionOptions({
    showDebugVisualizations: true,
  }).enable();
  const defaults = new MeshDetectionOptions();

  expect(configured.enabled).toBe(true);
  expect(configured.showDebugVisualizations).toBe(true);
  expect(defaults.enabled).toBe(false);
  expect(defaults.showDebugVisualizations).toBe(false);
});

it("keeps world capability helpers from enabling unrelated detectors", () => {
  const planes = new WorldOptions().enablePlaneDetection();
  const meshes = new WorldOptions().enableMeshDetection();
  const anchors = new WorldOptions().enableAnchors();

  expect(planes).toMatchObject({
    enabled: true,
    planes: { enabled: true },
    meshes: { enabled: false },
  });
  expect(meshes).toMatchObject({
    enabled: true,
    planes: { enabled: false },
    meshes: { enabled: true },
  });
  expect(anchors).toMatchObject({
    enabled: true,
    anchors: { enabled: true },
    meshes: { enabled: false },
  });
});

it("keeps the detector inert when WebXR has no reference space", () => {
  const detector = new MeshDetector();
  detector.init({
    options: new MeshDetectionOptions(),
    renderer: {
      xr: { getReferenceSpace: () => null },
    } as never,
  });

  try {
    expect(() =>
      detector.updateMeshes(2000, {
        detectedMeshes: new Set([
          {
            vertices: new Float32Array([0, 0, 0]),
            indices: new Uint32Array(),
            lastChangedTime: 1,
          },
        ]),
      } as never),
    ).not.toThrow();
    expect(detector.xrMeshToThreeMesh.size).toBe(0);
    expect(detector.children).toEqual([]);
  } finally {
    detector.dispose();
  }
});

it("keeps disabled World lifecycle independent from mesh geometry", async () => {
  const world = new World();
  await world.init({
    options: new WorldOptions(),
    camera: new THREE.PerspectiveCamera(),
    waitFrame: { waitFrame: vi.fn() } as never,
    timer: new THREE.Timer(),
  });

  expect(world.meshes).toBeUndefined();
  expect(() => world.update(1, undefined)).not.toThrow();
  expect(() => world.showDebugVisualizations(false)).not.toThrow();
  world.dispose();
  expect(world.children).toEqual([]);
});

it("keeps generic surface placement valid for ordinary Three.js meshes", () => {
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  surface.rotation.x = -Math.PI / 2;
  surface.position.set(1, 2, 3);
  const target = new THREE.Object3D();
  target.position.set(1, 4, 5);
  const placed = new THREE.Object3D();

  placeObjectAtIntersectionFacingTarget(
    placed,
    {
      point: new THREE.Vector3(1, 2, 3),
      normal: new THREE.Vector3(0, 0, 1),
      object: surface,
    } as THREE.Intersection,
    target,
  );

  expect(placed.position.toArray()).toEqual([1, 2, 3]);
  expect(
    new THREE.Vector3(0, 1, 0).applyQuaternion(placed.quaternion).y,
  ).toBeCloseTo(1);
});

it("keeps an unconfigured mesh detector empty through no-frame and clear lifecycle paths", () => {
  const detector = new MeshDetector();
  detector.init({
    options: new MeshDetectionOptions(),
    renderer: {} as never,
  });

  try {
    expect(() => detector.updateMeshes(0, undefined)).not.toThrow();
    expect(() => detector.clearSimulatorMeshes()).not.toThrow();
    expect(detector.xrMeshToThreeMesh.size).toBe(0);
    expect(detector.threeMeshToXrMesh.size).toBe(0);
  } finally {
    detector.dispose();
  }
});
