import * as THREE from "three";
import { expect, it, vi } from "@xrblocks/devtools/test";
import { Script } from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type { RaySourceInput } from "@xrblocks/source/interaction/InteractionTypes.ts";
import type { ManipulationEvent } from "@xrblocks/source/interaction/manipulation/ManipulationTypes.ts";

class DraggableObject extends Script {
  readonly events: ManipulationEvent[] = [];
  override onObjectManipulate(event: ManipulationEvent): void {
    this.events.push(event);
  }
}

it("ends a released primary hand cleanly and lets a new hand acquire the model", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const owner = new DraggableObject();
  owner.xb = { manipulation: { actions: { translate: true, scale: true } } };
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  owner.add(surface);
  await callbacks.initScript(owner);
  const primary = controller(0, "left");
  const auxiliary = controller(1, "right");
  const replacement = controller(2, "right");

  update(interaction, [ray(primary, true, 0, surface)]);
  update(interaction, [
    ray(primary, true, 0, surface),
    ray(auxiliary, true, 1),
  ]);
  update(interaction, [
    ray(primary, true, -0.25, surface),
    ray(auxiliary, true, 1.25),
  ]);
  update(interaction, [
    ray(primary, false, -0.25, surface),
    ray(auxiliary, true, 1.25),
  ]);

  const releasedPosition = owner.getWorldPosition(new THREE.Vector3());
  expect(interaction.isManipulating(owner)).toBe(false);
  expect(
    owner.events.some(
      ({ action, phase }) => action === "scale" && phase === "end",
    ),
  ).toBe(true);

  update(interaction, [ray(replacement, true, 2, surface)]);
  update(interaction, [ray(replacement, true, 2.3, surface)]);
  update(interaction, [ray(replacement, false, 2.3, surface)]);

  expect(
    owner.getWorldPosition(new THREE.Vector3()).x - releasedPosition.x,
  ).toBeCloseTo(0.3, 6);
  expect(
    owner.events.filter(
      ({ action, phase }) => action === "translate" && phase === "start",
    ),
  ).toHaveLength(2);
  expect(interaction.isManipulating(owner)).toBe(false);
});

function controller(id: number, handedness: "left" | "right"): Controller {
  const value = new THREE.Object3D() as Controller;
  value.userData = { connected: true, id, selected: false };
  value.inputSource = { handedness };
  return value;
}

function ray(
  source: Controller,
  selected: boolean,
  x: number,
  object?: THREE.Object3D,
): RaySourceInput {
  source.userData.selected = selected;
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

function update(interaction: Interaction, raySources: RaySourceInput[]): void {
  interaction.update({ directTouches: [], raySources });
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
