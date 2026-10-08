import * as THREE from "three";
import { vi } from "vitest";

import type { DepthMesh } from "@xrblocks/source/depth/DepthMesh.ts";
import type { FaceRecognizer } from "@xrblocks/source/world/faces/FaceRecognizer.ts";

vi.mock(
  "@xrblocks/source/world/faces/backends/MediaPipeFaceBackend.ts",
  () => ({
    MediaPipeFaceBackend: class {
      async run(surface: THREE.Mesh) {
        const result = new THREE.Object3D();
        result.position.fromBufferAttribute(
          surface.geometry.attributes.position,
          0,
        );
        surface.localToWorld(result.position);
        return [result];
      }

      dispose(): void {}
    },
  }),
);

export function cpuDepth(
  value: number,
  width = 2,
  height = 2,
): XRCPUDepthInformation {
  return {
    data: new Float32Array(width * height).fill(value).buffer,
    height,
    rawValueToMeters: 1,
    width,
  } as XRCPUDepthInformation;
}

export async function createDepthMesh(): Promise<{
  depthOptions: import("@xrblocks/source/depth/DepthOptions.ts").DepthOptions;
  mesh: DepthMesh;
}> {
  installWindow();
  const [{ DepthMesh }, { DepthOptions }] = await Promise.all([
    import("@xrblocks/source/depth/DepthMesh.ts"),
    import("@xrblocks/source/depth/DepthOptions.ts"),
  ]);
  const depthOptions = new DepthOptions({
    enabled: true,
    depthMesh: {
      depthFullResolution: 4,
      ignoreEdgePixels: 0,
      useDownsampledGeometry: true,
      updateFullResolutionGeometry: false,
    },
  });
  return { depthOptions, mesh: new DepthMesh(depthOptions, 2, 2) };
}

export async function createDetectionHarness(): Promise<{
  mesh: DepthMesh;
  recognizer: FaceRecognizer;
}> {
  installWindow();
  const { depthOptions, mesh } = await createDepthMesh();
  const [{ FaceRecognizer }, { WorldOptions }] = await Promise.all([
    import("@xrblocks/source/world/faces/FaceRecognizer.ts"),
    import("@xrblocks/source/world/WorldOptions.ts"),
  ]);
  const recognizer = new FaceRecognizer();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10);
  camera.updateMatrixWorld(true);
  recognizer.init({
    options: new WorldOptions().enableFaceDetection(),
    deviceCamera: { simulatorCamera: camera } as never,
    depth: { depthMesh: mesh, options: depthOptions } as never,
    camera,
    renderer: { xr: { getCamera: () => null } } as never,
  });
  return { mesh, recognizer };
}

export function createPhysicsHarness() {
  const createdColliders: Array<{ handle: number; vertices: number[] }> = [];
  const removedColliders: Array<{ handle: number; vertices: number[] }> = [];
  const translations: number[][] = [];
  let nextHandle = 1;
  const rigidBody = {
    setRotation() {},
    setTranslation(translation: THREE.Vector3) {
      translations.push(translation.toArray());
    },
  };
  const RAPIER = {
    ColliderDesc: {
      trimesh(vertices: Float32Array) {
        return {
          setDensity() {
            return this;
          },
          vertices: Array.from(vertices),
        };
      },
    },
    RigidBodyDesc: {
      fixed() {
        return {
          setRotation() {
            return this;
          },
          setTranslation() {
            return this;
          },
        };
      },
    },
  };
  const world = {
    createCollider(shape: { vertices: number[] }) {
      const collider = { handle: nextHandle++, vertices: shape.vertices };
      createdColliders.push(collider);
      return collider;
    },
    createRigidBody() {
      return rigidBody;
    },
    removeCollider(collider: { handle: number; vertices: number[] }) {
      removedColliders.push(collider);
    },
  };
  return {
    RAPIER: RAPIER as never,
    createdColliders,
    removedColliders,
    translations,
    world: world as never,
  };
}

function installWindow(): void {
  if ("window" in globalThis) return;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener() {},
      location: { search: "" },
      removeEventListener() {},
    },
  });
}
