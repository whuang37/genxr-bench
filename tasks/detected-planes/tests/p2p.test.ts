import * as THREE from "three";

import { expect, it, vi } from "@xrblocks/devtools/test";

Object.defineProperty(globalThis, "window", {
  value: { location: { search: "" } },
  configurable: true,
});

const { World } = await import("@xrblocks/source/world/World.ts");
const { WorldOptions } = await import("@xrblocks/source/world/WorldOptions.ts");
const { PlanesOptions } = await import(
  "@xrblocks/source/world/planes/PlanesOptions.ts"
);
const { MeshDetector } = await import(
  "@xrblocks/source/world/mesh/MeshDetector.ts"
);
const { MeshDetectionOptions } = await import(
  "@xrblocks/source/world/mesh/MeshDetectionOptions.ts"
);
const { placeObjectAtIntersectionFacingTarget } = await import(
  "@xrblocks/source/utils/ObjectPlacement.ts"
);

it("keeps plane options chainable without sharing mutable defaults", () => {
  const configured = new PlanesOptions().enable();
  const defaults = new PlanesOptions();

  expect(configured.enabled).toBe(true);
  expect(defaults.enabled).toBe(false);
});

it("keeps world feature helpers isolated from plane detection", () => {
  const meshWorld = new WorldOptions().enableMeshDetection();
  const anchorWorld = new WorldOptions().enableAnchorPersistence();

  expect(meshWorld).toMatchObject({
    enabled: true,
    meshes: { enabled: true },
    planes: { enabled: false },
  });
  expect(anchorWorld).toMatchObject({
    enabled: true,
    anchors: { enabled: true, persistent: true },
    planes: { enabled: false },
  });
});

it("keeps room capture a one-shot World lifecycle action", async () => {
  const world = new World();
  const initiateRoomCapture = vi.fn();
  await world.init({
    options: new WorldOptions({ enabled: true, initiateRoomCapture: true }),
    camera: new THREE.PerspectiveCamera(),
    waitFrame: { waitFrame: vi.fn() } as never,
    timer: new THREE.Timer(),
  });

  world.update(1, { session: { initiateRoomCapture } } as never);
  world.update(2, { session: { initiateRoomCapture } } as never);

  expect(initiateRoomCapture).toHaveBeenCalledOnce();
  world.dispose();
});

it("keeps neighboring simulator mesh injection and cleanup working", () => {
  const detector = new MeshDetector();
  detector.init({
    options: new MeshDetectionOptions(),
    renderer: {} as never,
  });
  const source = {
    vertices: new Float32Array([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    lastChangedTime: 0,
    semanticLabel: "floor",
  };

  const [mesh] = detector.setSimulatorMeshes([source]);
  const dispose = vi.spyOn(mesh.geometry, "dispose");
  expect(mesh.geometry.attributes.position.count).toBe(4);
  expect(mesh.geometry.getIndex()?.count).toBe(6);
  expect(detector.xrMeshToThreeMesh.get(source)).toBe(mesh);

  detector.clearSimulatorMeshes();
  expect(dispose).toHaveBeenCalledOnce();
  expect(detector.children).toEqual([]);
  detector.dispose();
});

it("keeps ordinary intersection placement independent from detected planes", () => {
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const target = new THREE.Object3D();
  target.position.set(0, 2, 4);
  const placed = new THREE.Object3D();

  placeObjectAtIntersectionFacingTarget(
    placed,
    {
      point: new THREE.Vector3(0.5, 1, -2),
      normal: new THREE.Vector3(0, 0, 1),
      object: surface,
    } as THREE.Intersection,
    target,
  );

  expect(placed.position.toArray()).toEqual([0.5, 1, -2]);
  expect(placed.quaternion.length()).toBeCloseTo(1);
});

it("keeps disabled world plane sensing inert and reports no placement surface", async () => {
  const world = new World();
  try {
    await world.init({
      options: new WorldOptions(),
      camera: new THREE.PerspectiveCamera(),
      waitFrame: vi.fn(),
      timer: new THREE.Timer(),
    });

    expect(world.planes).toBeUndefined();
    expect(
      world.placeOnSurface(new THREE.Object3D(), new THREE.Object3D()),
    ).toBe(false);
  } finally {
    world.dispose();
  }
});
