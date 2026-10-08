import * as THREE from "three";
import { vi } from "@xrblocks/devtools/test";
import {
  Script,
  type HoverEvent,
  type ObjectTouchEvent,
  type SelectEvent,
} from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Reticle } from "@xrblocks/source/interaction/reticle/Reticle.ts";

export class TargetRecorder extends Script {
  readonly hoverExits: Controller[] = [];
  readonly hoveringSources: Controller[] = [];
  touchStarts = 0;
  touchEnds = 0;
  selectStarts = 0;

  override onHoverEnter(event: HoverEvent): void {
    this.hoveringSources.push(event.source.controller);
  }

  override onHoverExit(event: HoverEvent): void {
    this.hoverExits.push(event.source.controller);
  }

  override onObjectSelectStart(_event: SelectEvent): void {
    this.selectStarts++;
  }

  override onObjectTouchStart(_event: ObjectTouchEvent): void {
    this.touchStarts++;
  }

  override onObjectTouchEnd(_event: ObjectTouchEvent): void {
    this.touchEnds++;
  }
}

export interface InputInteractionHarness {
  far: TargetRecorder;
  near: TargetRecorder;
  pointing?: Controller;
  reticle: Reticle;
  touching: Controller;
  dispose(): void;
  removeTouch(): void;
  restoreTouch(): void;
  sample(): void;
}

export async function createInputInteraction({
  withOtherHand = false,
}: {
  withOtherHand?: boolean;
} = {}): Promise<InputInteractionHarness> {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [{ Input }, { Interaction }, { Reticle }] = await Promise.all([
    import("@xrblocks/source/input/Input.ts"),
    import("@xrblocks/source/interaction/Interaction.ts"),
    import("@xrblocks/source/interaction/reticle/Reticle.ts"),
  ]);
  const input = new Input();
  const callbacks = new ScriptsManager(async () => {});
  const scene = new THREE.Scene();
  const interaction = new Interaction({ callbacks, scene });
  const near = new TargetRecorder();
  const far = new TargetRecorder();

  const nearSurface = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1));
  nearSurface.position.set(0.35, 0, -0.2);
  const farSurface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  farSurface.position.z = -2;
  nearSurface.updateMatrixWorld(true);
  farSurface.updateMatrixWorld(true);
  interaction.registerHitSurface(nearSurface, near);
  interaction.registerHitSurface(farSurface, far);
  await callbacks.initScript(near);
  await callbacks.initScript(far);

  const reticle = new Reticle(0);
  const touching = controller(0, "left", reticle);
  const pointing = withOtherHand ? controller(1, "right") : undefined;
  input.controllers = pointing ? [touching, pointing] : [touching];

  const hand = new THREE.Group() as THREE.Group & {
    joints: Record<string, THREE.Object3D>;
  };
  const fingertip = new THREE.Object3D();
  fingertip.position.copy(nearSurface.position);
  const wrist = new THREE.Object3D();
  hand.add(fingertip, wrist);
  hand.joints = { "index-finger-tip": fingertip, wrist };
  hand.updateMatrixWorld(true);
  input.hands = [hand as unknown as THREE.XRHandSpace];

  return {
    far,
    near,
    pointing,
    reticle,
    touching,
    dispose() {
      reticle.dispose();
      nearSurface.geometry.dispose();
      farSurface.geometry.dispose();
    },
    removeTouch() {
      input.hands = [];
    },
    restoreTouch() {
      input.hands = [hand as unknown as THREE.XRHandSpace];
    },
    sample() {
      input.sampleSources();
      interaction.update(input.getFrame());
    },
  };
}

function controller(
  id: number,
  handedness: "left" | "right",
  reticle?: Reticle,
): Controller {
  const value = new THREE.Object3D() as Controller;
  value.userData = { connected: true, id, selected: false };
  value.inputSource = { hand: {} as XRHand, handedness };
  value.reticle = reticle;
  return value;
}
