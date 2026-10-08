import * as THREE from "three";
import { describe, expect, it, vi } from "@xrblocks/devtools/test";

import { HeadGestureRecognition } from "@xrblocks/source/input/headGestures/HeadGestureRecognition";
import { HeadGestureRecognitionOptions } from "@xrblocks/source/input/headGestures/HeadGestureRecognitionOptions";
import type {
  HeadGestureRecognizer,
  HeadGestureScoreMap,
} from "@xrblocks/source/input/headGestures/HeadGestureTypes";
import { HeuristicHeadGestureRecognizer } from "@xrblocks/source/input/headGestures/gestureRecognizers/HeuristicHeadGestureRecognizer";

if (!("window" in globalThis)) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { search: "" } },
  });
}

const { Options } = await import("@xrblocks/source/core/Options");
const { XRSystems } = await import(
  "@xrblocks/source/core/components/XRSystems"
);
const { Input } = await import("@xrblocks/source/input/Input");

describe("head-gesture retained integration", () => {
  it("keeps custom detector registration, configuration, and removal independent of built-ins", () => {
    const detector = vi.fn(() => ({
      confidence: 0.75,
      data: { source: "custom" },
    }));
    const recognizer = new HeuristicHeadGestureRecognizer(
      false,
    ).registerGesture("custom", detector, { enabled: true, threshold: 1 });
    const options = new HeadGestureRecognitionOptions().setGestureRecognizer(
      recognizer,
    );

    options.setGestureConfig("custom", { enabled: true, threshold: 2 });
    expect(recognizer.getGestureConfigurations()).toEqual({
      custom: { enabled: true, threshold: 2 },
    });
    expect(detector).not.toHaveBeenCalled();

    recognizer.unregisterGesture("custom");
    expect(recognizer.getGestureConfigurations()).toEqual({});
  });

  it("latches and rearms each configured custom gesture at the public confidence thresholds", async () => {
    const options = recognitionOptions(
      new SequenceRecognizer([
        { nod: { confidence: 0.8 }, shake: { confidence: 0.9 } },
        { nod: { confidence: 0.9 }, shake: { confidence: 0.9 } },
        { nod: { confidence: 0.2 }, shake: { confidence: 0.1 } },
        { nod: { confidence: 0.7 }, shake: { confidence: 0.8 } },
      ]),
      ["nod", "shake"],
    );
    const recognition = new HeadGestureRecognition();
    await recognition.init({ camera: new THREE.Camera(), options });
    const names: string[] = [];
    recognition.addEventListener("gesture", (event) =>
      names.push(event.detail.name),
    );

    for (const time of [0, 16, 32, 48]) recognition.update(time);

    expect(names).toEqual(["nod", "shake", "nod", "shake"]);
    recognition.dispose();
  });

  it("warms up after discontinuity and ignores a stale asynchronous detector result", async () => {
    const deferred = new DeferredRecognizer();
    const options = recognitionOptions(deferred, ["nod"]);
    options.warmupDurationMs = 100;
    const camera = new THREE.Camera();
    const recognition = new HeadGestureRecognition();
    await recognition.init({ camera, options });
    const listener = vi.fn();
    recognition.addEventListener("gesture", listener);

    recognition.update(0);
    recognition.update(100);
    expect(deferred.requests).toHaveLength(1);

    camera.rotation.y = Math.PI;
    camera.updateMatrixWorld(true);
    recognition.update(116);
    deferred.resolve(0, { nod: { confidence: 0.9 } });
    await Promise.resolve();
    expect(listener).not.toHaveBeenCalled();

    recognition.update(216);
    expect(deferred.requests).toHaveLength(2);
    deferred.resolve(1, { nod: { confidence: 0.9 } });
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);
    recognition.dispose();
  });

  it("creates enabled head-gesture input without physical controllers", () => {
    const input = new Input();
    const options = new Options().enableHeadGestures();
    options.controllers.enabled = false;
    const systemsGroup = new XRSystems();

    input.init({
      systemsGroup,
      options,
      renderer: {} as THREE.WebGLRenderer,
    });

    expect(input.headGestures).toBeInstanceOf(HeadGestureRecognition);
    expect(input.controllers).toHaveLength(0);
    expect(systemsGroup.children).toContain(input.headGestures);
    input.dispose();
  });

  it("keeps disabled head recognition inert for a supplied recognizer", async () => {
    const recognizer: HeadGestureRecognizer = {
      recognize: vi.fn(() => ({ nod: { confidence: 1 } })),
    };
    const options = new HeadGestureRecognitionOptions().setGestureRecognizer(
      recognizer,
    );
    options.enabled = false;
    options.setGestureEnabled("nod", true);
    const recognition = new HeadGestureRecognition();
    const listener = vi.fn();
    recognition.addEventListener("gesture", listener);

    await recognition.init({ camera: new THREE.Camera(), options });
    recognition.update(0);
    recognition.update(1000);

    expect(recognizer.recognize).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    recognition.dispose();
  });

  it("keeps hand gestures and strokes disabled when only head gestures are enabled", () => {
    const options = new Options();
    options.hands.enabled = false;
    options.gestures.enabled = false;
    options.strokes.enabled = false;

    expect(options.enableHeadGestures()).toBe(options);
    expect(options.headGestures.enabled).toBe(true);
    expect(options.hands.enabled).toBe(false);
    expect(options.gestures.enabled).toBe(false);
    expect(options.strokes.enabled).toBe(false);
  });

  it("keeps controller disconnection callbacks and disposal independent from head input", () => {
    const input = new Input();
    const controller = new THREE.Object3D() as never;
    controller.userData = { connected: true, selected: true };
    input.controllers.push(controller);
    const selectEnd = vi.fn();
    input.bindListener("selectend", selectEnd);

    input.defaultOnDisconnected({ type: "disconnected", target: controller });
    expect(controller.userData.selected).toBe(false);
    expect(selectEnd).toHaveBeenCalledOnce();

    input.dispose();
    controller.dispatchEvent({ type: "selectend", target: controller });
    expect(selectEnd).toHaveBeenCalledOnce();
  });

  it("keeps screen selection while filtering ambiguous tracked-hand input", () => {
    const input = new Input();
    const screen = new THREE.Object3D() as never;
    screen.userData = { connected: true };
    screen.gamepad = { buttons: [{ value: 0, pressed: true }] } as Gamepad;
    screen.inputSource = { targetRayMode: "screen" } as XRInputSource;
    const trackedHand = new THREE.Object3D() as never;
    trackedHand.userData = { connected: true };
    trackedHand.gamepad = {
      buttons: [{ value: 0.7, pressed: true }],
    } as Gamepad;
    trackedHand.inputSource = {
      targetRayMode: "tracked-pointer",
    } as XRInputSource;
    input.controllers.push(screen, trackedHand);
    const selectStart = vi.fn();
    input.bindListener("selectstart", selectStart);

    screen.dispatchEvent({ type: "selectstart", target: screen });
    trackedHand.dispatchEvent({
      type: "selectstart",
      target: trackedHand,
    });

    expect(selectStart).toHaveBeenCalledOnce();
    input.dispose();
  });
});

class SequenceRecognizer implements HeadGestureRecognizer {
  private index = 0;

  constructor(private readonly scores: HeadGestureScoreMap[]) {}

  recognize() {
    const score = this.scores[Math.min(this.index, this.scores.length - 1)];
    this.index++;
    return score;
  }
}

class DeferredRecognizer implements HeadGestureRecognizer {
  requests: Array<(scores: HeadGestureScoreMap) => void> = [];

  recognize() {
    return new Promise<HeadGestureScoreMap>((resolve) =>
      this.requests.push(resolve),
    );
  }

  resolve(index: number, scores: HeadGestureScoreMap) {
    this.requests[index](scores);
  }
}

function recognitionOptions(
  recognizer: HeadGestureRecognizer,
  names: string[],
) {
  const options = new HeadGestureRecognitionOptions()
    .setGestureRecognizer(recognizer)
    .enable();
  options.updateIntervalMs = 0;
  options.warmupDurationMs = 0;
  for (const name of names) options.setGestureEnabled(name, true);
  return options;
}
