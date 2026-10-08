import * as THREE from "three";

import { expect, it, it_session, vi } from "@xrblocks/devtools/test";

Object.defineProperty(globalThis, "window", {
  value: { location: { search: "" } },
  configurable: true,
});

const { DetectedMesh } = await import(
  "@xrblocks/source/world/mesh/DetectedMesh.ts"
);
const { MeshDetector } = await import(
  "@xrblocks/source/world/mesh/MeshDetector.ts"
);
const { MeshDetectionOptions } = await import(
  "@xrblocks/source/world/mesh/MeshDetectionOptions.ts"
);

type MeshSource = {
  vertices: Float32Array;
  indices: Uint32Array;
  lastChangedTime: number;
  semanticLabel?: string;
  meshSpace?: object;
  position?: THREE.Vector3;
  quaternion?: THREE.Quaternion;
};

function meshSource(overrides: Partial<MeshSource> = {}): MeshSource {
  return {
    vertices: new Float32Array([
      -0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0,
    ]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    lastChangedTime: 1,
    semanticLabel: "floor",
    meshSpace: {},
    ...overrides,
  };
}

function values(attribute: THREE.BufferAttribute) {
  return Array.from(attribute.array);
}

function physicsHarness() {
  const descriptions: Array<{ translation?: number[]; rotation?: number[] }> =
    [];
  const createdBodies: object[] = [];
  const createdColliders: object[] = [];
  const removedColliders: object[] = [];
  const removedBodies: object[] = [];
  const fixed = vi.fn(() => {
    const description: { translation?: number[]; rotation?: number[] } = {};
    descriptions.push(description);
    const descriptor = {
      setTranslation: vi.fn((x: number, y: number, z: number) => {
        description.translation = [x, y, z];
        return descriptor;
      }),
      setRotation: vi.fn((rotation: THREE.Quaternion) => {
        description.rotation = rotation.toArray();
        return descriptor;
      }),
    };
    return descriptor;
  });
  const trimesh = vi.fn((vertices: Float32Array, indices: Uint32Array) => ({
    indices,
    vertices,
  }));
  const RAPIER = {
    RigidBodyDesc: { fixed },
    ColliderDesc: { trimesh },
  };
  const world = {
    createRigidBody: vi.fn((description: object) => {
      const body = { description, id: `body-${createdBodies.length}` };
      createdBodies.push(body);
      return body;
    }),
    createCollider: vi.fn((description: object, body: object) => {
      const collider = {
        body,
        description,
        id: `collider-${createdColliders.length}`,
      };
      createdColliders.push(collider);
      return collider;
    }),
    removeCollider: vi.fn((collider: object) =>
      removedColliders.push(collider),
    ),
    removeRigidBody: vi.fn((body: object) => removedBodies.push(body)),
  };
  return {
    RAPIER,
    createdBodies,
    createdColliders,
    descriptions,
    removedBodies,
    removedColliders,
    world,
  };
}

it("builds indexed and unshared triangle geometry with normals and semantic labels", () => {
  const material = new THREE.MeshBasicMaterial({ visible: false });
  const indexed = meshSource({
    position: new THREE.Vector3(2, 3, 4),
    quaternion: new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 2,
    ),
  });
  const unsharedTriangle = meshSource({
    vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
    indices: new Uint32Array([0, 1, 2]),
    semanticLabel: "wall",
  });
  const indexedMesh = new DetectedMesh(indexed as never, material);
  const triangleMesh = new DetectedMesh(unsharedTriangle as never, material);

  try {
    expect(values(indexedMesh.geometry.getAttribute("position"))).toEqual(
      Array.from(indexed.vertices),
    );
    expect(values(indexedMesh.geometry.getIndex()!)).toEqual(
      Array.from(indexed.indices),
    );
    expect(values(indexedMesh.geometry.getAttribute("normal"))).toEqual([
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    ]);
    expect(indexedMesh.semanticLabel).toBe("floor");
    expect(indexedMesh.material).toBe(material);
    expect(indexedMesh.position.toArray()).toEqual([0, 0, 0]);
    expect(indexedMesh.quaternion.toArray()).toEqual([0, 0, 0, 1]);

    expect(triangleMesh.geometry.getAttribute("position").count).toBe(3);
    expect(triangleMesh.geometry.getIndex()!.count).toBe(3);
    expect(values(triangleMesh.geometry.getAttribute("normal"))).toEqual([
      0, 0, 1, 0, 0, 1, 0, 0, 1,
    ]);
    expect(triangleMesh.semanticLabel).toBe("wall");
  } finally {
    indexedMesh.dispose();
    triangleMesh.dispose();
    material.dispose();
  }
});

it("updates same-sized XR mesh data in place only after its change time advances", () => {
  const material = new THREE.MeshBasicMaterial();
  const initial = meshSource();
  const mesh = new DetectedMesh(initial as never, material);
  mesh.position.set(3, 2, 1);
  mesh.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 3);
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex()!;
  const initialPositionVersion = position.version;
  const initialIndexVersion = index.version;

  try {
    mesh.updateVertices(
      meshSource({
        lastChangedTime: 1,
        vertices: new Float32Array([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]),
      }) as unknown as XRMesh,
    );
    expect(values(position)).toEqual(Array.from(initial.vertices));
    expect(position.version).toBe(initialPositionVersion);
    expect(index.version).toBe(initialIndexVersion);

    const changed = meshSource({
      lastChangedTime: 2,
      vertices: new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]),
      indices: new Uint32Array([0, 2, 1, 0, 3, 2]),
    });
    mesh.updateVertices(changed as unknown as XRMesh);

    expect(mesh.geometry).toBe(geometry);
    expect(values(position)).toEqual(Array.from(changed.vertices));
    expect(values(index)).toEqual(Array.from(changed.indices));
    expect(position.version).toBeGreaterThan(initialPositionVersion);
    expect(index.version).toBeGreaterThan(initialIndexVersion);
    expect(mesh.position.toArray()).toEqual([3, 2, 1]);
    expect(mesh.quaternion.toArray()).toEqual(
      new THREE.Quaternion()
        .setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 3)
        .toArray(),
    );
  } finally {
    mesh.dispose();
    material.dispose();
  }
});

it("rebuilds resized mesh geometry and replaces its fixed triangle collider once per change", () => {
  const material = new THREE.MeshBasicMaterial();
  const mesh = new DetectedMesh(meshSource() as never, material);
  mesh.position.set(1, 2, 3);
  mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 4);
  const physics = physicsHarness();

  try {
    mesh.initRapierPhysics(physics.RAPIER as never, physics.world as never);
    const firstCollider = physics.createdColliders[0]!;
    expect(physics.descriptions).toEqual([
      {
        translation: [1, 2, 3],
        rotation: mesh.quaternion.toArray(),
      },
    ]);
    expect(physics.createdBodies).toHaveLength(1);
    expect(mesh.getRigidBody).toBe(physics.createdBodies[0]);
    expect(firstCollider.body).toBe(mesh.getRigidBody);
    expect(firstCollider.description).toBeDefined();

    const sameSize = meshSource({
      lastChangedTime: 2,
      vertices: new Float32Array([
        -0.75, -0.5, 0, 0.75, -0.5, 0, 0.75, 0.5, 0, -0.75, 0.5, 0,
      ]),
    });
    mesh.updateVertices(sameSize as unknown as XRMesh);
    const secondCollider = physics.createdColliders[1]!;
    expect(physics.removedColliders).toEqual([firstCollider]);
    expect(secondCollider.body).toBe(mesh.getRigidBody);

    const oldGeometry = mesh.geometry;
    const disposeOldGeometry = vi.spyOn(oldGeometry, "dispose");
    const resized = meshSource({
      lastChangedTime: 3,
      vertices: new Float32Array([
        -1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0, 0, 0, 1,
      ]),
      indices: new Uint32Array([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]),
    });
    mesh.updateVertices(resized as unknown as XRMesh);

    expect(mesh.geometry).not.toBe(oldGeometry);
    expect(mesh.geometry.getAttribute("position").count).toBe(5);
    expect(mesh.geometry.getIndex()!.count).toBe(12);
    expect(disposeOldGeometry).toHaveBeenCalledTimes(1);
    expect(physics.removedColliders).toEqual([firstCollider, secondCollider]);
    expect(physics.createdColliders).toHaveLength(3);

    const currentCollider = physics.createdColliders[2]!;
    const disposeGeometry = vi.spyOn(mesh.geometry, "dispose");
    mesh.dispose();
    expect(physics.removedColliders).toEqual([
      firstCollider,
      secondCollider,
      currentCollider,
    ]);
    expect(physics.removedBodies).toEqual([physics.createdBodies[0]]);
    expect(mesh.getRigidBody).toBeUndefined();
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
  } finally {
    mesh.dispose();
    material.dispose();
  }
});

it("injects simulator meshes with bidirectional identities and owned cleanup", () => {
  const detector = new MeshDetector();
  const options = new MeshDetectionOptions();
  detector.init({
    options,
    renderer: {} as never,
  });
  const floor = meshSource({ semanticLabel: "floor" });
  const unlabelled = meshSource({ semanticLabel: "other" });

  try {
    const [floorMesh, otherMesh] = detector.setSimulatorMeshes([
      floor,
      unlabelled,
    ] as never);
    const floorMaterial = floorMesh.material as THREE.MeshBasicMaterial;
    const otherMaterial = otherMesh.material as THREE.MeshBasicMaterial;
    const disposeFloorGeometry = vi.spyOn(floorMesh.geometry, "dispose");
    const materialDisposals = [...new Set([floorMaterial, otherMaterial])].map(
      (material) => vi.spyOn(material, "dispose"),
    );

    expect(detector.xrMeshToThreeMesh.get(floor as never)).toBe(floorMesh);
    expect(detector.threeMeshToXrMesh.get(floorMesh)).toBe(floor as never);
    expect(detector.xrMeshToThreeMesh.get(unlabelled as never)).toBe(otherMesh);
    expect(detector.threeMeshToXrMesh.get(otherMesh)).toBe(unlabelled as never);
    expect(floorMesh.semanticLabel).toBe("floor");
    detector.clearSimulatorMeshes();
    expect(detector.xrMeshToThreeMesh.size).toBe(0);
    expect(detector.threeMeshToXrMesh.size).toBe(0);
    expect(detector.children).toEqual([]);
    expect(disposeFloorGeometry).toHaveBeenCalledTimes(1);
    for (const dispose of materialDisposals) {
      expect(dispose).not.toHaveBeenCalled();
    }

    detector.dispose();
    for (const dispose of materialDisposals) {
      expect(dispose).toHaveBeenCalledTimes(1);
    }
  } finally {
    detector.dispose();
  }
});

it("handles empty and malformed mesh arrays safely", () => {
  const material = new THREE.MeshBasicMaterial();
  const empty = new DetectedMesh(
    meshSource({
      vertices: new Float32Array(),
      indices: new Uint32Array(),
      semanticLabel: undefined,
    }) as never,
    material,
  );
  const partial = new DetectedMesh(
    meshSource({
      vertices: new Float32Array([0, 0]),
      indices: new Uint32Array([0]),
    }) as never,
    material,
  );

  try {
    expect(empty.geometry.getAttribute("position").count).toBe(0);
    expect(empty.geometry.getIndex()!.count).toBe(0);
    expect(empty.geometry.getAttribute("normal").count).toBe(0);
    expect(partial.geometry).toBeInstanceOf(THREE.BufferGeometry);
  } finally {
    empty.dispose();
    partial.dispose();
    material.dispose();
  }
});

it_session(
  "builds, renders, and raycasts an injected simulator mesh through the running World",
  async (session) => {
    await session.stepFrame(2);
    const inspection = await session.objects.inspect({
      tag: "detected-mesh-geometry-session",
    });

    const state = inspection.state as {
      renderCoverage: {
        bounds: number[];
        centerCoverage: number;
        coloredPixels: number;
        outerColoredPixels: number;
      };
    };
    expect(state).toMatchObject({
      error: null,
      geometry: { indexCount: 6, normalCount: 4, positionCount: 4 },
      label: "floor",
      mapIdentity: true,
      normalZ: [1, 1, 1, 1],
      rayHit: true,
      rayPoint: [0, 0, -2],
    });
    expect(state.renderCoverage.centerCoverage).toBeGreaterThan(0.95);
    expect(state.renderCoverage.coloredPixels).toBeGreaterThan(900);
    expect(state.renderCoverage.coloredPixels).toBeLessThan(1150);
    expect(state.renderCoverage.outerColoredPixels).toBe(0);
    const [minX, minY, maxX, maxY] = state.renderCoverage.bounds;
    expect(minX).toBeGreaterThanOrEqual(14);
    expect(minY).toBeGreaterThanOrEqual(14);
    expect(maxX).toBeLessThanOrEqual(49);
    expect(maxY).toBeLessThanOrEqual(49);
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
