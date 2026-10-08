import { expect, it, vi } from "@xrblocks/devtools/test";
import type { User } from "@xrblocks/source/core/User.ts";
import type {
  GestureRecognizer,
  HandContext,
  PoseEstimator,
} from "@xrblocks/source/input/gestures/GestureTypes.ts";

it("finishes each active gesture once when its hand is lost and rearms it after recovery", async () => {
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
  const right = handContext(Handedness.RIGHT, "right");
  let present = true;
  const estimator: PoseEstimator = {
    getHandContext: (handedness) =>
      handedness === Handedness.RIGHT && present ? right : null,
    getHandContexts: () => (present ? { right } : {}),
  };
  const recognizer: GestureRecognizer = {
    getGestureConfigurations: () => ({
      grab: { enabled: true },
      pinch: { enabled: true },
    }),
    recognize: () => ({
      grab: { confidence: 0.9 },
      pinch: { confidence: 0.8 },
    }),
  };
  const recognition = new GestureRecognition();
  const events: Array<{ type: string; name: string; hand: string }> = [];
  for (const type of ["gesturestart", "gestureupdate", "gestureend"] as const) {
    recognition.addEventListener(type, (event) =>
      events.push({
        type,
        name: event.detail.name,
        hand: event.detail.hand,
      }),
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
  present = false;
  recognition.update();
  recognition.update();
  present = true;
  recognition.update();

  for (const name of ["grab", "pinch"]) {
    const gestureEvents = events.filter((event) => event.name === name);
    expect(gestureEvents.map((event) => event.type)).toEqual([
      "gesturestart",
      "gestureend",
      "gesturestart",
    ]);
    expect(gestureEvents.every((event) => event.hand === "right")).toBe(true);
    expect(
      gestureEvents.filter((event) => event.type === "gestureend"),
    ).toHaveLength(1);
  }
  recognition.dispose();
});

it("keeps one gesture lifecycle when recognition completes across a loss and recovery", async () => {
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
  const right = handContext(Handedness.RIGHT, "right");
  let present = true;
  let resolveRecognition:
    | ((scores: { grab: { confidence: number } }) => void)
    | undefined;
  let calls = 0;
  const estimator: PoseEstimator = {
    getHandContext: (handedness) =>
      handedness === Handedness.RIGHT && present ? right : null,
    getHandContexts: () => (present ? { right } : {}),
  };
  const recognizer: GestureRecognizer = {
    getGestureConfigurations: () => ({ grab: { enabled: true } }),
    recognize: () => {
      calls++;
      if (calls === 2) {
        return new Promise((resolve) => {
          resolveRecognition = resolve;
        });
      }
      return { grab: { confidence: 0.9 } };
    },
  };
  const recognition = new GestureRecognition();
  const events: string[] = [];
  for (const type of ["gesturestart", "gestureupdate", "gestureend"] as const) {
    recognition.addEventListener(type, () => events.push(type));
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
  recognition.update();
  present = false;
  recognition.update();
  recognition.update();
  present = true;
  recognition.update();
  resolveRecognition?.({ grab: { confidence: 0.9 } });
  await Promise.resolve();
  recognition.update();

  expect(events.filter((type) => type === "gesturestart")).toHaveLength(2);
  expect(events.filter((type) => type === "gestureend")).toHaveLength(1);
  expect(events.indexOf("gestureend")).toBeGreaterThan(0);
  recognition.dispose();
});

function handContext(
  handedness: HandContext["handedness"],
  handLabel: HandContext["handLabel"],
): HandContext {
  return {
    handedness,
    handLabel,
    joints: new Map(),
    getJoint: () => undefined,
  };
}
