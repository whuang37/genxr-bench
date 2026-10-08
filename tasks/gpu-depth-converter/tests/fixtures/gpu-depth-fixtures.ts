import * as THREE from "three";

import type { Depth } from "@xrblocks/source/depth/Depth.ts";
import type { DepthOptions } from "@xrblocks/source/depth/DepthOptions.ts";

export interface RendererHarness {
  renderer: THREE.WebGLRenderer;
}

export function makeRenderer(): RendererHarness {
  return {
    renderer: {
      shadowMap: { enabled: false, type: null },
      xr: {
        enabled: true,
        getCamera() {
          return undefined;
        },
      },
    } as unknown as THREE.WebGLRenderer,
  };
}

export function gpuDepth(
  texture: WebGLTexture,
  width: number,
  height: number,
  rawValueToMeters: number,
): XRWebGLDepthInformation {
  return {
    height,
    rawValueToMeters,
    texture,
    width,
  } as XRWebGLDepthInformation;
}

export function cpuDepth(
  values: Float32Array,
  width: number,
  height: number,
  rawValueToMeters: number,
): XRCPUDepthInformation {
  return {
    data: values.buffer,
    height,
    rawValueToMeters,
    width,
  } as XRCPUDepthInformation;
}

export async function loadDepthModules() {
  if (!("window" in globalThis)) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { search: "" } },
    });
  }

  const [{ Depth }, { DepthOptions }] = await Promise.all([
    import("@xrblocks/source/depth/Depth.ts"),
    import("@xrblocks/source/depth/DepthOptions.ts"),
  ]);
  return { Depth, DepthOptions };
}

export function createDepth(
  DepthClass: typeof Depth,
  options: DepthOptions,
  harness: RendererHarness,
): Depth {
  DepthClass.instance = undefined;
  const depth = new DepthClass();
  const camera = new THREE.PerspectiveCamera();
  camera.updateMatrixWorld(true);
  depth.init(
    camera,
    options,
    harness.renderer,
    { register() {} } as never,
    new THREE.Scene(),
  );
  return depth;
}
