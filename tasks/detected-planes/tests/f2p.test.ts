import * as THREE from "three";

import { expect, it, it_session, vi } from "@xrblocks/devtools/test";

Object.defineProperty(globalThis, "window", {
  value: { location: { search: "" } },
  configurable: true,
});

const { DetectedPlane } = await import(
  "@xrblocks/source/world/planes/DetectedPlane.ts"
);
const { PlaneDetector } = await import(
  "@xrblocks/source/world/planes/PlaneDetector.ts"
);
const { WorldOptions } = await import("@xrblocks/source/world/WorldOptions.ts");

type PlaneData = {
  polygon: Array<{ x: number; z: number }>;
  semanticLabel?: string;
  orientation?: string;
  lastChangedTime: number;
  planeSpace: object;
};

function xrPlane(overrides: Partial<PlaneData> = {}): PlaneData {
  return {
    polygon: [
      { x: -1, z: -0.5 },
      { x: 1, z: -0.5 },
      { x: 1, z: 0.5 },
      { x: -1, z: 0.5 },
    ],
    semanticLabel: "floor",
    orientation: "horizontal",
    lastChangedTime: 1,
    planeSpace: {},
    ...overrides,
  };
}

function simulatorPlane(
  overrides: Partial<{
    type: "horizontal" | "vertical";
    label: string;
    area: number;
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    polygon: THREE.Vector2[];
  }> = {},
) {
  return {
    type: "horizontal" as const,
    label: "table",
    area: 2,
    position: new THREE.Vector3(1, 0.8, -2),
    quaternion: new THREE.Quaternion(),
    polygon: [
      new THREE.Vector2(-0.6, -0.4),
      new THREE.Vector2(0.6, -0.4),
      new THREE.Vector2(0.6, 0.4),
      new THREE.Vector2(-0.6, 0.4),
    ],
    ...overrides,
  };
}

function xzGeometry(mesh: THREE.Mesh) {
  const position = mesh.geometry.getAttribute("position");
  return Array.from({ length: position.count }, (_, index) => [
    position.getX(index),
    position.getY(index),
    position.getZ(index),
  ]);
}

function frame(
  planes: PlaneData[],
  poses = new Map<
    object,
    { position: THREE.Vector3; quaternion: THREE.Quaternion }
  >(),
) {
  const getPose = vi.fn((space: object) => {
    const pose = poses.get(space);
    return pose
      ? { transform: { position: pose.position, orientation: pose.quaternion } }
      : null;
  });
  return {
    frame: { detectedPlanes: new Set(planes), getPose } as unknown as XRFrame,
    getPose,
  };
}

function detector() {
  const referenceSpace = {} as XRReferenceSpace;
  const result = new PlaneDetector();
  const options = new WorldOptions().enablePlaneDetection();
  result.init({
    options,
    renderer: {
      xr: { getReferenceSpace: () => referenceSpace },
    } as never,
  });
  return result;
}

it("builds horizontal WebXR and simulator plane polygons with labels and poses", () => {
  const material = new THREE.MeshBasicMaterial();
  const native = xrPlane();
  const simulated = simulatorPlane({
    position: new THREE.Vector3(-0.25, 1.25, -3),
    quaternion: new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 4,
    ),
  });
  const nativeMesh = new DetectedPlane(native as unknown as XRPlane, material);
  const simulatorMesh = new DetectedPlane(null, material, simulated);

  try {
    for (const mesh of [nativeMesh, simulatorMesh]) {
      const vertices = xzGeometry(mesh);
      expect(vertices.every(([, y]) => Math.abs(y) < 0.000001)).toBe(true);
      expect(vertices.some(([, , z]) => Math.abs(z) > 0.1)).toBe(true);
    }
    expect(nativeMesh).toMatchObject({
      label: "floor",
      orientation: "horizontal",
    });
    expect(simulatorMesh.label).toBe("table");
    expect(simulatorMesh.orientation).toBe("horizontal");
    expect(simulatorMesh.position.toArray()).toEqual(
      simulated.position.toArray(),
    );
    expect(simulatorMesh.quaternion.toArray()).toEqual(
      simulated.quaternion.toArray(),
    );
  } finally {
    nativeMesh.geometry.dispose();
    simulatorMesh.geometry.dispose();
    material.dispose();
  }
});

it("retains one WebXR plane mesh across unchanged frames and filters labels", () => {
  const planes = detector();
  const native = xrPlane();
  const poses = new Map([
    [
      native.planeSpace,
      {
        position: new THREE.Vector3(0.25, 0.75, -2),
        quaternion: new THREE.Quaternion(),
      },
    ],
  ]);

  try {
    planes.update(0, frame([native], poses).frame);
    const mesh = planes.get("floor")[0]!;
    const firstGeometry = mesh.geometry;

    planes.update(1, frame([native], poses).frame);
    expect(planes.get()).toEqual([mesh]);
    expect(mesh.geometry).toBe(firstGeometry);
    expect(mesh.position.toArray()).toEqual([0.25, 0.75, -2]);

    expect(planes.get("wall")).toEqual([]);
  } finally {
    planes.dispose();
  }
});

it("removes stale plane geometry and detaches the stale mesh", () => {
  const planes = detector();
  const native = xrPlane();
  const poses = new Map([
    [
      native.planeSpace,
      { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() },
    ],
  ]);

  try {
    planes.update(0, frame([native], poses).frame);
    const mesh = planes.get()[0]!;
    const disposeGeometry = vi.spyOn(mesh.geometry, "dispose");

    planes.update(1, frame([], poses).frame);
    expect(planes.get()).toEqual([]);
    expect(planes.children).not.toContain(mesh);
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
  } finally {
    planes.dispose();
  }
});

it("substitutes simulator planes, ignores native frames, clears safely, and resumes WebXR planes", () => {
  const planes = detector();
  const native = xrPlane();
  const poses = new Map([
    [
      native.planeSpace,
      { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() },
    ],
  ]);
  const table = simulatorPlane();
  const wall = simulatorPlane({
    type: "vertical",
    label: "wall",
    position: new THREE.Vector3(-1, 1, -3),
    quaternion: new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 2,
    ),
  });

  try {
    planes.update(0, frame([native], poses).frame);
    const nativeMesh = planes.get()[0]!;
    const disposeNativeGeometry = vi.spyOn(nativeMesh.geometry, "dispose");
    planes.setSimulatorPlanes([table, wall]);
    const tableMesh = planes.get("table")[0]!;
    const wallMesh = planes.get("wall")[0]!;
    const disposeTableGeometry = vi.spyOn(tableMesh.geometry, "dispose");
    const disposeTableMaterial = vi.spyOn(
      tableMesh.material as THREE.Material,
      "dispose",
    );

    expect(disposeNativeGeometry).toHaveBeenCalledTimes(1);
    expect(planes.get()).toEqual([tableMesh, wallMesh]);
    expect(tableMesh).toMatchObject({
      label: "table",
      orientation: "horizontal",
      position: table.position,
    });
    expect(wallMesh).toMatchObject({
      label: "wall",
      orientation: "vertical",
      position: wall.position,
    });
    expect(xzGeometry(tableMesh).every(([, y]) => Math.abs(y) < 0.000001)).toBe(
      true,
    );

    planes.update(1, frame([native], poses).frame);
    expect(planes.get()).toEqual([tableMesh, wallMesh]);

    planes.clearSimulatorPlanes();
    expect(planes.get()).toEqual([]);
    expect(disposeTableGeometry).toHaveBeenCalledTimes(1);
    expect(disposeTableMaterial).toHaveBeenCalledTimes(1);

    planes.update(2, frame([native], poses).frame);
    expect(planes.get("floor")).toHaveLength(1);
  } finally {
    planes.dispose();
  }
});

it("accepts no frame, no reference space, and empty plane sets without creating meshes", () => {
  const planes = new PlaneDetector();
  const options = new WorldOptions().enablePlaneDetection();
  planes.init({
    options,
    renderer: { xr: { getReferenceSpace: () => null } } as never,
  });

  try {
    expect(() => planes.update(0, undefined as never)).not.toThrow();
    expect(() => planes.update(1, frame([]).frame)).not.toThrow();
    expect(planes.get()).toEqual([]);
  } finally {
    planes.dispose();
  }
});

it_session(
  "maps the stable Living Room simulator floor into world sensing",
  { scenes: ["Living Room"] },
  async (session) => {
    await session.stepFrame(2);
    const inspection = await session.objects.inspect({
      tag: "detected-planes-stable-environment",
    });
    const state = inspection.state as {
      count: number;
      error: string | null;
      floor: {
        area: number;
        localYIsFlat: boolean;
        position: number[];
        vertexCount: number;
      };
      horizontalCount: number;
      wallCount: number;
    };

    expect(state).toMatchObject({
      count: 16,
      error: null,
      floor: {
        area: expect.closeTo(36.6909, 0.001),
        localYIsFlat: true,
        vertexCount: expect.any(Number),
      },
      horizontalCount: 4,
      wallCount: 12,
    });
    expect(state.floor.vertexCount).toBeGreaterThanOrEqual(5);
    expect(state.floor.position[0]).toBeCloseTo(0.011, 2);
    expect(state.floor.position[1]).toBeCloseTo(0.307, 2);
    expect(state.floor.position[2]).toBeCloseTo(0.645, 2);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "registers configured simulator planes through the running Core and World facade",
  async (session) => {
    await session.stepFrame(2);
    const inspection = await session.objects.inspect({
      tag: "detected-planes-session",
    });

    const state = inspection.state;
    expect(state).toMatchObject({
      error: null,
      labels: ["session-table", "session-wall"],
      orientations: ["horizontal", "vertical"],
      positions: [
        [0.5, 0.75, -2],
        [-1, 1, -3],
      ],
      polygonsLieOnLocalXZ: [true, true],
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
