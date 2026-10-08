import * as THREE from "three";

import { expect, it, it_session } from "@xrblocks/devtools/test";

import {
  createDepth,
  gpuDepth,
  loadDepthModules,
  makeRenderer,
} from "./fixtures/depth-fixtures.ts";

const { Depth, DepthOptions, DepthTextures } = await loadDepthModules();

it("publishes an independent native depth texture for each view", () => {
  const textures = new DepthTextures(
    new DepthOptions({ depthTexture: { enabled: true } }),
  );
  const harness = makeRenderer();
  const leftTexture = {} as WebGLTexture;
  const rightTexture = {} as WebGLTexture;

  textures.updateNativeTexture(
    gpuDepth(leftTexture, 0.125),
    harness.renderer,
    0,
  );
  textures.updateNativeTexture(
    gpuDepth(rightTexture, 0.25),
    harness.renderer,
    1,
  );

  const left = textures.get(0);
  const right = textures.get(1);
  expect(left).not.toBe(right);
  expect(left).toBeInstanceOf(THREE.ExternalTexture);
  expect(right).toBeInstanceOf(THREE.ExternalTexture);
});

it("reuses the native texture wrapper when a view receives a new GPU texture", () => {
  const textures = new DepthTextures(
    new DepthOptions({ depthTexture: { enabled: true } }),
  );
  const harness = makeRenderer();
  const firstTexture = {} as WebGLTexture;
  const nextTexture = {} as WebGLTexture;

  textures.updateNativeTexture(
    gpuDepth(firstTexture, 0.125),
    harness.renderer,
    0,
  );
  const wrapper = textures.get(0);
  textures.updateNativeTexture(
    gpuDepth(nextTexture, 0.375),
    harness.renderer,
    0,
  );

  expect(textures.get(0)).toBe(wrapper);
  expect(wrapper).toBeInstanceOf(THREE.ExternalTexture);
});

it("publishes GPU depth camera transforms for each view", () => {
  const harness = makeRenderer();
  const depth = createDepth(
    Depth,
    new DepthOptions({ depthTexture: { enabled: true } }),
    harness,
  );
  const projection = new THREE.Matrix4().makeScale(2, 3, 4);
  const view = new THREE.Matrix4().makeTranslation(-4, -5, -6);
  const viewToDepth = new THREE.Matrix4().makeTranslation(0.25, 0.5, 0);
  const observation = {
    ...gpuDepth({} as WebGLTexture, 0.125),
    projectionMatrix: projection.toArray(),
    transform: {
      inverse: { matrix: view.toArray() },
      position: { x: 4, y: 5, z: 6 },
      orientation: { x: 0, y: 0, z: 0, w: 1 },
    },
    normDepthBufferFromNormView: { matrix: viewToDepth.toArray() },
  } as unknown as XRWebGLDepthInformation;

  depth.updateGPUDepthData(observation, 0);

  expect(depth.depthProjectionMatrices[0].toArray()).toEqual(
    projection.toArray(),
  );
  expect(depth.depthProjectionInverseMatrices[0].toArray()).toEqual(
    projection.clone().invert().toArray(),
  );
  expect(depth.depthViewMatrices[0].toArray()).toEqual(view.toArray());
  expect(depth.depthViewProjectionMatrices[0].toArray()).toEqual(
    projection.clone().multiply(view).toArray(),
  );
  expect(depth.normDepthBufferFromNormViewMatrices[0].toArray()).toEqual(
    viewToDepth.toArray(),
  );
  expect(depth.depthCameraPositions[0].toArray()).toEqual([4, 5, 6]);
  expect(depth.depthCameraRotations[0].toArray()).toEqual([0, 0, 0, 1]);
  expect(depth.width).toBe(160);
  expect(depth.height).toBe(160);
});

it("retains raw GPU depth without readback when the depth mesh is disabled", () => {
  const harness = makeRenderer();
  const depth = createDepth(
    Depth,
    new DepthOptions({ depthTexture: { enabled: true } }),
    harness,
  );
  const left = gpuDepth({} as WebGLTexture, 0.125);
  const right = gpuDepth({} as WebGLTexture, 0.25);

  depth.updateGPUDepthData(left, 0);
  depth.updateGPUDepthData(right, 1);

  expect(depth.gpuDepthData).toEqual([left, right]);
  expect(depth.rawValueToMeters).toBe(0.125);
  expect(depth.getTexture(0)).toBeInstanceOf(THREE.ExternalTexture);
  expect(depth.getTexture(1)).toBeInstanceOf(THREE.ExternalTexture);
  expect(depth.getTexture(0)).not.toBe(depth.getTexture(1));
  expect(harness.readbackCalls).toBe(0);
  expect(depth.depthArray).toEqual([]);
});

it("converts only view zero when a depth mesh consumes GPU depth", () => {
  const converted = new Float32Array([1.25, 2.5, 3.75, 5, 6.25, 7.5]);
  const harness = makeRenderer(undefined, converted);
  const depth = createDepth(
    Depth,
    new DepthOptions({
      depthMesh: { enabled: true },
      depthTexture: { enabled: true },
    }),
    harness,
  );
  const first = gpuDepth({} as WebGLTexture, 0.125, 3, 2);
  const second = gpuDepth({} as WebGLTexture, 0.25, 3, 2);
  const geometry = depth.depthMesh!.downsampledGeometry!;
  const before = Array.from(geometry.attributes.position.array);

  depth.updateGPUDepthData(first, 0);
  depth.updateGPUDepthData(second, 1);

  expect(harness.readbackCalls).toBe(1);
  expect(depth.gpuDepthData).toEqual([first, second]);
  expect(depth.cpuDepthData[1]).toBeUndefined();
  expect(depth.depthDataFormat).toBe("float32");
  expect(depth.width).toBe(3);
  expect(depth.height).toBe(2);
  expect(Array.from(depth.depthArray[0])).toEqual(Array.from(converted));
  expect(Array.from(geometry.attributes.position.array)).not.toEqual(before);
  expect(depth.depthMesh!.position.toArray()).toEqual([4, 5, 6]);
  expect(depth.depthMesh!.quaternion.toArray()).toEqual([0, 0, 0, 1]);
  const leftTexture = depth.getTexture(0);
  const rightTexture = depth.getTexture(1);
  expect(leftTexture).not.toBe(rightTexture);
  expect(leftTexture).toBeInstanceOf(THREE.ExternalTexture);
  expect(rightTexture).toBeInstanceOf(THREE.ExternalTexture);
});

it("keeps existing GPU data when a GPU frame has no depth information", () => {
  let gpuRequests = 0;
  let cpuRequests = 0;
  const view = { eye: "left" } as XRView;
  const existing = gpuDepth({} as WebGLTexture, 0.125);
  const harness = makeRenderer({
    getDepthInformation() {
      gpuRequests += 1;
      return undefined;
    },
  });
  const depth = createDepth(Depth, new DepthOptions(), harness);
  depth.gpuDepthData[0] = existing;

  depth.updateLocalDepth({
    session: { depthUsage: "gpu-optimized" },
    getDepthInformation() {
      cpuRequests += 1;
      return undefined;
    },
    getViewerPose() {
      return { views: [view] };
    },
  } as unknown as XRFrame);

  expect(gpuRequests).toBe(1);
  expect(cpuRequests).toBe(0);
  expect(depth.gpuDepthData[0]).toBe(existing);
});

it_session(
  "renders and refreshes stereo GPU wrappers through the selected SDK build",
  async (session) => {
    const inspection = await session.objects.inspect({
      tag: "gpu-depth-routing",
    });
    const state = inspection.state as Record<string, unknown>;
    expect(state.error).toBeNull();
    expect(state.leftRawDepthPublished).toBe(true);
    expect(state.rightRawDepthPublished).toBe(true);
    expect(state.leftWrapperPublished).toBe(true);
    expect(state.rightWrapperPublished).toBe(true);
    expect(state.separateViewWrappers).toBe(true);
    expect(state.stereoWrappersVisible, JSON.stringify(state)).toBe(true);
    expect(state.refreshedWrapperVisible, JSON.stringify(state)).toBe(true);
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
