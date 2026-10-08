import * as THREE from "three";
import { expect, it, it_session, vi } from "@xrblocks/devtools/test";
import type { User } from "@xrblocks/source/core/User.ts";
import type {
  GestureRecognizer,
  PoseEstimator,
} from "@xrblocks/source/input/gestures/GestureTypes.ts";

import { contextForPose } from "./fixtures/hand-context-fixtures.ts";

Object.defineProperty(globalThis, "window", {
  value: { location: { search: "" } },
  configurable: true,
});

const { Handedness } = await import("@xrblocks/source/input/Hands.ts");
const { GestureRecognition } = await import(
  "@xrblocks/source/input/gestures/GestureRecognition.ts"
);
const { GestureRecognitionOptions } = await import(
  "@xrblocks/source/input/gestures/GestureRecognitionOptions.ts"
);
const { HeuristicGestureRecognizer } = await import(
  "@xrblocks/source/input/gestures/gestureRecognizers/HeuristicGestureRecognizer.ts"
);
const { SimulatorHandPose } = await import(
  "@xrblocks/source/simulator/handPoses/HandPoses.ts"
);

it("keeps custom heuristic detector registration and configuration public", () => {
  const defaults = new HeuristicGestureRecognizer().getGestureConfigurations();
  expect(defaults.point).toEqual({ enabled: false });
  expect(defaults.spread).toEqual({ enabled: false, threshold: 0.04 });

  const detector = vi.fn(() => ({
    confidence: 0.85,
    data: { source: "application" },
  }));
  const recognizer = new HeuristicGestureRecognizer(false).registerGesture(
    "application-signal",
    detector,
    { enabled: false, threshold: 0.7 },
  );

  expect(recognizer.getGestureConfigurations()).toEqual({
    "application-signal": { enabled: false, threshold: 0.7 },
  });
  expect(
    recognizer.recognize(
      contextForPose(Handedness.RIGHT, SimulatorHandPose.NEUTRAL),
    ),
  ).toEqual({
    "application-signal": {
      confidence: 0.85,
      data: { source: "application" },
    },
  });
  expect(detector).toHaveBeenCalledOnce();

  recognizer.unregisterGesture("application-signal");
  expect(recognizer.getGestureConfigurations()).toEqual({});
});

it("dispatches custom gesture start, update, and end through the retained lifecycle", async () => {
  const context = contextForPose(Handedness.RIGHT, SimulatorHandPose.NEUTRAL);
  let present = true;
  let confidence = 0.9;
  const estimator: PoseEstimator = {
    init: vi.fn(async () => {}),
    getHandContext(handedness) {
      return handedness === Handedness.RIGHT && present ? context : null;
    },
    getHandContexts() {
      return present ? { right: context } : {};
    },
  };
  const dispose = vi.fn();
  const recognizer: GestureRecognizer = {
    getGestureConfigurations: () => ({
      retained: { enabled: false, threshold: 0.7 },
    }),
    recognize: vi.fn(() => ({
      retained: { confidence, data: { producer: "application" } },
    })),
    dispose,
  };
  const options = new GestureRecognitionOptions({
    enabled: true,
    minimumConfidence: 0.6,
    updateIntervalMs: 0,
    poseEstimator: estimator,
    gestureRecognizer: recognizer,
  });
  const recognition = new GestureRecognition();
  const events: Array<{ type: string; detail: unknown }> = [];
  for (const type of ["gesturestart", "gestureupdate", "gestureend"] as const) {
    recognition.addEventListener(type, (event) => {
      events.push({ type, detail: event.detail });
    });
  }

  await recognition.init({ options, user: {} as User });
  expect(options.gestures.retained).toEqual({ enabled: false, threshold: 0.7 });
  recognition.update();
  expect(events).toEqual([]);
  options.setGestureEnabled("retained", true);
  recognition.update();
  recognition.update();
  confidence = 0.2;
  recognition.update();
  present = false;
  recognition.update();
  recognition.dispose();

  expect(estimator.init).toHaveBeenCalledOnce();
  expect(events).toEqual([
    {
      type: "gesturestart",
      detail: {
        name: "retained",
        hand: "right",
        confidence: 0.9,
        data: { producer: "application" },
      },
    },
    {
      type: "gestureupdate",
      detail: {
        name: "retained",
        hand: "right",
        confidence: 0.9,
        data: { producer: "application" },
      },
    },
    {
      type: "gestureend",
      detail: { name: "retained", hand: "right", confidence: 0 },
    },
  ]);
  expect(dispose).toHaveBeenCalledOnce();
});

it("keeps disabled gesture recognition inert for supplied estimators and recognizers", async () => {
  const estimator: PoseEstimator = {
    init: vi.fn(async () => {}),
    getHandContext: vi.fn(() => null),
    getHandContexts: vi.fn(() => ({})),
  };
  const recognizer: GestureRecognizer = {
    getGestureConfigurations: () => ({ custom: { enabled: true } }),
    recognize: vi.fn(() => ({ custom: { confidence: 1 } })),
  };
  const recognition = new GestureRecognition();
  const listener = vi.fn();
  recognition.addEventListener("gesturestart", listener);

  await recognition.init({
    options: new GestureRecognitionOptions({
      enabled: false,
      poseEstimator: estimator,
      gestureRecognizer: recognizer,
    }),
    user: {} as User,
  });
  recognition.update();

  expect(estimator.init).toHaveBeenCalledOnce();
  expect(estimator.getHandContexts).not.toHaveBeenCalled();
  expect(recognizer.recognize).not.toHaveBeenCalled();
  expect(listener).not.toHaveBeenCalled();
  recognition.dispose();
});

it("keeps left and right custom gesture lifecycles independent", async () => {
  const right = contextForPose(Handedness.RIGHT, SimulatorHandPose.NEUTRAL);
  const left = contextForPose(Handedness.LEFT, SimulatorHandPose.NEUTRAL);
  let contexts: Partial<Record<"left" | "right", typeof right>> = {
    left,
    right,
  };
  const estimator: PoseEstimator = {
    init: async () => {},
    getHandContext: (handedness) =>
      handedness === Handedness.LEFT
        ? (contexts.left ?? null)
        : (contexts.right ?? null),
    getHandContexts: () => contexts,
  };
  const recognizer: GestureRecognizer = {
    getGestureConfigurations: () => ({ custom: { enabled: false } }),
    recognize: () => ({ custom: { confidence: 0.9 } }),
  };
  const recognition = new GestureRecognition();
  const events: string[] = [];
  recognition.addEventListener("gesturestart", (event) =>
    events.push(`start:${event.detail.hand}`),
  );
  recognition.addEventListener("gestureend", (event) =>
    events.push(`end:${event.detail.hand}`),
  );
  const options = new GestureRecognitionOptions({
    enabled: true,
    updateIntervalMs: 0,
    poseEstimator: estimator,
    gestureRecognizer: recognizer,
  });
  await recognition.init({ options, user: {} as User });
  options.setGestureEnabled("custom", true);

  recognition.update();
  contexts = { right };
  recognition.update();
  contexts = {};
  recognition.update();

  expect(events).toEqual([
    "start:left",
    "start:right",
    "end:left",
    "end:right",
  ]);
  recognition.dispose();
});

it("keeps Options gesture enablement coupled to hands without enabling strokes", async () => {
  const { Options } = await import("@xrblocks/source/core/Options.ts");
  const options = new Options();
  options.hands.enabled = false;
  options.gestures.enabled = false;
  options.strokes.enabled = false;

  expect(options.enableGestures()).toBe(options);
  expect(options.hands.enabled).toBe(true);
  expect(options.gestures.enabled).toBe(true);
  expect(options.strokes.enabled).toBe(false);
});

it("keeps screen select events while filtering ambiguous tracked-hand pinch events", async () => {
  const [{ Input }, { Controller }] = await Promise.all([
    import("@xrblocks/source/input/Input.ts"),
    import("@xrblocks/source/input/Controller.ts"),
  ]);
  const input = new Input();
  const screen = new THREE.Object3D() as InstanceType<typeof Controller>;
  screen.userData = { connected: true };
  screen.gamepad = { buttons: [{ value: 0, pressed: true }] } as Gamepad;
  screen.inputSource = { targetRayMode: "screen" } as XRInputSource;
  const hand = new THREE.Object3D() as InstanceType<typeof Controller>;
  hand.userData = { connected: true };
  hand.gamepad = { buttons: [{ value: 0.7, pressed: true }] } as Gamepad;
  hand.inputSource = { targetRayMode: "tracked-pointer" } as XRInputSource;
  input.controllers.push(screen, hand);
  const selectStart = vi.fn();
  input.bindListener("selectstart", selectStart);

  screen.dispatchEvent({ type: "selectstart", target: screen });
  hand.dispatchEvent({ type: "selectstart", target: hand });

  expect(selectStart).toHaveBeenCalledOnce();
  input.dispose();
});

it_session(
  "keeps a supplied custom recognizer wired through the browser lifecycle",
  async (session, { primaryHand }) => {
    await session.gesture(primaryHand, "neutral");
    await session.stepFrame(3);

    const state = await gestureState(session);
    expect(state.builtInRequested).toBe(false);
    expect(state.suppliedStarts).toBeGreaterThanOrEqual(1);
    expect(state.suppliedUpdates).toBeGreaterThanOrEqual(0);
    expectNoSessionErrors(session.diagnostics);
  },
);

async function gestureState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{
  builtInRequested: boolean;
  suppliedStarts: number;
  suppliedUpdates: number;
}> {
  const inspection = (await session.objects.inspect({
    tag: "gesture-recognizer-state",
  })) as { state?: unknown };
  expect(inspection.state).toBeDefined();
  return inspection.state as Awaited<ReturnType<typeof gestureState>>;
}

function expectNoSessionErrors(diagnostics: {
  consoleEntries: Array<{ level?: unknown }>;
  pageErrors: unknown[];
  networkErrors: unknown[];
}): void {
  expect(
    diagnostics.consoleEntries.filter((entry) => entry.level === "error"),
  ).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.networkErrors).toEqual([]);
}
