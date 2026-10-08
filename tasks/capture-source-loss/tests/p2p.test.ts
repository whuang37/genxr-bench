import * as THREE from "three";
import { afterEach, expect, it, vi } from "@xrblocks/devtools/test";
import {
  type HoverEvent,
  Script,
  type SelectEndEvent,
} from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type {
  InteractionFrameInput,
  RaySourceInput,
} from "@xrblocks/source/interaction/InteractionTypes.ts";

class Recorder extends Script {
  readonly hoverEnters: HoverEvent[] = [];
  readonly hoverExits: HoverEvent[] = [];
  readonly selectEnds: SelectEndEvent[] = [];

  override onHoverEnter(event: HoverEvent): void {
    this.hoverEnters.push(event);
  }

  override onHoverExit(event: HoverEvent): void {
    this.hoverExits.push(event);
  }

  override onObjectSelectEnd(event: SelectEndEvent): void {
    this.selectEnds.push(event);
  }
}

afterEach(() => vi.unstubAllGlobals());

it("keeps a connected ray selection completed by normal release", async () => {
  const { callbacks, interaction } = await createInteraction();
  const target = new Recorder();
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(surface, target);
  await callbacks.initScript(target);
  const controller = createController(0);

  interaction.update(frame([ray(controller, true, surface)]));
  interaction.update(frame([ray(controller, false, surface)]));

  expect(target.selectEnds).toHaveLength(1);
  expect(target.selectEnds[0]).toMatchObject({
    completed: true,
    reason: "released",
  });
});

it("keeps another source selected when the first source disappears", async () => {
  const { callbacks, interaction } = await createInteraction();
  const lostTarget = new Recorder();
  const connectedTarget = new Recorder();
  const lostSurface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  const connectedSurface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(lostSurface, lostTarget);
  interaction.registerHitSurface(connectedSurface, connectedTarget);
  await callbacks.initScript(lostTarget);
  await callbacks.initScript(connectedTarget);
  const lost = createController(0);
  const connected = createController(1);

  interaction.update(
    frame([
      ray(lost, true, lostSurface),
      ray(connected, true, connectedSurface),
    ]),
  );
  interaction.update(frame([ray(connected, true, connectedSurface)]));

  expect(connectedTarget.selectEnds).toHaveLength(0);
  expect(interaction.isSelectingAt(connectedTarget)).toBe(true);

  interaction.update(frame([ray(connected, false, connectedSurface)]));
  expect(connectedTarget.selectEnds).toHaveLength(1);
  expect(connectedTarget.selectEnds[0]).toMatchObject({
    completed: true,
    reason: "released",
  });
});

it("clears hover and reticle state owned by a lost source", async () => {
  const { callbacks, interaction } = await createInteraction();
  const { Reticle } = await import(
    "@xrblocks/source/interaction/reticle/Reticle.ts"
  );
  const target = new Recorder();
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(surface, target);
  await callbacks.initScript(target);
  const controller = createController(0);
  controller.reticle = new Reticle();
  controller.reticle.rotationSmoothing = 0;

  interaction.update(frame([ray(controller, false, surface)]));
  expect(target.hoverEnters).toHaveLength(1);
  expect(controller.reticle.visible).toBe(true);

  interaction.update(frame());
  interaction.update(frame());

  expect(target.hoverExits).toHaveLength(1);
  expect(controller.reticle.visible).toBe(false);
  controller.reticle.dispose();
});

async function createInteraction(): Promise<{
  callbacks: ScriptsManager;
  interaction: Interaction;
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
  return { callbacks, interaction: new Interaction({ callbacks }) };
}

function createController(id: number): Controller {
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { connected: true, id, selected: false };
  controller.inputSource = { handedness: "right" };
  return controller;
}

function ray(
  controller: Controller,
  selected: boolean,
  surface: THREE.Object3D,
): RaySourceInput {
  controller.userData.selected = selected;
  return {
    controller,
    sourceType: "controller-ray",
    selected,
    ray: new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1)),
    position: new THREE.Vector3(),
    orientation: new THREE.Quaternion(),
    intersections: [
      {
        distance: 1,
        object: surface,
        point: new THREE.Vector3(0, 0, -1),
      },
    ],
  };
}

function frame(raySources: RaySourceInput[] = []): InteractionFrameInput {
  return { directTouches: [], raySources } as InteractionFrameInput;
}
