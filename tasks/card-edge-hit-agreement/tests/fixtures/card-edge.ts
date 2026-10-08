import * as THREE from "three";
import { expect } from "@xrblocks/devtools/test";
import { vi } from "vitest";

vi.hoisted(() => {
  if ("window" in globalThis) return;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener() {},
      location: { search: "" },
      removeEventListener() {},
    },
  });
});

import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type {
  InteractionFrameInput,
  RaySourceInput,
} from "@xrblocks/source/interaction/InteractionTypes.ts";
import type { ManipulationEvent } from "@xrblocks/source/interaction/manipulation/ManipulationTypes.ts";
import { UICard } from "@xrblocks/source/ui/components/UICard.ts";
import { ui } from "@xrblocks/source/ui/UI.ts";
import { createUIBackend } from "@xrblocks/source/ui/internal/UIKitBackend.ts";

class RecordingCard extends UICard {
  phases: string[] = [];

  override onObjectManipulate(event: ManipulationEvent): void {
    this.phases.push(event.phase);
  }
}

export async function mountedCard(): Promise<{
  card: RecordingCard;
  edgeSurface: THREE.Object3D;
  interaction: Interaction;
  resize: (size: { width: number; height: number }) => THREE.Object3D;
}> {
  const card = new RecordingCard({
    size: { width: 0.6, height: 0.4 },
    manipulation: true,
    edge: true,
    style: { borderRadius: 100 },
  });
  const mount = createUIBackend().createMount(card);
  let mappings = commit(mount, { width: 800, height: 600 });
  for (let index = 0; index < 3; index += 1) {
    mount.update(0);
    mappings =
      mount.commit(ui.theme, { width: 800, height: 600 }, 0) ?? mappings;
  }
  expect(mappings).toBeDefined();
  const callbacks = new ScriptsManager(async () => {});
  const interaction = new Interaction({ callbacks, scene: new THREE.Scene() });
  registerMappings(interaction, mappings);
  await callbacks.initScript(card);
  mount.object.updateWorldMatrix(true, true);
  let edgeSurface = selectEdgeSurface(card, interaction, mappings);
  return {
    card,
    edgeSurface,
    interaction,
    resize: (size) => {
      card.size = size;
      mappings = commit(mount, { width: 1440, height: 900 }) ?? mappings;
      registerMappings(interaction, mappings);
      mount.object.updateWorldMatrix(true, true);
      edgeSurface = selectEdgeSurface(card, interaction, mappings);
      return edgeSurface;
    },
  };
}

function registerMappings(
  interaction: Interaction,
  mappings:
    | readonly { physical: THREE.Object3D; logical: THREE.Object3D }[]
    | undefined,
): void {
  for (const mapping of mappings ?? []) {
    interaction.registerHitSurface(mapping.physical, mapping.logical);
  }
}

function selectEdgeSurface(
  card: RecordingCard,
  interaction: Interaction,
  mappings:
    | readonly { physical: THREE.Object3D; logical: THREE.Object3D }[]
    | undefined,
): THREE.Object3D {
  const source = controller();
  const straightBand = new THREE.Vector2(0.5, 0.95);
  for (const { logical, physical } of mappings ?? []) {
    if (logical !== card || !physical.parent) continue;
    const phaseCount = card.phases.length;
    update(interaction, inputAt(source, false, physical, straightBand));
    update(interaction, inputAt(source, true, physical, straightBand));
    update(interaction, inputAt(source, false, physical, straightBand));
    if (card.phases.slice(phaseCount).includes("start")) {
      card.phases.splice(phaseCount);
      return physical;
    }
  }
  throw new Error("The card did not expose an edge that starts translation.");
}

function commit(
  mount: ReturnType<ReturnType<typeof createUIBackend>["createMount"]>,
  viewport: { width: number; height: number },
):
  | readonly { physical: THREE.Object3D; logical: THREE.Object3D }[]
  | undefined {
  let mappings = mount.commit(ui.theme, viewport, 0);
  for (let index = 0; index < 3; index += 1) {
    mount.update(0);
    mappings = mount.commit(ui.theme, viewport, 0) ?? mappings;
  }
  return mappings;
}

export function controller(): Controller {
  const source = new THREE.Object3D() as Controller;
  source.userData = { connected: true, id: 0, selected: false };
  source.inputSource = { handedness: "right" };
  return source;
}

export function inputAt(
  source: Controller,
  selected: boolean,
  surface: THREE.Object3D,
  uv: THREE.Vector2,
): RaySourceInput {
  source.userData.selected = selected;
  const point = new THREE.Vector3(uv.x - 0.5, uv.y - 0.5, 0).applyMatrix4(
    surface.matrixWorld,
  );
  const normal = new THREE.Vector3(0, 0, 1)
    .transformDirection(surface.matrixWorld)
    .normalize();
  const ray = new THREE.Ray(
    point.clone().addScaledVector(normal, 1),
    normal.negate(),
  );
  return {
    controller: source,
    orientation: new THREE.Quaternion(),
    position: ray.origin.clone(),
    ray,
    selected,
    sourceType: "controller-ray",
  };
}

export function update(interaction: Interaction, source: RaySourceInput): void {
  const frame: InteractionFrameInput = {
    directTouches: [],
    raySources: [source],
  };
  interaction.update(frame);
}
