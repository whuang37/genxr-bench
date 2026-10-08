import * as THREE from "three";
import { expect, it } from "@xrblocks/devtools/test";

import { delayedSplatRuntime } from "./fixtures/splat-runtime.ts";

it("uses external ready splat bounds for horizontal placement", async () => {
  const bounds = new THREE.Box3(
    new THREE.Vector3(-0.25, 0, -0.25),
    new THREE.Vector3(0.25, 0.5, 0.25),
  );
  const runtime = await delayedSplatRuntime(bounds);
  const [{ ModelLoader }, { placeOnHorizontalSurface }] = await Promise.all([
    import("@xrblocks/source/utils/ModelLoader.ts"),
    import("@xrblocks/source/world/HorizontalPlacement.ts"),
  ]);

  try {
    const loading = new ModelLoader().loadSplat({ url: "" });
    await runtime.created;
    runtime.finish();
    const splat = await loading;

    const scene = new THREE.Scene();
    scene.add(splat);
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(0, 1.5, 0);
    camera.lookAt(0, 0, -1.5);
    camera.updateMatrixWorld(true);
    let elapsed = 0;
    const placed = await placeOnHorizontalSurface(
      splat,
      camera,
      scene,
      { get: () => [table()] } as never,
      undefined,
      {
        waitFrame: async () => {
          elapsed = 2;
        },
      } as never,
      { getElapsed: () => elapsed } as THREE.Timer,
      { seconds: 1 },
      3,
    );

    expect(placed).toBe(true);
    expect(splat.position.y).toBeCloseTo(0, 4);
    expect(splat.position.z).toBeLessThan(-0.1);
  } finally {
    runtime.restore();
  }
});

function table(): THREE.Object3D {
  const plane = new THREE.Object3D() as THREE.Object3D & {
    label: string;
    orientation: string;
    simulatorPlane: { polygon: THREE.Vector2[] };
  };
  plane.orientation = "horizontal";
  plane.label = "table";
  plane.position.set(0, 0, -1.5);
  plane.simulatorPlane = {
    polygon: [
      new THREE.Vector2(-2, -2),
      new THREE.Vector2(2, -2),
      new THREE.Vector2(2, 2),
      new THREE.Vector2(-2, 2),
    ],
  };
  plane.updateMatrixWorld(true);
  return plane;
}
