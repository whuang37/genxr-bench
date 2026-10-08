import * as THREE from "three";
import { expect, it, vi } from "@xrblocks/devtools/test";
import { Script } from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type { RaySourceInput } from "@xrblocks/source/interaction/InteractionTypes.ts";

class Owner extends Script {}

it("keeps separate objects independently manipulable", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const firstOwner = owner();
  const secondOwner = owner();
  const firstSurface = surface(firstOwner);
  const secondSurface = surface(secondOwner);
  await callbacks.initScript(firstOwner);
  await callbacks.initScript(secondOwner);
  const first = controller(0, "left");
  const second = controller(1, "right");

  interaction.update({
    directTouches: [],
    raySources: [
      ray(first, true, firstSurface, 0),
      ray(second, true, secondSurface, 2),
    ],
  });
  interaction.update({
    directTouches: [],
    raySources: [
      ray(first, true, firstSurface, 0.4),
      ray(second, true, secondSurface, 1.5),
    ],
  });

  expect(firstOwner.position.x).toBeCloseTo(0.4, 6);
  expect(secondOwner.position.x).toBeCloseTo(-0.5, 6);
});

it("allows the same object to start a new manipulation after release", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const target = owner();
  const firstSurface = surface(target);
  const secondSurface = surface(target);
  await callbacks.initScript(target);
  const first = controller(0, "left");
  const second = controller(1, "right");

  interaction.update({
    directTouches: [],
    raySources: [ray(first, true, firstSurface, 0)],
  });
  interaction.update({
    directTouches: [],
    raySources: [ray(first, false, firstSurface, 0.4)],
  });
  interaction.update({
    directTouches: [],
    raySources: [ray(second, true, secondSurface, 2)],
  });
  interaction.update({
    directTouches: [],
    raySources: [ray(second, true, secondSurface, 1.5)],
  });

  expect(target.position.x).toBeCloseTo(-0.1, 6);
});

it("allows two sources to scale one scale-enabled object", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const target = owner({ scale: true });
  const handle = surface(target);
  await callbacks.initScript(target);
  const primary = controller(0, "left");
  const auxiliary = controller(1, "right");

  interaction.update({
    directTouches: [],
    raySources: [ray(primary, true, handle, 0)],
  });
  interaction.update({
    directTouches: [],
    raySources: [
      ray(primary, true, handle, 0),
      ray(auxiliary, true, undefined, 1),
    ],
  });
  interaction.update({
    directTouches: [],
    raySources: [
      ray(primary, true, handle, -0.5),
      ray(auxiliary, true, undefined, 1.5),
    ],
  });

  expect(target.scale.x).toBeCloseTo(2, 6);
});

function owner({ scale = false }: { scale?: boolean } = {}): Owner {
  const value = new Owner();
  value.xb = { manipulation: { actions: { translate: true, scale } } };
  return value;
}

function surface(parent: Owner): THREE.Mesh {
  const value = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  value.xb = { manipulationHandle: { action: "translate" } };
  parent.add(value);
  return value;
}

function controller(id: number, handedness: "left" | "right"): Controller {
  const value = new THREE.Object3D() as Controller;
  value.userData = { connected: true, id, selected: false };
  value.inputSource = { handedness };
  return value;
}

function ray(
  source: Controller,
  selected: boolean,
  object: THREE.Object3D | undefined,
  x: number,
): RaySourceInput {
  const origin = new THREE.Vector3(x, 0, 0);
  return {
    controller: source,
    sourceType: "controller-ray",
    selected,
    ray: new THREE.Ray(origin, new THREE.Vector3(0, 0, -1)),
    position: origin,
    orientation: new THREE.Quaternion(),
    intersections: object
      ? [{ distance: 1, object, point: new THREE.Vector3(x, 0, -1) }]
      : [],
  };
}

async function createInteraction(
  callbacks: ScriptsManager,
): Promise<Interaction> {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const { Interaction } = await import(
    "@xrblocks/source/interaction/Interaction.ts"
  );
  return new Interaction({ callbacks });
}
