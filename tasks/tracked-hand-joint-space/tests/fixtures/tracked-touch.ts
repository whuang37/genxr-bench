import * as THREE from "three";
import { vi } from "@xrblocks/devtools/test";
import {
  Script,
  type ObjectTouchEvent,
  type ObjectTouchStartEvent,
  type SelectEndEvent,
  type SelectEvent,
} from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";

export class TouchRecorder extends Script {
  readonly touchStarts: ObjectTouchStartEvent[] = [];
  readonly touchEnds: ObjectTouchEvent[] = [];
  readonly selectStarts: SelectEvent[] = [];
  readonly selectEnds: SelectEndEvent[] = [];

  override onObjectTouchStart(event: ObjectTouchStartEvent): void {
    this.touchStarts.push(event);
  }

  override onObjectTouchEnd(event: ObjectTouchEvent): void {
    this.touchEnds.push(event);
  }

  override onObjectSelectStart(event: SelectEvent): void {
    this.selectStarts.push(event);
  }

  override onObjectSelectEnd(event: SelectEndEvent): void {
    this.selectEnds.push(event);
  }
}

type TrackedHand = {
  hand: THREE.Group & { joints: Record<string, THREE.Object3D> };
  referenceSpace: THREE.Group;
  fingertip: THREE.Object3D;
  wrist: THREE.Object3D;
};

export type TrackedTouchHarness = {
  hands: readonly TrackedHand[];
  recorder: TouchRecorder;
  surface: THREE.Mesh;
  expectedPoint(handIndex: number): THREE.Vector3;
  moveReferenceSpace(handIndex: number, position: THREE.Vector3): void;
  removeFingertip(handIndex: number): void;
  restoreFingertip(handIndex: number): void;
  sample(): {
    directTouches: readonly { point: THREE.Vector3 }[];
    raySources: readonly unknown[];
  };
};

export async function createTrackedTouchHarness({
  handCount = 1,
  rootLevel = false,
}: {
  handCount?: 1 | 2;
  rootLevel?: boolean;
} = {}): Promise<TrackedTouchHarness> {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [{ Input }, { Interaction }] = await Promise.all([
    import("@xrblocks/source/input/Input.ts"),
    import("@xrblocks/source/interaction/Interaction.ts"),
  ]);
  const input = new Input();
  const callbacks = new ScriptsManager(async () => {});
  const interaction = new Interaction({ callbacks });
  const recorder = new TouchRecorder();
  const surface = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08));
  interaction.registerHitSurface(surface, recorder);
  await callbacks.initScript(recorder);

  const hands = Array.from({ length: handCount }, (_, handIndex) =>
    createHand(handIndex, rootLevel),
  );
  input.controllers = hands.map(({ hand }, handIndex) =>
    createController(handIndex, hand),
  );
  input.hands = hands.map(({ hand }) => hand as unknown as THREE.XRHandSpace);
  input.controllersEnabled = false;

  return {
    hands,
    recorder,
    surface,
    expectedPoint(handIndex) {
      return hands[handIndex].fingertip.getWorldPosition(new THREE.Vector3());
    },
    moveReferenceSpace(handIndex, position) {
      const { referenceSpace } = hands[handIndex];
      referenceSpace.position.copy(position);
      referenceSpace.updateMatrixWorld(true);
    },
    removeFingertip(handIndex) {
      delete hands[handIndex].hand.joints["index-finger-tip"];
    },
    restoreFingertip(handIndex) {
      hands[handIndex].hand.joints["index-finger-tip"] =
        hands[handIndex].fingertip;
    },
    sample() {
      input.sampleSources();
      const frame = input.getFrame();
      interaction.update(frame);
      return frame;
    },
  };
}

function createController(handIndex: number, hand: THREE.Object3D): Controller {
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { connected: true, id: handIndex, selected: true };
  controller.inputSource = {
    hand: {} as XRHand,
    handedness: handIndex === 0 ? "left" : "right",
  };
  hand.add(controller);
  return controller;
}

function createHand(handIndex: number, rootLevel: boolean): TrackedHand {
  const referenceSpace = new THREE.Group();
  if (!rootLevel) {
    referenceSpace.position.set(1.2 + handIndex, -0.4, -2.1);
    referenceSpace.rotation.set(0.15, 0.65 * (handIndex + 1), -0.1);
  }
  const trackingParent = new THREE.Group();
  if (!rootLevel) {
    trackingParent.position.set(-0.25, 0.5, 0.35);
    trackingParent.rotation.set(-0.2, 0.1, 0.3);
  }
  const hand = new THREE.Group() as THREE.Group & {
    joints: Record<string, THREE.Object3D>;
  };
  if (!rootLevel) hand.position.set(0.15 * handIndex, -0.1, 0.2);
  const wrist = new THREE.Object3D();
  const fingertip = new THREE.Object3D();
  fingertip.position.set(0.11, 0.04, -0.08);
  hand.add(wrist, fingertip);
  hand.joints = { "index-finger-tip": fingertip, wrist };
  trackingParent.add(hand);
  referenceSpace.add(trackingParent);
  referenceSpace.updateMatrixWorld(true);
  return { hand, referenceSpace, fingertip, wrist };
}
