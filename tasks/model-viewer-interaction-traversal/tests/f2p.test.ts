import * as THREE from "three";

import { expect, it } from "@xrblocks/devtools/test";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { HoverEvent } from "@xrblocks/source/core/Script.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { RaySourceInput } from "@xrblocks/source/interaction/InteractionTypes.ts";

Object.defineProperty(globalThis, "window", {
  value: {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  },
  configurable: true,
});

const [{ ModelViewer }, { Interaction }] = await Promise.all([
  import("@xrblocks/source/ui/model/ModelViewer.ts"),
  import("@xrblocks/source/interaction/Interaction.ts"),
]);

it("keeps built-in move and rotate controls owned by the public viewer after replacement", async () => {
  const scene = new THREE.Scene();
  const callbacks = new ScriptsManager(async () => {});
  const interaction = new Interaction({ callbacks, scene });
  const viewer = new RecordingViewer();
  viewer.setContent(content(1));
  scene.add(viewer);
  await callbacks.initScript(viewer);
  await viewer.init({
    depth: { occludableShaders: new Set() },
    interaction,
    scene,
    renderer: {},
    registry: {},
    timer: new THREE.Timer(),
  } as never);
  viewer.setContent(content(2));
  scene.updateMatrixWorld(true);

  const move = controller(0);
  const rotate = controller(1);
  interaction.update({
    directTouches: [],
    raySources: [ray(move, [0, 3, 0], [0, -1, 0])],
  });
  interaction.update({
    directTouches: [],
    raySources: [ray(rotate, [0, 0, 3], [0, 0, -1])],
  });

  expect(viewer.hoverEvents).toHaveLength(2);
  for (const event of viewer.hoverEvents) expectPublicEvent(event, viewer);
  viewer.dispose();
});

class RecordingViewer extends ModelViewer {
  hoverEvents: HoverEvent[] = [];
  override onHoverEnter(event: HoverEvent): void {
    this.hoverEvents.push(event);
  }
}
function expectPublicEvent(event: HoverEvent, viewer: ModelViewer): void {
  expect(event.target).toBe(viewer);
}

function content(size: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshBasicMaterial(),
  );
}

function controller(id: number): Controller {
  const value = new THREE.Object3D() as Controller;
  value.userData = { connected: true, id, selected: false };
  value.inputSource = { handedness: "right" };
  return value;
}

function ray(
  source: Controller,
  origin: number[],
  direction: number[],
): RaySourceInput {
  const position = new THREE.Vector3(...origin);
  return {
    controller: source,
    sourceType: "controller-ray",
    selected: false,
    ray: new THREE.Ray(position, new THREE.Vector3(...direction)),
    position,
    orientation: new THREE.Quaternion(),
  };
}
