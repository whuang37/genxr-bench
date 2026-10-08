import * as THREE from "three";

import { expect, it, vi } from "@xrblocks/devtools/test";

Object.defineProperty(globalThis, "window", {
  value: { location: { search: "" } },
  configurable: true,
});

const { World } = await import("@xrblocks/source/world/World.ts");
const { WorldOptions } = await import("@xrblocks/source/world/WorldOptions.ts");
const { FollowObject } = await import(
  "@xrblocks/source/placement/FollowObject.ts"
);
const { FaceCamera } = await import("@xrblocks/source/placement/FaceCamera.ts");
const { VisibilityTransition } = await import(
  "@xrblocks/source/placement/VisibilityTransition.ts"
);
const { durationToMs } = await import(
  "@xrblocks/source/utils/TemporalPolyfill.ts"
);

function expectWorldQuaternion(
  object: THREE.Object3D,
  expected: THREE.Quaternion,
): void {
  expect(
    Math.abs(object.getWorldQuaternion(new THREE.Quaternion()).dot(expected)),
  ).toBeCloseTo(1);
}

it("keeps controller ray placement on ordinary detected surfaces", async () => {
  const world = new World();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 1, 1);
  await world.init({
    camera,
    options: new WorldOptions(),
    timer: new THREE.Timer(),
    waitFrame: { waitFrame: vi.fn() } as never,
  });
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 4),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  plane.position.z = -2;
  plane.updateMatrixWorld(true);
  world.planes = { get: () => [plane] } as never;
  const controller = new THREE.Object3D();
  controller.updateMatrixWorld(true);
  const placed = new THREE.Object3D();

  expect(world.placeOnSurface(placed, controller)).toBe(true);
  expect(placed.position.toArray()).toEqual([0, 0, -2]);
  expect(placed.quaternion.length()).toBeCloseTo(1);
  world.planes = undefined;
  world.dispose();
});

it("keeps FollowObject pose tracking correct under transformed parents", () => {
  const scene = new THREE.Scene();
  const targetParent = new THREE.Object3D();
  targetParent.position.set(3, -1, 2);
  targetParent.rotation.set(0.2, 0.5, -0.1);
  const target = new THREE.Object3D();
  target.position.set(1, 2, -3);
  target.rotation.set(-0.3, 0.1, 0.4);
  targetParent.add(target);
  const objectParent = new THREE.Object3D();
  objectParent.position.set(-4, 2, 1);
  objectParent.rotation.set(-0.2, -0.4, 0.3);
  const object = new THREE.Object3D();
  objectParent.add(object);
  scene.add(targetParent, objectParent);
  const positionOffset = new THREE.Vector3(-1, 0.5, 0.25);
  const rotationOffset = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-0.2, 0.15, 0.1),
  );
  const follow = new FollowObject({
    target,
    mode: "pose",
    positionOffset,
    rotationOffset,
  });
  object.add(follow);

  follow.update();

  expect(
    object
      .getWorldPosition(new THREE.Vector3())
      .distanceTo(
        target.getWorldPosition(new THREE.Vector3()).add(positionOffset),
      ),
  ).toBeCloseTo(0);
  expectWorldQuaternion(
    object,
    target.getWorldQuaternion(new THREE.Quaternion()).multiply(rotationOffset),
  );
});

it("keeps FaceCamera orientation correct under transformed parents", () => {
  const scene = new THREE.Scene();
  const cameraParent = new THREE.Object3D();
  cameraParent.position.set(4, 1, -2);
  cameraParent.rotation.set(0.1, 0.5, 0);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(0, 2, 5);
  cameraParent.add(camera);
  const objectParent = new THREE.Object3D();
  objectParent.position.set(-2, 1, 3);
  objectParent.rotation.set(-0.3, 0.2, 0.1);
  const object = new THREE.Object3D();
  object.position.set(1, -0.5, 2);
  objectParent.add(object);
  scene.add(cameraParent, objectParent);
  const faceCamera = new FaceCamera({ mode: "spherical", smoothing: 1 });
  object.add(faceCamera);
  faceCamera.init({ camera, timer: { getDelta: () => 1 } as THREE.Timer });
  const expected = new THREE.Object3D();
  expected.position.copy(object.getWorldPosition(new THREE.Vector3()));
  expected.lookAt(camera.getWorldPosition(new THREE.Vector3()));

  faceCamera.update();

  expectWorldQuaternion(object, expected.quaternion);
});

it("keeps visibility transitions reversible without replacing user scale", () => {
  const object = new THREE.Object3D();
  object.scale.set(2, 3, 4);
  const transition = new VisibilityTransition({ duration: 0.1 });
  object.add(transition);
  transition.init({ timer: { getDelta: () => 0.1 } as THREE.Timer });

  transition.hide();
  transition.update();
  expect(object.visible).toBe(false);
  expect(object.scale.toArray()).toEqual([0, 0, 0]);

  transition.show();
  transition.update();
  expect(object.visible).toBe(true);
  expect(object.scale.toArray()).toEqual([2, 3, 4]);
});

it("keeps duration conversion available to placement retry callers", () => {
  expect(durationToMs({ milliseconds: 250 })).toBe(250);
  expect(durationToMs({ seconds: 2, milliseconds: 5 })).toBe(2005);
  expect(durationToMs({ minutes: 1, seconds: 3 })).toBe(63_000);
});

it("keeps ordinary World surface placement inert when plane sensing is disabled", async () => {
  const world = new World();
  try {
    await world.init({
      camera: new THREE.PerspectiveCamera(),
      options: new WorldOptions(),
      timer: new THREE.Timer(),
      waitFrame: vi.fn(),
    });

    expect(
      world.placeOnSurface(new THREE.Object3D(), new THREE.Object3D()),
    ).toBe(false);
  } finally {
    world.dispose();
  }
});
