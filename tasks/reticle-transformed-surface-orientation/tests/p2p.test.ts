import * as THREE from "three";
import { afterEach, expect, it, vi } from "@xrblocks/devtools/test";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { RaySourceInput } from "@xrblocks/source/interaction/InteractionTypes.ts";
import type { Reticle } from "@xrblocks/source/interaction/reticle/Reticle.ts";

afterEach(() => vi.unstubAllGlobals());

it("keeps an ordinary surface reticle, press state, and lost-ray clearing", async () => {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [{ Interaction }, { Reticle }] = await Promise.all([
    import("@xrblocks/source/interaction/Interaction.ts"),
    import("@xrblocks/source/interaction/reticle/Reticle.ts"),
  ]);
  const scene = new THREE.Scene();
  const interaction = new Interaction({
    callbacks: new ScriptsManager(async () => {}),
    scene,
  });
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  surface.position.z = -1;
  scene.add(surface);
  interaction.registerHitSurface(surface, surface);
  scene.updateMatrixWorld(true);
  const reticle = new Reticle(0);
  const controller = createController(reticle);

  interaction.update({
    directTouches: [],
    raySources: [ray(controller, false)],
  });
  expect(reticle.visible).toBe(true);
  expect(reticle.position.distanceTo(new THREE.Vector3(0, 0, -1))).toBeLessThan(
    1e-6,
  );
  expect(
    new THREE.Vector3(0, 0, 1)
      .applyQuaternion(reticle.quaternion)
      .dot(new THREE.Vector3(0, 0, 1)),
  ).toBeGreaterThan(0.999);
  interaction.update({
    directTouches: [],
    raySources: [ray(controller, true)],
  });
  expect(reticle.scale.x).toBeLessThan(1);
  interaction.update({ directTouches: [], raySources: [] });
  expect(reticle.visible).toBe(false);
  reticle.dispose();
  surface.geometry.dispose();
  surface.material.dispose();
});

it("keeps a camera-facing hover reticle aligned as its ray moves", async () => {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [{ Interaction }, { Reticle }] = await Promise.all([
    import("@xrblocks/source/interaction/Interaction.ts"),
    import("@xrblocks/source/interaction/reticle/Reticle.ts"),
  ]);
  const scene = new THREE.Scene();
  const interaction = new Interaction({
    callbacks: new ScriptsManager(async () => {}),
    scene,
  });
  const hoverTarget = new THREE.Object3D();
  hoverTarget.raycast = (raycaster, hits) => {
    hits.push({
      distance: 1,
      object: hoverTarget,
      point: raycaster.ray.at(1, new THREE.Vector3()),
    });
  };
  scene.add(hoverTarget);
  interaction.registerHitSurface(hoverTarget, hoverTarget);
  const reticle = new Reticle(0);
  const controller = createController(reticle);

  for (const [origin, direction] of [
    [new THREE.Vector3(), new THREE.Vector3(0, 0, -1)],
    [
      new THREE.Vector3(0.3, 0.2, 0.1),
      new THREE.Vector3(-0.25, -0.1, -1).normalize(),
    ],
  ]) {
    interaction.update({
      directTouches: [],
      raySources: [movingRay(controller, origin, direction)],
    });
    expect(reticle.visible).toBe(true);
    expect(
      reticle.position.distanceTo(origin.clone().add(direction)),
    ).toBeLessThan(1e-5);
    expect(
      new THREE.Vector3(0, 0, 1)
        .applyQuaternion(reticle.quaternion)
        .dot(direction.clone().negate()),
    ).toBeGreaterThan(0.999);
  }
  reticle.dispose();
});

function createController(reticle: Reticle): Controller {
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { id: 0, connected: true, selected: false };
  controller.inputSource = { handedness: "right" };
  controller.reticle = reticle;
  return controller;
}
function ray(controller: Controller, selected: boolean): RaySourceInput {
  controller.userData.selected = selected;
  return {
    controller,
    selected,
    sourceType: "controller-ray",
    orientation: new THREE.Quaternion(),
    position: new THREE.Vector3(),
    ray: new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1)),
  };
}
function movingRay(
  controller: Controller,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
): RaySourceInput {
  return {
    controller,
    selected: false,
    sourceType: "controller-ray",
    orientation: new THREE.Quaternion(),
    position: origin,
    ray: new THREE.Ray(origin, direction),
  };
}
