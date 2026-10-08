import * as THREE from "three";

import { expect, it, it_session, vi } from "@xrblocks/devtools/test";

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
const { DetectedMesh } = await import(
  "@xrblocks/source/world/mesh/DetectedMesh.ts"
);
const { WorldOptions } = await import("@xrblocks/source/world/WorldOptions.ts");

function simulatorMesh(label: string) {
  return {
    vertices: new Float32Array([
      -0.5, -0.5, -2, 0.5, -0.5, -2, 0.5, 0.5, -2, -0.5, 0.5, -2,
    ]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    lastChangedTime: 0,
    semanticLabel: label,
  };
}

it("keeps detected mesh geometry and semantic metadata available", () => {
  const source = simulatorMesh("floor");
  const material = new THREE.MeshBasicMaterial({ color: 0x123456 });
  const mesh = new DetectedMesh(source, material);

  expect(mesh.semanticLabel).toBe("floor");
  expect(mesh.geometry.attributes.position.count).toBe(4);
  expect(mesh.geometry.attributes.normal.count).toBe(4);
  expect(mesh.geometry.getIndex()?.count).toBe(6);
  expect(mesh.material).toBe(material);

  mesh.dispose();
  material.dispose();
});

it("keeps same-size mesh observations updated in place", () => {
  const source = simulatorMesh("wall");
  const mesh = new DetectedMesh(source, new THREE.MeshBasicMaterial());
  const geometry = mesh.geometry;
  const position = geometry.attributes.position;
  const dispose = vi.spyOn(geometry, "dispose");
  const changed = {
    ...source,
    lastChangedTime: 2,
    vertices: new Float32Array([-1, -1, -3, 1, -1, -3, 1, 1, -3, -1, 1, -3]),
  };

  mesh.updateVertices(changed as never);

  expect(mesh.geometry).toBe(geometry);
  expect(mesh.geometry.attributes.position).toBe(position);
  expect(Array.from(position.array)).toEqual(Array.from(changed.vertices));
  expect(position.version).toBeGreaterThan(0);
  expect(dispose).not.toHaveBeenCalled();
  mesh.dispose();
});

it("keeps changed-size observations replacing and disposing old geometry", () => {
  const source = simulatorMesh("wall");
  const mesh = new DetectedMesh(source, new THREE.MeshBasicMaterial());
  const original = mesh.geometry;
  const dispose = vi.spyOn(original, "dispose");

  mesh.updateVertices({
    ...source,
    lastChangedTime: 2,
    vertices: new Float32Array([0, 0, -2, 1, 0, -2, 0, 1, -2]),
    indices: new Uint32Array([0, 1, 2]),
  } as never);

  expect(mesh.geometry).not.toBe(original);
  expect(dispose).toHaveBeenCalledOnce();
  expect(mesh.geometry.attributes.position.count).toBe(3);
  expect(mesh.geometry.getIndex()?.count).toBe(3);
  mesh.dispose();
});

it("keeps detected mesh physics ownership balanced on disposal", () => {
  const source = simulatorMesh("floor");
  const mesh = new DetectedMesh(source, new THREE.MeshBasicMaterial());
  const body = {};
  const collider = {};
  const world = {
    createRigidBody: vi.fn(() => body),
    createCollider: vi.fn(() => collider),
    removeCollider: vi.fn(),
    removeRigidBody: vi.fn(),
  };
  const RAPIER = {
    RigidBodyDesc: {
      fixed: () => ({
        setTranslation() {
          return this;
        },
        setRotation() {
          return this;
        },
      }),
    },
    ColliderDesc: { trimesh: vi.fn(() => ({})) },
  };

  mesh.initRapierPhysics(RAPIER as never, world as never);
  expect(mesh.getRigidBody).toBe(body);
  expect(world.createCollider).toHaveBeenCalledTimes(1);
  expect(world.createCollider.mock.calls[0]?.[0]).toBeDefined();
  expect(world.createCollider.mock.calls[0]?.[1]).toBe(body);

  mesh.dispose();
  expect(world.removeCollider).toHaveBeenCalledOnce();
  expect(world.removeCollider.mock.calls[0]?.[0]).toBe(collider);
  expect(world.removeRigidBody).toHaveBeenCalledWith(body);
});

it("keeps mesh detection option enablement isolated in World options", () => {
  const options = new WorldOptions().enableMeshDetection();
  const defaults = new WorldOptions();

  expect(options).toMatchObject({
    enabled: true,
    meshes: { enabled: true },
    planes: { enabled: false },
  });
  expect(defaults.enabled).toBe(false);
  expect(defaults.meshes.enabled).toBe(false);
});

it("keeps supplied simulator injection, clear, dispose, and no-frame behavior intact", () => {
  const detector = new MeshDetector();
  detector.init({
    options: new MeshDetectionOptions(),
    renderer: {} as never,
  });
  const floor = simulatorMesh("floor");
  const wall = simulatorMesh("wall");

  try {
    expect(() => detector.updateMeshes(0, undefined)).not.toThrow();
    const [floorMesh, wallMesh] = detector.setSimulatorMeshes([
      floor,
      wall,
    ] as never);
    const disposeFloor = vi.spyOn(floorMesh.geometry, "dispose");
    const disposeWall = vi.spyOn(wallMesh.geometry, "dispose");

    expect(detector.xrMeshToThreeMesh.get(floor as never)).toBe(floorMesh);
    expect(detector.threeMeshToXrMesh.get(wallMesh)).toBe(wall as never);
    expect(detector.children).toEqual([floorMesh, wallMesh]);

    detector.clearSimulatorMeshes();
    expect(detector.xrMeshToThreeMesh.size).toBe(0);
    expect(detector.threeMeshToXrMesh.size).toBe(0);
    expect(disposeFloor).toHaveBeenCalledTimes(1);
    expect(disposeWall).toHaveBeenCalledTimes(1);

    const [replacement] = detector.setSimulatorMeshes([floor] as never);
    const disposeReplacement = vi.spyOn(replacement.geometry, "dispose");
    detector.dispose();
    expect(disposeReplacement).toHaveBeenCalledTimes(1);
    expect(detector.children).toEqual([]);
  } finally {
    detector.dispose();
  }
});

it_session(
  "keeps simulator mesh injection available through the running Core and World",
  async (session) => {
    await session.stepFrame(2);
    const inspection = await session.objects.inspect({
      tag: "mesh-detector-lifecycle-simulator",
    });

    expect(inspection.state).toMatchObject({
      error: null,
      geometry: { indexCount: 6, positionCount: 4 },
      label: "floor",
      mapIdentity: true,
      rayHit: true,
    });
    expectNoSessionErrors(session.diagnostics);
  },
);

function expectNoSessionErrors(diagnostics: {
  consoleEntries: Array<{ level?: unknown }>;
  pageErrors: unknown[];
  networkErrors: unknown[];
}): void {
  expect(
    diagnostics.consoleEntries.filter((entry) => entry.level === "error"),
  ).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.networkErrors).toEqual([]);
}
