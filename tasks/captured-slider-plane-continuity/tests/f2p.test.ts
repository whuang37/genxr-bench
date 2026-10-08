import * as THREE from "three";
import { expect, it, vi } from "@xrblocks/devtools/test";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type { RaySourceInput } from "@xrblocks/source/interaction/InteractionTypes.ts";

it("continues a captured slider drag after its surface moves out from under the ray", async () => {
  const { callbacks, interaction } = await createInteraction();
  const { UISlider } = await import(
    "@xrblocks/source/ui/components/UISlider.ts"
  );
  const inputs = vi.fn();
  const changes = vi.fn();
  const slider = new UISlider({
    ariaLabel: "Volume",
    min: 0,
    max: 100,
    step: 1,
    value: 0,
    onInput: inputs,
    onChange: changes,
  });
  const parent = new THREE.Group();
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(2, 1));
  parent.add(surface);
  interaction.registerHitSurface(surface, slider);
  await callbacks.initScript(slider);
  const source = controller();

  interaction.update(frame(ray(source, true, hit(surface, 0.25), -0.5)));
  parent.position.x = 0.5;
  interaction.update(frame(ray(source, true, undefined, 0.5)));

  expect(slider.value).toBe(50);
  expect(inputs).toHaveBeenLastCalledWith(50);

  interaction.update(frame(ray(source, true, undefined, 5)));
  expect(slider.value).toBe(100);
  expect(inputs).toHaveBeenLastCalledWith(100);

  interaction.update(frame(ray(source, true, undefined, -5)));
  expect(slider.value).toBe(0);
  expect(inputs).toHaveBeenLastCalledWith(0);

  interaction.update(frame(ray(source, true, undefined, 5)));
  expect(slider.value).toBe(100);
  expect(inputs).toHaveBeenLastCalledWith(100);

  interaction.update(frame(ray(source, false, undefined, 5)));
  expect(changes).toHaveBeenCalledExactlyOnceWith(100);
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

function controller(): Controller {
  const value = new THREE.Object3D() as Controller;
  value.userData = { id: 0, connected: true, selected: false };
  value.inputSource = { handedness: "right" };
  return value;
}

function hit(object: THREE.Object3D, u: number): THREE.Intersection {
  return {
    distance: 1,
    object,
    point: new THREE.Vector3(0, 0, 0),
    uv: new THREE.Vector2(u, 0.5),
  };
}

function ray(
  source: Controller,
  selected: boolean,
  intersection: THREE.Intersection | undefined,
  localX: number,
): RaySourceInput {
  source.userData.selected = selected;
  const sourceRay = new THREE.Ray(
    new THREE.Vector3(localX, 0, 1),
    new THREE.Vector3(0, 0, -1),
  );
  return {
    controller: source,
    sourceType: "controller-ray",
    selected,
    ray: sourceRay,
    position: sourceRay.origin.clone(),
    orientation: new THREE.Quaternion(),
    ...(intersection ? { intersections: [intersection] } : {}),
  };
}

function frame(source: RaySourceInput) {
  return { raySources: [source], directTouches: [] };
}
