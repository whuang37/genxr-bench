import * as THREE from "three";

export function makePassRenderer(
  width = 64,
  height = 48,
  cameras: THREE.PerspectiveCamera[] = [],
) {
  const originalTarget = {
    name: "original target",
  } as unknown as THREE.WebGLRenderTarget;
  let currentTarget: THREE.WebGLRenderTarget | null = originalTarget;
  const drawCalls: Array<{
    camera: THREE.Camera;
    overrideMaterial: THREE.Material | null;
    scene: THREE.Object3D;
  }> = [];
  const targetCalls: Array<THREE.WebGLRenderTarget | null> = [];
  const size = new THREE.Vector2(width, height);
  const renderer = {
    getDrawingBufferSize(value: THREE.Vector2) {
      return value.copy(size);
    },
    getRenderTarget() {
      return currentTarget;
    },
    render(scene: THREE.Object3D, camera: THREE.Camera) {
      drawCalls.push({
        camera,
        overrideMaterial: (scene as THREE.Scene).overrideMaterial ?? null,
        scene,
      });
    },
    setDrawingBufferSize(nextWidth: number, nextHeight: number) {
      size.set(nextWidth, nextHeight);
    },
    setRenderTarget(target: THREE.WebGLRenderTarget | null) {
      currentTarget = target;
      targetCalls.push(target);
    },
    xr: {
      getCamera() {
        return { cameras };
      },
    },
  } as unknown as THREE.WebGLRenderer;

  return {
    drawCalls,
    originalTarget,
    renderer,
    setDrawingBufferSize(nextWidth: number, nextHeight: number) {
      size.set(nextWidth, nextHeight);
    },
    targetCalls,
    get currentTarget() {
      return currentTarget;
    },
  };
}

export function makeDepthTexture() {
  const texture = new THREE.DataTexture(
    new Uint8Array([128, 255, 0, 255]),
    1,
    1,
    THREE.RGBAFormat,
  );
  texture.needsUpdate = true;
  return texture;
}

export async function loadOcclusionModules() {
  const [pass, utils] = await Promise.all([
    import("@xrblocks/source/depth/occlusion/OcclusionPass.ts"),
    import("@xrblocks/source/depth/occlusion/OcclusionUtils.ts"),
  ]);

  return {
    OcclusionPass: pass.OcclusionPass,
    OcclusionUtils: utils.OcclusionUtils,
  };
}
