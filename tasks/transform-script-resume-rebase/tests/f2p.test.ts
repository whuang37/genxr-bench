import * as THREE from "three";

import { expect, it, vi } from "@xrblocks/devtools/test";
import { Script } from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type { RaySourceInput } from "@xrblocks/source/interaction/InteractionTypes.ts";
import { FollowHead } from "@xrblocks/source/placement/FollowHead.ts";
import { FollowObject } from "@xrblocks/source/placement/FollowObject.ts";

class Movable extends Script {}

it("keeps a nested head follower at the released pose, then follows from its new camera-space baseline", async () => {
  const { callbacks, interaction, scene } = await harness();
  const camera = new THREE.PerspectiveCamera();
  const parent = new THREE.Group();
  parent.position.set(3, -1, 2);
  parent.rotateY(0.35);
  const { owner, handle } = movable();
  const follow = new FollowHead({
    offset: new THREE.Vector3(0, 0, -1),
    smoothing: 1,
  });
  owner.add(handle, follow);
  parent.add(owner);
  scene.add(camera, parent);
  follow.init({ camera, timer: { getDelta: () => 1 } as THREE.Timer });
  follow.update();
  await callbacks.initScript(owner);

  const source = controller();
  update(interaction, source, handle, false, 0);
  update(interaction, source, handle, true, 0);
  update(interaction, source, handle, true, 2);
  const held = worldPosition(owner);
  camera.position.set(1, 0.5, 0);
  camera.rotateY(0.4);
  follow.update();
  expect(worldPosition(owner).distanceTo(held)).toBeLessThan(1e-5);
  update(interaction, source, handle, false, 2);
  const firstRelease = worldPosition(owner);

  const cameraBeforeMove = camera.matrixWorld.clone();
  camera.position.add(new THREE.Vector3(-0.6, 0.3, 0.2));
  camera.rotateY(-0.25);
  camera.updateMatrixWorld(true);
  follow.update();
  const expectedAfterFirstRelease = firstRelease
    .clone()
    .applyMatrix4(
      camera.matrixWorld.clone().multiply(cameraBeforeMove.invert()),
    );
  expect(
    worldPosition(owner).distanceTo(expectedAfterFirstRelease),
  ).toBeLessThan(1e-5);

  drag(interaction, source, handle, 2, 4);
  const secondRelease = worldPosition(owner);
  const secondCameraBeforeMove = camera.matrixWorld.clone();
  camera.position.add(new THREE.Vector3(-0.6, 0.3, 0.2));
  camera.rotateY(-0.25);
  camera.updateMatrixWorld(true);
  follow.update();
  const expected = secondRelease
    .clone()
    .applyMatrix4(
      camera.matrixWorld.clone().multiply(secondCameraBeforeMove.invert()),
    );
  expect(worldPosition(owner).distanceTo(expected)).toBeLessThan(1e-5);
});

it("rebases each FollowObject mode from the released world relationship", () => {
  for (const mode of ["position", "rotation", "pose"] as const) {
    const scene = new THREE.Scene();
    const targetParent = new THREE.Group();
    const ownerParent = new THREE.Group();
    targetParent.position.set(-2, 1, 0.5);
    targetParent.rotateY(-0.4);
    ownerParent.position.set(1, -0.5, 2);
    ownerParent.rotateX(0.2);
    const target = new THREE.Object3D();
    const owner = new THREE.Object3D();
    target.position.set(0.4, 0.2, -0.7);
    owner.position.set(-0.3, 0.6, -1.1);
    owner.quaternion.setFromEuler(new THREE.Euler(0.15, 0.3, -0.2));
    targetParent.add(target);
    ownerParent.add(owner);
    scene.add(targetParent, ownerParent);
    const follow = new FollowObject({ target, mode });
    owner.add(follow);

    follow.suspend();
    const releasedPosition = worldPosition(owner);
    const releasedRotation = worldQuaternion(owner);
    targetParent.position.add(new THREE.Vector3(0.8, -0.3, 0.4));
    targetParent.rotateY(0.45);
    follow.update();
    expect(worldPosition(owner).distanceTo(releasedPosition)).toBeLessThan(
      1e-5,
    );
    expect(
      quaternionDistance(worldQuaternion(owner), releasedRotation),
    ).toBeLessThan(1e-5);

    follow.resume();
    const targetAtRelease = worldPosition(target);
    const targetRotationAtRelease = worldQuaternion(target);
    const positionOffset = releasedPosition.clone().sub(targetAtRelease);
    const rotationOffset = targetRotationAtRelease
      .clone()
      .invert()
      .multiply(releasedRotation);
    target.position.add(new THREE.Vector3(-0.5, 0.4, 0.2));
    target.rotateX(-0.35);
    follow.update();

    if (mode !== "rotation") {
      expect(
        worldPosition(owner).distanceTo(
          worldPosition(target).add(positionOffset),
        ),
      ).toBeLessThan(1e-5);
    }
    if (mode !== "position") {
      const expected = worldQuaternion(target).multiply(rotationOffset);
      expect(quaternionDistance(worldQuaternion(owner), expected)).toBeLessThan(
        1e-5,
      );
    }
  }
});

function movable(): { owner: Movable; handle: THREE.Mesh } {
  const owner = new Movable();
  owner.xb = { manipulation: { actions: { translate: true } } };
  const handle = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  handle.xb = { manipulationHandle: { action: "translate" } };
  return { owner, handle };
}

function controller(): Controller {
  const source = new THREE.Object3D() as Controller;
  source.userData = { connected: true, id: 0, selected: false };
  source.inputSource = { handedness: "right" };
  return source;
}

function drag(
  interaction: Interaction,
  source: Controller,
  surface: THREE.Object3D,
  from: number,
  to: number,
): void {
  update(interaction, source, surface, false, from);
  update(interaction, source, surface, true, from);
  update(interaction, source, surface, true, to);
  update(interaction, source, surface, false, to);
}

function update(
  interaction: Interaction,
  source: Controller,
  surface: THREE.Object3D,
  selected: boolean,
  x: number,
): void {
  source.userData.selected = selected;
  const origin = new THREE.Vector3(x, 0, 0);
  const input: RaySourceInput = {
    controller: source,
    sourceType: "controller-ray",
    selected,
    ray: new THREE.Ray(origin, new THREE.Vector3(0, 0, -1)),
    position: origin,
    orientation: new THREE.Quaternion(),
    intersections: [
      {
        distance: 1,
        object: surface,
        point: new THREE.Vector3(x, 0, -1),
      },
    ],
  };
  interaction.update({ directTouches: [], raySources: [input] });
}

function worldPosition(object: THREE.Object3D): THREE.Vector3 {
  return object.getWorldPosition(new THREE.Vector3());
}

function worldQuaternion(object: THREE.Object3D): THREE.Quaternion {
  return object.getWorldQuaternion(new THREE.Quaternion());
}

function quaternionDistance(
  left: THREE.Quaternion,
  right: THREE.Quaternion,
): number {
  return 1 - Math.abs(left.dot(right));
}

async function harness(): Promise<{
  callbacks: ScriptsManager;
  interaction: Interaction;
  scene: THREE.Scene;
}> {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const { Interaction } = await import(
    "@xrblocks/source/interaction/Interaction.ts"
  );
  const callbacks = new ScriptsManager(async () => {});
  const scene = new THREE.Scene();
  return {
    callbacks,
    interaction: new Interaction({ callbacks, scene }),
    scene,
  };
}
