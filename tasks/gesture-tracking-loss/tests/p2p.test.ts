import { expect, it, vi } from "@xrblocks/devtools/test";
import type { User } from "@xrblocks/source/core/User.ts";
import type {
  GestureRecognizer,
  HandContext,
  PoseEstimator,
} from "@xrblocks/source/input/gestures/GestureTypes.ts";

it("keeps confidence-based gesture transitions while tracking is available", async () => {
  vi.stubGlobal("window", { location: { search: "" } });
  const [
    { Handedness },
    { GestureRecognition },
    { GestureRecognitionOptions },
  ] = await Promise.all([
    import("@xrblocks/source/input/Hands.ts"),
    import("@xrblocks/source/input/gestures/GestureRecognition.ts"),
    import("@xrblocks/source/input/gestures/GestureRecognitionOptions.ts"),
  ]);
  const right: HandContext = {
    handedness: Handedness.RIGHT,
    handLabel: "right",
    joints: new Map(),
    getJoint: () => undefined,
  };
  let confidence = 0.9;
  const initialize = vi.fn(async () => {});
  const dispose = vi.fn();
  const estimator: PoseEstimator = {
    getHandContext: (handedness) =>
      handedness === Handedness.RIGHT ? right : null,
    getHandContexts: () => ({ right }),
  };
  const recognizer: GestureRecognizer = {
    init: initialize,
    getGestureConfigurations: () => ({ grab: { enabled: true } }),
    recognize: () => ({ grab: { confidence } }),
    dispose,
  };
  const recognition = new GestureRecognition();
  const events: string[] = [];
  for (const type of ["gesturestart", "gestureupdate", "gestureend"] as const) {
    recognition.addEventListener(type, () => events.push(type));
  }
  await recognition.init({
    options: new GestureRecognitionOptions({
      enabled: true,
      minimumConfidence: 0.6,
      updateIntervalMs: 0,
      poseEstimator: estimator,
      gestureRecognizer: recognizer,
    }),
    user: {} as User,
  });

  recognition.update();
  recognition.update();
  confidence = 0.2;
  recognition.update();

  expect(events).toEqual(["gesturestart", "gestureupdate", "gestureend"]);
  recognition.dispose();
  expect(initialize).toHaveBeenCalledOnce();
  expect(dispose).toHaveBeenCalledOnce();
});

it("keeps the other hand's gesture active when one hand disappears", async () => {
  vi.stubGlobal("window", { location: { search: "" } });
  const [
    { Handedness },
    { GestureRecognition },
    { GestureRecognitionOptions },
  ] = await Promise.all([
    import("@xrblocks/source/input/Hands.ts"),
    import("@xrblocks/source/input/gestures/GestureRecognition.ts"),
    import("@xrblocks/source/input/gestures/GestureRecognitionOptions.ts"),
  ]);
  const left: HandContext = {
    handedness: Handedness.LEFT,
    handLabel: "left",
    joints: new Map(),
    getJoint: () => undefined,
  };
  const right: HandContext = {
    handedness: Handedness.RIGHT,
    handLabel: "right",
    joints: new Map(),
    getJoint: () => undefined,
  };
  let rightPresent = true;
  const estimator: PoseEstimator = {
    getHandContext: (handedness) =>
      handedness === Handedness.LEFT ? left : rightPresent ? right : null,
    getHandContexts: () => (rightPresent ? { left, right } : { left }),
  };
  const recognizer: GestureRecognizer = {
    getGestureConfigurations: () => ({ grab: { enabled: true } }),
    recognize: () => ({ grab: { confidence: 0.9 } }),
  };
  const recognition = new GestureRecognition();
  const events: Array<{ hand: string; type: string }> = [];
  for (const type of ["gesturestart", "gestureupdate", "gestureend"] as const) {
    recognition.addEventListener(type, (event) =>
      events.push({ hand: event.detail.hand, type }),
    );
  }
  await recognition.init({
    options: new GestureRecognitionOptions({
      enabled: true,
      updateIntervalMs: 0,
      poseEstimator: estimator,
      gestureRecognizer: recognizer,
    }),
    user: {} as User,
  });

  recognition.update();
  rightPresent = false;
  recognition.update();

  expect(
    events.filter(({ hand, type }) => hand === "left" && type === "gestureend"),
  ).toHaveLength(0);
  expect(events).toContainEqual({ hand: "left", type: "gestureupdate" });
  recognition.dispose();
});
