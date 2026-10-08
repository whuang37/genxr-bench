import * as THREE from "three";
import { vi } from "@xrblocks/devtools/test";
import {
  Script,
  type HoverEvent,
  type SelectEvent,
} from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type { RaySourceInput } from "@xrblocks/source/interaction/InteractionTypes.ts";
import { UIOverlay } from "@xrblocks/source/ui/components/UIOverlay.ts";
import type {
  UIBackend,
  UIMount,
} from "@xrblocks/source/ui/internal/UIBackend.ts";
import { UIRenderer } from "@xrblocks/source/ui/internal/UIRenderer.ts";

export class HoverTarget extends Script {
  readonly enters: HoverEvent[] = [];
  readonly selections: SelectEvent[] = [];

  override onHoverEnter(event: HoverEvent): void {
    this.enters.push(event);
  }

  override onObjectSelectStart(event: SelectEvent): void {
    this.selections.push(event);
  }
}

export class OverlayTarget extends UIOverlay {
  readonly enters: HoverEvent[] = [];
  readonly selections: SelectEvent[] = [];

  override onHoverEnter(event: HoverEvent): void {
    this.enters.push(event);
  }

  override onObjectSelectStart(event: SelectEvent): void {
    this.selections.push(event);
  }
}

export async function harness(): Promise<{
  callbacks: ScriptsManager;
  interaction: Interaction;
  scene: THREE.Scene;
}> {
  vi.stubGlobal("window", {
    location: { search: "" },
    innerWidth: 1024,
    innerHeight: 768,
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

export async function mountOverlay(
  callbacks: ScriptsManager,
  interaction: Interaction,
  scene: THREE.Scene,
  pointerEvents: "auto" | "none" = "auto",
): Promise<{ target: OverlayTarget; renderer: UIRenderer }> {
  const target = new OverlayTarget({ pointerEvents });
  scene.add(target);
  await callbacks.initScript(target);
  const renderer = new UIRenderer(interaction, async () => ({
    createUIBackend: testBackend,
  }));
  await renderer.initialize(scene, {} as THREE.WebGLRenderer);
  renderer.reconcile(0, new THREE.PerspectiveCamera());
  scene.updateMatrixWorld(true);
  return { target, renderer };
}

export async function addTarget(
  callbacks: ScriptsManager,
  interaction: Interaction,
  parent: THREE.Object3D,
  name: string,
  z: number,
  renderOrder = 0,
): Promise<{ target: HoverTarget; surface: THREE.Mesh }> {
  const target = new HoverTarget();
  target.name = name;
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  surface.position.z = z;
  surface.renderOrder = renderOrder;
  parent.add(surface);
  interaction.registerHitSurface(surface, target);
  await callbacks.initScript(target);
  return { target, surface };
}

export function controller(): Controller {
  const value = new THREE.Object3D() as Controller;
  value.userData = { connected: true, id: 0, selected: false };
  value.inputSource = { handedness: "right" };
  return value;
}

export function ray(
  source: Controller,
  selected = false,
  sourceType: RaySourceInput["sourceType"] = "controller-ray",
): RaySourceInput {
  source.userData.selected = selected;
  return {
    controller: source,
    sourceType,
    selected,
    ray: new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1)),
    position: new THREE.Vector3(),
    orientation: new THREE.Quaternion(),
  };
}

function testBackend(): UIBackend {
  return {
    createMount(root): UIMount {
      const physical = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000));
      let committed = false;
      return {
        object: physical,
        commit(_theme, _viewport, rootOrder) {
          physical.xb = {
            pointerEvents: root.xb?.pointerEvents ?? "auto",
          };
          physical.renderOrder = rootOrder;
          if (committed) return undefined;
          committed = true;
          return [{ physical, logical: root }];
        },
        present() {},
        update() {},
        validate: () => [],
        dispose() {
          physical.geometry.dispose();
        },
      };
    },
    dispose() {},
  };
}
