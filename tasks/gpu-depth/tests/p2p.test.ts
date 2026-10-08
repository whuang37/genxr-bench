import * as THREE from "three";

import { expect, it, it_session, vi } from "@xrblocks/devtools/test";

import {
  cpuDepth,
  createDepth,
  loadDepthModules,
  makeRenderer,
} from "./fixtures/depth-fixtures.ts";

const { Depth, DepthOptions, DepthTextures } = await loadDepthModules();

it("returns zero when no depth data is available", () => {
  Depth.instance = undefined;
  const depth = new Depth();
  expect(depth.getDepth(0.5, 0.5)).toBe(0);
  expect(depth.getVertex(0.5, 0.5)).toBeNull();
  expect(depth.rawValueToMeters).toBe(0);
  expect(depth.getTexture(0)).toBeUndefined();
});

it("keeps disabled depth updates from touching an XR frame", () => {
  Depth.instance = undefined;
  const depth = new Depth();
  const frame = {
    getViewerPose: vi.fn(() => {
      throw new Error("disabled depth must not inspect the frame");
    }),
  };

  expect(() => depth.update(frame as never)).not.toThrow();
  expect(frame.getViewerPose).not.toHaveBeenCalled();
});

it("continues to route CPU depth through XRFrame and report meters", () => {
  let cpuRequests = 0;
  let gpuRequests = 0;
  const view = { eye: "left" } as XRView;
  const harness = makeRenderer({
    getDepthInformation() {
      gpuRequests += 1;
      return undefined;
    },
  });
  const depth = createDepth(Depth, new DepthOptions(), harness);
  const data = cpuDepth(new Float32Array([1.5, 2.5, 3.5, 4.5]), 0.25);

  depth.updateLocalDepth({
    session: { depthUsage: "cpu-optimized", depthDataFormat: "float32" },
    getDepthInformation() {
      cpuRequests += 1;
      return data;
    },
    getViewerPose() {
      return { views: [view] };
    },
  } as unknown as XRFrame);

  expect(cpuRequests).toBe(1);
  expect(gpuRequests).toBe(0);
  expect(depth.cpuDepthData[0]).toBe(data);
  expect(depth.depthDataFormat).toBe("float32");
  expect(depth.getDepth(0, 1)).toBe(0.375);
  expect(depth.getDepth(1, 0)).toBe(1.125);
});

it("continues to reuse and refresh a same-size CPU DataTexture", () => {
  const textures = new DepthTextures(
    new DepthOptions({ depthTexture: { enabled: true } }),
  );
  textures.updateData(cpuDepth(new Float32Array([1, 2, 3, 4])), 0, "float32");
  const texture = textures.get(0) as THREE.DataTexture;

  textures.updateData(cpuDepth(new Float32Array([8, 6, 4, 2])), 0, "float32");
  const refreshed = textures.get(0) as THREE.DataTexture;

  expect(refreshed).toBe(texture);
  expect(refreshed.isDataTexture).toBe(true);
  expect(refreshed.image.width).toBe(2);
  expect(refreshed.image.height).toBe(2);
  expect(Array.from(refreshed.image.data)).toEqual([8, 6, 4, 2]);
});

it("continues to replace a CPU DataTexture when its dimensions change", () => {
  const textures = new DepthTextures(
    new DepthOptions({ depthTexture: { enabled: true } }),
  );
  textures.updateData(cpuDepth(new Float32Array([1, 2, 3, 4])), 0, "float32");
  const first = textures.get(0) as THREE.DataTexture;
  const dispose = vi.spyOn(first, "dispose");

  textures.updateData(
    cpuDepth(new Float32Array([1, 2, 3, 4, 5, 6]), 1, 3, 2),
    0,
    "float32",
  );
  const resized = textures.get(0) as THREE.DataTexture;

  expect(resized).not.toBe(first);
  expect(dispose).toHaveBeenCalledOnce();
  expect(resized.image.width).toBe(3);
  expect(resized.image.height).toBe(2);
  expect(Array.from(resized.image.data)).toEqual([1, 2, 3, 4, 5, 6]);
});

it("continues to apply the view-to-depth coordinate transform", () => {
  Depth.instance = undefined;
  const depth = new Depth();
  depth.width = 2;
  depth.height = 2;
  depth.depthArray[0] = new Float32Array([10, 20, 30, 40]);
  depth.cpuDepthData[0] = cpuDepth(new Float32Array([10, 20, 30, 40]), 0.1);
  depth.normDepthBufferFromNormViewMatrices[0] = new THREE.Matrix4().set(
    0,
    1,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
  );

  expect(depth.getDepth(0, 1)).toBe(4);
});

it("continues to decode packed CPU depth without entering the GPU path", () => {
  const harness = makeRenderer();
  const depth = createDepth(Depth, new DepthOptions(), harness);
  const data = {
    width: 2,
    height: 2,
    data: new Uint16Array([256, 512, 1024, 2048]).buffer,
    rawValueToMeters: 0.01,
  } as XRCPUDepthInformation;

  depth.updateCPUDepthData(data, 0, "luminance-alpha");

  expect(depth.depthArray[0]).toBeInstanceOf(Uint16Array);
  expect(Array.from(depth.depthArray[0])).toEqual([256, 512, 1024, 2048]);
  expect(depth.getDepth(0, 1)).toBeCloseTo(2.56);
  expect(harness.readbackCalls).toBe(0);
});

it("keeps CPU depth data for stereo views separate", () => {
  const harness = makeRenderer();
  const depth = createDepth(Depth, new DepthOptions(), harness);
  const left = cpuDepth(new Float32Array([1, 2, 3, 4]), 0.5);
  const right = cpuDepth(new Float32Array([9, 8, 7, 6]), 0.25);

  depth.updateCPUDepthData(left, 0, "float32");
  depth.updateCPUDepthData(right, 1, "float32");

  expect(depth.cpuDepthData).toEqual([left, right]);
  expect(Array.from(depth.depthArray[0])).toEqual([1, 2, 3, 4]);
  expect(Array.from(depth.depthArray[1])).toEqual([9, 8, 7, 6]);
  expect(depth.rawValueToMeters).toBe(0.5);
});

it("keeps depth client pause and resume control independent from acquisition", () => {
  const harness = makeRenderer();
  harness.renderer.xr.getReferenceSpace = () => null;
  const depth = createDepth(
    Depth,
    new DepthOptions({ enabled: true }),
    harness,
  );
  const pauseDepthSensing = vi.fn();
  const resumeDepthSensing = vi.fn();
  const session = {
    depthActive: true,
    pauseDepthSensing,
    resumeDepthSensing,
  };
  const frame = { session } as unknown as XRFrame;

  depth.pauseDepth({});
  depth.updateLocalDepth(frame);
  expect(pauseDepthSensing).toHaveBeenCalledOnce();

  const client = {};
  depth.resumeDepth(client);
  session.depthActive = false;
  depth.updateLocalDepth(frame);
  expect(resumeDepthSensing).toHaveBeenCalledOnce();

  depth.pauseDepth(client);
});

it("keeps nested depth options and preferences isolated per instance", () => {
  const configured = new DepthOptions({
    enabled: true,
    matchDepthView: true,
    depthTexture: { enabled: true, constantKernel: true },
    usagePreference: ["cpu-optimized"],
  });
  const defaults = new DepthOptions();

  expect(configured).toMatchObject({
    enabled: true,
    matchDepthView: true,
    depthTexture: { enabled: true, constantKernel: true },
    usagePreference: ["cpu-optimized"],
  });
  expect(defaults.enabled).toBe(false);
  expect(defaults.depthTexture.enabled).toBe(false);
  expect(defaults.usagePreference).toEqual([]);
});

it_session(
  "keeps CPU depth routing wired through the selected SDK build",
  async (session) => {
    const inspection = await session.objects.inspect({
      tag: "cpu-depth-routing",
    });
    expect(inspection.state).toMatchObject({
      error: null,
      cpuRequests: 1,
      gpuRequests: 0,
      width: 2,
      height: 2,
      topLeftMeters: 0.375,
      bottomRightMeters: 1.125,
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
