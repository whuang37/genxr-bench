import * as THREE from "three";

import type { Depth } from "@xrblocks/source/depth/Depth.ts";
import type { DepthOptions } from "@xrblocks/source/depth/DepthOptions.ts";

export async function loadDepthModules() {
  if (!("window" in globalThis)) {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { search: "" } },
    });
  }
  const [{ Depth }, { DepthOptions }, { DepthTextures }] = await Promise.all([
    import("@xrblocks/source/depth/Depth.ts"),
    import("@xrblocks/source/depth/DepthOptions.ts"),
    import("@xrblocks/source/depth/DepthTextures.ts"),
  ]);
  return { Depth, DepthOptions, DepthTextures };
}

export interface RendererHarness {
  readbackCalls: number;
  renderer: THREE.WebGLRenderer;
}

export function createDepth(
  DepthClass: typeof Depth,
  options: DepthOptions,
  harness: RendererHarness,
): Depth {
  DepthClass.instance = undefined;
  const depth = new DepthClass();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(4, 5, 6);
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

export function makeRenderer(
  binding: { getDepthInformation(view: XRView): unknown } = {
    getDepthInformation() {
      return undefined;
    },
  },
  readbackPixels?: Float32Array,
): RendererHarness {
  const properties = new Map<THREE.Texture, Record<string, unknown>>();
  let renderTarget: THREE.WebGLRenderTarget | null = null;
  const harness = {
    readbackCalls: 0,
    renderer: {
      getRenderTarget() {
        return renderTarget;
      },
      properties: {
        get(texture: THREE.Texture) {
          let value = properties.get(texture);
          if (!value) {
            value = {};
            properties.set(texture, value);
          }
          return value;
        },
      },
      readRenderTargetPixels(
        _target: THREE.WebGLRenderTarget,
        _x: number,
        _y: number,
        _width: number,
        _height: number,
        pixels: Float32Array,
      ) {
        harness.readbackCalls += 1;
        if (readbackPixels) pixels.set(readbackPixels);
      },
      render() {},
      setRenderTarget(nextTarget: THREE.WebGLRenderTarget | null) {
        renderTarget = nextTarget;
      },
      shadowMap: { enabled: false, type: null },
      xr: {
        enabled: true,
        getBinding: () => binding,
        getCamera: () => undefined,
        getReferenceSpace: () => ({}),
      },
    } as unknown as THREE.WebGLRenderer,
  };
  return harness;
}

export function gpuDepth(
  texture: WebGLTexture,
  rawValueToMeters: number,
  width = 2,
  height = 2,
): XRWebGLDepthInformation {
  return {
    texture,
    width,
    height,
    rawValueToMeters,
  } as XRWebGLDepthInformation;
}

export function cpuDepth(
  values: Float32Array,
  rawValueToMeters = 1,
  width = 2,
  height = 2,
): XRCPUDepthInformation {
  return {
    width,
    height,
    data: values.buffer,
    rawValueToMeters,
  } as XRCPUDepthInformation;
}
