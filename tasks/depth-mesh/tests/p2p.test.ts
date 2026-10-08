import * as THREE from "three";

import { expect, it, it_session, vi } from "@xrblocks/devtools/test";

import { DepthTextures } from "@xrblocks/source/depth/DepthTextures.ts";
import { DepthOptions } from "@xrblocks/source/depth/DepthOptions.ts";

import { cpuDepth } from "./fixtures/depth-mesh-fixtures.ts";

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { location: { search: "" } },
});

const { Depth } = await import("@xrblocks/source/depth/Depth.ts");

function freshDepth() {
  Depth.instance = undefined;
  return new Depth();
}

it("keeps empty CPU depth reads safe before the first frame", () => {
  const depth = freshDepth();

  expect(depth.getDepth(0.5, 0.5)).toBe(0);
  expect(depth.getVertex(0.5, 0.5)).toBeNull();
  expect(depth.rawValueToMeters).toBe(0);
  expect(depth.getTexture(0)).toBeUndefined();
});

it("keeps CPU depth sampling clamped and measured in meters", () => {
  const depth = freshDepth();
  depth.width = 2;
  depth.height = 2;
  depth.depthArray[0] = new Float32Array([10, 20, 30, 40]);
  depth.cpuDepthData[0] = cpuDepth(
    new Float32Array([10, 20, 30, 40]),
    2,
    2,
    0.1,
  );
  depth.depthProjectionInverseMatrices[0] = new THREE.Matrix4();

  expect(depth.getDepth(-2, 4)).toBeCloseTo(1);
  expect(depth.getDepth(4, -2)).toBeCloseTo(4);
  expect(depth.getVertex(0, 1)?.toArray()).toEqual([-1, 1, -1]);
});

it("keeps packed CPU depth data on the retained Uint16 path", () => {
  const depth = freshDepth();
  const packed = cpuDepth(new Uint16Array([256, 513, 1024, 2048]), 2, 2, 0.01);
  const camera = new THREE.PerspectiveCamera();
  camera.updateMatrixWorld(true);
  depth.init(
    camera,
    new DepthOptions(),
    { xr: { getCamera: () => undefined } } as never,
    { register() {} } as never,
    new THREE.Scene(),
  );

  depth.updateCPUDepthData(packed, 0, "luminance-alpha");

  expect(depth.depthArray[0]).toBeInstanceOf(Uint16Array);
  expect(Array.from(depth.depthArray[0])).toEqual([256, 513, 1024, 2048]);
  expect(depth.getDepth(0, 1)).toBeCloseTo(2.56);
});

it("keeps depth options isolated while applying nested user overrides", () => {
  const first = new DepthOptions({
    depthMesh: { enabled: true, opacity: 0.35 },
    depthTexture: { enabled: true },
  });
  const second = new DepthOptions();

  expect(first.depthMesh.enabled).toBe(true);
  expect(first.depthMesh.opacity).toBeCloseTo(0.35);
  expect(first.depthMesh.ignoreEdgePixels).toBe(3);
  expect(first.depthTexture.enabled).toBe(true);
  expect(first.depthTexture.applyGaussianBlur).toBe(false);
  expect(second.depthMesh.enabled).toBe(false);
  expect(second.depthTexture.enabled).toBe(false);
});

it("keeps CPU texture formats and stereo views independent", () => {
  const textures = new DepthTextures(
    new DepthOptions({ depthTexture: { enabled: true } }),
  );
  textures.updateData(
    cpuDepth(new Uint16Array([258, 772]), 2, 1),
    0,
    "luminance-alpha",
  );
  textures.updateData(
    cpuDepth(new Float32Array([5, 6, 7, 8]), 2, 2),
    1,
    "float32",
  );

  const left = textures.get(0) as THREE.DataTexture;
  const right = textures.get(1) as THREE.DataTexture;
  expect(left).not.toBe(right);
  expect(left.format).toBe(THREE.RGFormat);
  expect(left.type).toBe(THREE.UnsignedByteType);
  expect(Array.from(left.image.data as Uint8Array)).toEqual([2, 1, 4, 3]);
  expect(right.format).toBe(THREE.RedFormat);
  expect(right.type).toBe(THREE.FloatType);
  expect(Array.from(right.image.data as Float32Array)).toEqual([5, 6, 7, 8]);
});

it("continues to reuse and resize CPU depth textures for their matching frame shape", () => {
  const textures = new DepthTextures(
    new DepthOptions({ depthTexture: { enabled: true } }),
  );
  textures.updateData(
    cpuDepth(new Float32Array([1, 2, 3, 4]), 2, 2),
    0,
    "float32",
  );
  const first = textures.get(0) as THREE.DataTexture;
  const dispose = vi.spyOn(first, "dispose");

  textures.updateData(
    cpuDepth(new Float32Array([8, 6, 4, 2]), 2, 2),
    0,
    "float32",
  );

  expect(textures.get(0)).toBe(first);
  expect(Array.from(first.image.data as Float32Array)).toEqual([8, 6, 4, 2]);
  expect(dispose).not.toHaveBeenCalled();

  textures.updateData(
    cpuDepth(new Float32Array([1, 2, 3, 4, 5, 6]), 3, 2),
    0,
    "float32",
  );
  const resized = textures.get(0) as THREE.DataTexture;

  expect(resized).not.toBe(first);
  expect(dispose).toHaveBeenCalledOnce();
  expect(resized.image.width).toBe(3);
  expect(resized.image.height).toBe(2);
});

it_session(
  "keeps the built SDK CPU depth reference available to applications",
  async (session) => {
    const inspection = await session.objects.inspect({
      tag: "depth-reference",
    });

    expect(inspection.state).toMatchObject({
      error: null,
      topLeftMeters: 1,
      bottomRightMeters: 4,
      topLeftVertex: [-1, 1, -1],
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
