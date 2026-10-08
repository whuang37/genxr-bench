import * as THREE from "three";

import { expect, it, it_session, vi } from "@xrblocks/devtools/test";

import {
  cpuDepth,
  loadDepthMeshModules,
  makePhysicsHarness,
  positionZValues,
} from "./fixtures/depth-mesh-fixtures.ts";

const { DepthMesh, DepthOptions } = await loadDepthMeshModules();

it("builds the configured full-resolution topology over its active depth UV region", () => {
  const mesh = new DepthMesh(
    new DepthOptions({
      depthMesh: {
        depthFullResolution: 6,
        ignoreEdgePixels: 1,
        useDownsampledGeometry: false,
      },
    }),
    6,
    6,
  );
  const geometry = mesh.geometry;
  const uvs = Array.from(geometry.attributes.uv.array);

  expect(geometry.attributes.position.count).toBe(16);
  expect(geometry.getIndex()!.count).toBe(54);
  expect(Math.min(...uvs)).toBeCloseTo(0.2);
  expect(Math.max(...uvs)).toBeCloseTo(0.8);
  expect(mesh.downsampledGeometry).toBeUndefined();
  expect(mesh.visible).toBe(true);
});

it("keeps the visible diagnostic surface current as depth textures change", () => {
  const frame = cpuDepth(new Float32Array([4, 4, 4, 4]), 2, 2, 0.25);
  let currentTexture: THREE.Texture = new THREE.DataTexture(
    new Float32Array([4, 4, 4, 4]),
    2,
    2,
    THREE.RedFormat,
    THREE.FloatType,
  );
  const depthTextures = {
    depthData: [frame],
    get() {
      return currentTexture;
    },
  };
  const mesh = new DepthMesh(
    new DepthOptions({
      depthMesh: {
        depthFullResolution: 6,
        ignoreEdgePixels: 1,
        showDebugTexture: true,
        updateFullResolutionGeometry: true,
        useDepthTexture: true,
      },
    }),
    2,
    2,
    depthTextures as never,
  );
  const material = mesh.material as THREE.ShaderMaterial;

  mesh.updateDepth(frame, new THREE.Matrix4(), "float32");

  expect(material.visible).toBe(true);
  expect(positionZValues(mesh.geometry)).toEqual(
    Array(mesh.geometry.attributes.position.count).fill(-1),
  );

  currentTexture = new THREE.ExternalTexture({} as WebGLTexture);
  const nextFrame = cpuDepth(new Float32Array([8, 8, 8, 8]), 2, 2, 0.25);
  mesh.updateDepth(nextFrame, new THREE.Matrix4(), "float32");

  expect(mesh.material).toBe(material);
  expect(positionZValues(mesh.geometry)).toEqual(
    Array(mesh.geometry.attributes.position.count).fill(-2),
  );
});

it("updates full-resolution geometry for changed depth data and invalidates consumers", () => {
  const mesh = new DepthMesh(
    new DepthOptions({
      depthMesh: {
        depthFullResolution: 6,
        ignoreEdgePixels: 1,
        updateFullResolutionGeometry: true,
        useDownsampledGeometry: false,
      },
    }),
    2,
    2,
  );
  const position = mesh.geometry.attributes.position;

  mesh.updateDepth(
    cpuDepth(new Float32Array([2, 2, 2, 2]), 2, 2),
    new THREE.Matrix4(),
    "float32",
  );
  const firstVersion = position.version;

  expect(positionZValues(mesh.geometry)).toEqual(
    Array(position.count).fill(-2),
  );

  mesh.updateDepth(
    cpuDepth(new Float32Array([4, 4, 4, 4, 4, 4]), 3, 2),
    new THREE.Matrix4(),
    "float32",
  );

  expect(positionZValues(mesh.geometry)).toEqual(
    Array(position.count).fill(-4),
  );
  expect(position.version).toBeGreaterThan(firstVersion);

  mesh.updateDepth(
    cpuDepth(new Uint16Array([2, 2, 2, 2]), 2, 2, 0.5),
    new THREE.Matrix4().makeScale(2, 3, 1),
    "luminance-alpha",
  );
  const positions = mesh.geometry.getAttribute("position");
  expect(positionZValues(mesh.geometry)).toEqual(
    Array(position.count).fill(-1),
  );
  expect(
    Math.max(Math.abs(positions.getX(0)), Math.abs(positions.getX(1))),
  ).toBeCloseTo(1.2);
  expect(
    Math.max(Math.abs(positions.getY(0)), Math.abs(positions.getY(4))),
  ).toBeCloseTo(1.8);
});

it("keeps raycasts on the depth-mesh owner after a rotated camera pose", () => {
  const mesh = new DepthMesh(
    new DepthOptions({
      depthMesh: {
        depthFullResolution: 6,
        ignoreEdgePixels: 1,
        updateFullResolutionGeometry: true,
        useDownsampledGeometry: true,
      },
    }),
    2,
    2,
  );
  mesh.updateDepth(
    cpuDepth(new Float32Array([2, 2, 2, 2]), 2, 2),
    new THREE.Matrix4(),
    "float32",
  );
  mesh.updatePose(
    new THREE.Vector3(1, 2, 3),
    new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      Math.PI / 2,
    ),
  );
  const hits: THREE.Intersection[] = [];

  mesh.raycast(
    new THREE.Raycaster(
      new THREE.Vector3(5, 2, 3),
      new THREE.Vector3(-1, 0, 0),
    ),
    hits,
  );

  expect(mesh.position.toArray()).toEqual([1, 2, 3]);
  expect(mesh.downsampledMesh!.position.toArray()).toEqual([1, 2, 3]);
  expect(hits).toHaveLength(1);
  expect(hits[0].object).toBe(mesh);
  expect(hits[0].point.x).toBeCloseTo(-1);
  expect(hits[0].point.y).toBeCloseTo(2);
  expect(hits[0].point.z).toBeCloseTo(3);
});

it("throttles environment-collider replacement while synchronizing its pose", () => {
  const now = vi.spyOn(performance, "now").mockReturnValue(0);
  try {
    const mesh = new DepthMesh(
      new DepthOptions({
        depthMesh: {
          colliderUpdateFps: 10,
          depthFullResolution: 6,
          ignoreEdgePixels: 1,
          updateFullResolutionGeometry: true,
          useDownsampledGeometry: false,
        },
      }),
      2,
      2,
    );
    const physics = makePhysicsHarness();
    mesh.updatePose(new THREE.Vector3(2, 3, 4), new THREE.Quaternion());
    mesh.initRapierPhysics(physics.RAPIER, physics.world);
    const initialCollider = physics.createdColliders[0];

    now.mockReturnValue(50);
    mesh.updateDepth(
      cpuDepth(new Float32Array([2, 2, 2, 2]), 2, 2),
      new THREE.Matrix4(),
      "float32",
    );
    expect(physics.createdColliders).toHaveLength(1);

    now.mockReturnValue(101);
    mesh.updateDepth(
      cpuDepth(new Float32Array([3, 3, 3, 3]), 2, 2),
      new THREE.Matrix4(),
      "float32",
    );

    const currentCollider = physics.createdColliders[1];
    expect(physics.createdColliders).toHaveLength(2);
    expect(physics.removedColliders).toEqual([initialCollider]);
    expect(physics.rigidBody.translations).toEqual([[2, 3, 4]]);
    expect(mesh.getColliderFromHandle(initialCollider.handle)).toBeUndefined();
    expect(mesh.getColliderFromHandle(currentCollider.handle)).toBe(
      currentCollider,
    );
  } finally {
    vi.restoreAllMocks();
  }
});

it_session(
  "builds and raycasts a depth mesh through the running SDK application",
  async (session) => {
    const inspection = await session.objects.inspect({
      tag: "depth-mesh-live",
    });

    expect(inspection.state).toMatchObject({
      error: null,
      fullVertexCount: 16,
      downsampledVertexCount: expect.any(Number),
      hitOwnedByMesh: true,
      hitPoint: [-1, 2, 3],
      positionInvalidated: true,
    });
    expect(inspection.state.downsampledVertexCount).toBeGreaterThan(0);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "renders flat, sloped, and stepped metric depth against fixed visual references",
  async (session) => {
    await session.stepFrame(2);
    const inspection = await session.objects.inspect({
      tag: "depth-mesh-visual",
    });
    const state = inspection.state as {
      error: string | null;
      flat: {
        centerRed: number;
        leftRed: number;
        rightRed: number;
        vertexDepths: number[];
      };
      slope: {
        centerRed: number;
        leftRed: number;
        rightRed: number;
        vertexDepths: number[];
      };
      step: {
        centerRed: number;
        leftRed: number;
        rightRed: number;
        vertexDepths: number[];
      };
    };

    expect(state.error).toBeNull();
    expect(new Set(state.flat.vertexDepths)).toEqual(new Set([2]));
    expect(state.flat.leftRed).toBeCloseTo(state.flat.rightRed, -1);
    expect(state.flat.centerRed).toBeGreaterThan(105);
    expect(state.flat.centerRed).toBeLessThan(150);

    expect(Math.min(...state.slope.vertexDepths)).toBeCloseTo(1);
    expect(Math.max(...state.slope.vertexDepths)).toBeCloseTo(3);
    expect(state.slope.rightRed).toBeGreaterThan(state.slope.leftRed + 100);

    expect(new Set(state.step.vertexDepths)).toEqual(new Set([1, 3]));
    expect(state.step.leftRed).toBeLessThan(35);
    expect(state.step.rightRed).toBeGreaterThan(220);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "matches the fixed simulator room's calibrated depth surface",
  {
    scenes: ["Living Room"],
    // These fixed samples were calibrated with this camera aspect ratio.
    viewport: { width: 1280, height: 900 },
  },
  async (session) => {
    await session.stepFrame(12);
    const inspection = await session.objects.inspect({
      tag: "simulator-depth",
    });
    const state = inspection.state as {
      depthRange: [number, number];
      ready: boolean;
      samples: Array<{
        environmentDistanceError: number | null;
        expectedDepth: number;
        geometryError: number;
        u: number;
      }>;
    };

    expect(state.ready).toBe(true);
    expect(state.depthRange[0]).toBeLessThan(0.5);
    expect(state.depthRange[1]).toBeGreaterThan(15);
    expect(state.samples).toHaveLength(3);

    const expectedDepths = [2.98, 3.25, 3.69];
    for (const [index, sample] of state.samples.entries()) {
      expect(sample.expectedDepth).toBeCloseTo(expectedDepths[index], 1);
      expect(sample.geometryError).toBeLessThan(0.02);
      expect(sample.environmentDistanceError).not.toBeNull();
      expect(sample.environmentDistanceError!).toBeLessThan(0.08);
    }
    expect(state.samples[0].expectedDepth).toBeLessThan(
      state.samples[1].expectedDepth,
    );
    expect(state.samples[1].expectedDepth).toBeLessThan(
      state.samples[2].expectedDepth,
    );
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
