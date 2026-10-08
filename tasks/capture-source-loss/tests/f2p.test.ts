import * as THREE from "three";
import { afterEach, expect, it, vi } from "@xrblocks/devtools/test";
import type { SelectEndEvent } from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type {
  InteractionFrameInput,
  RaySourceInput,
} from "@xrblocks/source/interaction/InteractionTypes.ts";

afterEach(() => vi.unstubAllGlobals());

it("releases a lost slider capture so another source can finish a new drag", async () => {
  const { callbacks, interaction } = await createInteraction();
  const { UISlider } = await import(
    "@xrblocks/source/ui/components/UISlider.ts"
  );
  class RecordingSlider extends UISlider {
    readonly selectEnds: SelectEndEvent[] = [];

    override onObjectSelectEnd(event: SelectEndEvent): void {
      this.selectEnds.push(event);
      super.onObjectSelectEnd(event);
    }
  }
  const changes = vi.fn();
  const slider = new RecordingSlider({
    ariaLabel: "Volume",
    min: 0,
    max: 100,
    step: 1,
    value: 25,
    onChange: changes,
  });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(surface, slider);
  await callbacks.initScript(slider);
  const lost = createController(0, "left");
  const replacement = createController(1, "right");

  interaction.update(frame([ray(lost, true, surface, 0.25)]));
  interaction.update(frame([ray(lost, true, surface, 0.75)]));
  expect(slider.value).toBe(75);

  interaction.update(frame());
  expect(slider.value).toBe(25);
  expect(changes).not.toHaveBeenCalled();
  expect(slider.selectEnds).toHaveLength(1);
  expect(slider.selectEnds[0]).toMatchObject({
    completed: false,
    reason: "source-lost",
    source: { type: "controller-ray", handedness: "left" },
  });

  interaction.update(frame([ray(replacement, true, surface, 0.5)]));
  interaction.update(frame([ray(replacement, false, surface, 0.5)]));

  expect(slider.value).toBe(50);
  expect(changes).toHaveBeenCalledExactlyOnceWith(50);
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

function createController(
  id: number,
  handedness: "left" | "right",
): Controller {
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { connected: true, id, selected: false };
  controller.inputSource = { handedness };
  return controller;
}

function ray(
  controller: Controller,
  selected: boolean,
  surface: THREE.Object3D,
  u: number,
): RaySourceInput {
  controller.userData.selected = selected;
  const sourceRay = new THREE.Ray(
    new THREE.Vector3(u - 0.5, 0, 1),
    new THREE.Vector3(0, 0, -1),
  );
  return {
    controller,
    sourceType: "controller-ray",
    selected,
    ray: sourceRay,
    position: sourceRay.origin.clone(),
    orientation: new THREE.Quaternion(),
    intersections: [
      {
        distance: 1,
        object: surface,
        point: new THREE.Vector3(u - 0.5, 0, 0),
        uv: new THREE.Vector2(u, 0.5),
      },
    ],
  };
}

function frame(raySources: RaySourceInput[] = []): InteractionFrameInput {
  return { directTouches: [], raySources } as InteractionFrameInput;
}
