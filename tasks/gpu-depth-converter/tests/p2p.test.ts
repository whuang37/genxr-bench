import * as THREE from "three";

import { expect, it, vi } from "@xrblocks/devtools/test";

import {
  cpuDepth,
  createDepth,
  loadDepthModules,
  makeRenderer,
} from "./fixtures/gpu-depth-fixtures.ts";

const { Depth, DepthOptions } = await loadDepthModules();

it("keeps empty depth reads safe before any converter or frame exists", () => {
  Depth.instance = undefined;
  const depth = new Depth();

  expect(depth.getDepth(0.5, 0.5)).toBe(0);
  expect(depth.getVertex(0.5, 0.5)).toBeNull();
  expect(depth.rawValueToMeters).toBe(0);
  expect(depth.getTexture(0)).toBeUndefined();
});

it("keeps disabled depth updates from requesting frame data", () => {
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

it("continues to consume float CPU depth in meters through the public Depth API", () => {
  const harness = makeRenderer();
  const depth = createDepth(Depth, new DepthOptions(), harness);
  const values = new Float32Array([1.5, 2.5, 3.5, 4.5, 5.5, 6.5]);

  depth.updateCPUDepthData(cpuDepth(values, 3, 2, 0.2), 0, "float32");

  expect(depth.width).toBe(3);
  expect(depth.height).toBe(2);
  expect(depth.depthDataFormat).toBe("float32");
  expect(depth.depthArray[0]).toBeInstanceOf(Float32Array);
  expect(Array.from(depth.depthArray[0])).toEqual(Array.from(values));
  expect(depth.getDepth(1, 1)).toBeCloseTo(0.7);
  expect(depth.getDepth(0, 0)).toBeCloseTo(0.9);
});

it("keeps packed CPU depth on the Uint16 path", () => {
  const harness = makeRenderer();
  const depth = createDepth(Depth, new DepthOptions(), harness);
  const values = new Uint16Array([256, 512, 1024, 2048]);
  const data = {
    data: values.buffer,
    height: 2,
    rawValueToMeters: 0.01,
    width: 2,
  } as XRCPUDepthInformation;

  depth.updateCPUDepthData(data, 0, "luminance-alpha");

  expect(depth.depthArray[0]).toBeInstanceOf(Uint16Array);
  expect(Array.from(depth.depthArray[0])).toEqual(Array.from(values));
  expect(depth.getDepth(0, 1)).toBeCloseTo(2.56);
});

it("keeps CPU coordinate transforms and projected vertices available", () => {
  const harness = makeRenderer();
  const depth = createDepth(Depth, new DepthOptions(), harness);
  const data = cpuDepth(new Float32Array([10, 20, 30, 40]), 2, 2, 0.1);
  Object.assign(data, {
    normDepthBufferFromNormView: {
      matrix: new THREE.Matrix4()
        .set(0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
        .toArray(),
    },
  });

  depth.updateCPUDepthData(data, 0, "float32");

  expect(depth.getDepth(0, 1)).toBeCloseTo(4);
  const vertex = depth.getVertex(0, 1);
  expect(vertex).not.toBeNull();
  expect(vertex!.z).toBeLessThan(0);
  expect(vertex!.toArray().every(Number.isFinite)).toBe(true);
});

it("keeps CPU stereo views separate and uses the primary scale", () => {
  const harness = makeRenderer();
  const depth = createDepth(Depth, new DepthOptions(), harness);
  const left = cpuDepth(new Float32Array([1, 2, 3, 4]), 2, 2, 0.5);
  const right = cpuDepth(new Float32Array([8, 7, 6, 5]), 2, 2, 0.25);

  depth.updateCPUDepthData(left, 0, "float32");
  depth.updateCPUDepthData(right, 1, "float32");

  expect(depth.cpuDepthData).toEqual([left, right]);
  expect(Array.from(depth.depthArray[0])).toEqual([1, 2, 3, 4]);
  expect(Array.from(depth.depthArray[1])).toEqual([8, 7, 6, 5]);
  expect(depth.rawValueToMeters).toBe(0.5);
});

it("keeps depth option overrides from mutating later instances", () => {
  const configured = new DepthOptions({
    enabled: true,
    depthTexture: { enabled: true, applyGaussianBlur: true },
    dataFormatPreference: ["luminance-alpha"],
  });
  const defaults = new DepthOptions();

  expect(configured.enabled).toBe(true);
  expect(configured.depthTexture.enabled).toBe(true);
  expect(configured.depthTexture.applyGaussianBlur).toBe(true);
  expect(configured.dataFormatPreference[0]).toBe("luminance-alpha");
  expect(defaults.enabled).toBe(false);
  expect(defaults.depthTexture.applyGaussianBlur).toBe(false);
  expect(defaults.dataFormatPreference).toEqual(["float32", "luminance-alpha"]);
});
