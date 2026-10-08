import * as THREE from "three";

import { expect, it, it_session } from "@xrblocks/devtools/test";
import { Handedness } from "@xrblocks/source/input/Hands.ts";
import { HeuristicGestureRecognizer } from "@xrblocks/source/input/gestures/gestureRecognizers/HeuristicGestureRecognizer.ts";
import type {
  GestureDetectionResult,
  GestureScoreMap,
} from "@xrblocks/source/input/gestures/GestureTypes.ts";
import { SimulatorHandPose } from "@xrblocks/source/simulator/handPoses/HandPoses.ts";

import {
  contextForPose,
  incompleteContext,
  transformedContext,
} from "./fixtures/hand-context-fixtures.ts";

it("recognizes representative built-in hand poses on both hands", () => {
  const recognizer = new HeuristicGestureRecognizer();
  const cases = [
    [Handedness.LEFT, SimulatorHandPose.PINCHING, "pinch"],
    [Handedness.RIGHT, SimulatorHandPose.NEUTRAL, "open-palm"],
    [Handedness.LEFT, SimulatorHandPose.FIST, "fist"],
    [Handedness.RIGHT, SimulatorHandPose.THUMBS_UP, "thumbs-up"],
    [Handedness.LEFT, SimulatorHandPose.THUMBS_DOWN, "thumbs-down"],
    [Handedness.RIGHT, SimulatorHandPose.POINTING, "point"],
    [Handedness.LEFT, SimulatorHandPose.NEUTRAL, "spread"],
  ] as const;

  for (const [handedness, pose, expectedGesture] of cases) {
    const scores = recognizer.recognize(contextForPose(handedness, pose));
    const result = requiredScore(scores, expectedGesture);

    expect(result.confidence).toBeGreaterThanOrEqual(0.4);
    expect(result.confidence).toBeLessThanOrEqual(1);
  }
});

it("keeps built-in score maps safe for opposing, ambiguous, and incomplete poses", () => {
  const recognizer = new HeuristicGestureRecognizer();
  const thumbsUp = recognizer.recognize(
    contextForPose(Handedness.RIGHT, SimulatorHandPose.THUMBS_UP),
  );
  const thumbsDown = recognizer.recognize(
    contextForPose(Handedness.LEFT, SimulatorHandPose.THUMBS_DOWN),
  );
  const neutral = recognizer.recognize(
    contextForPose(Handedness.RIGHT, SimulatorHandPose.NEUTRAL),
  );

  expect(requiredScore(thumbsUp, "thumbs-up").confidence).toBeGreaterThan(
    requiredScore(thumbsUp, "thumbs-down").confidence,
  );
  expect(requiredScore(thumbsDown, "thumbs-down").confidence).toBeGreaterThan(
    requiredScore(thumbsDown, "thumbs-up").confidence,
  );
  expect(requiredScore(neutral, "open-palm").confidence).toBeGreaterThan(
    requiredScore(neutral, "fist").confidence,
  );

  const incomplete = recognizer.recognize(incompleteContext(Handedness.LEFT));
  expect(new Set(Object.keys(incomplete))).toEqual(
    new Set([
      "pinch",
      "open-palm",
      "fist",
      "thumbs-up",
      "thumbs-down",
      "point",
      "spread",
    ]),
  );
  for (const result of Object.values(incomplete)) {
    if (result) {
      expect(Number.isFinite(result.confidence)).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  }
});

it("keeps pinch recognition stable when the hand is moved", () => {
  const recognizer = new HeuristicGestureRecognizer();
  const base = contextForPose(Handedness.LEFT, SimulatorHandPose.PINCHING);
  const transformed = transformedContext(base, {
    translation: new THREE.Vector3(3, -2, 1),
  });

  const basePinch = requiredScore(recognizer.recognize(base), "pinch");
  const transformedPinch = requiredScore(
    recognizer.recognize(transformed),
    "pinch",
  );

  expect(basePinch.confidence).toBeGreaterThanOrEqual(0.4);
  expect(
    Math.abs(transformedPinch.confidence - basePinch.confidence),
  ).toBeLessThan(1e-5);
});

function requiredScore(
  scores: GestureScoreMap,
  name: string,
): GestureDetectionResult {
  const result = scores[name];
  expect(result).toBeDefined();
  return result!;
}

async function gestureState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{
  builtInRequested: boolean;
  pinchConfidence: number;
  pinchHand: "left" | "right" | null;
  pinchStarts: number;
  pinchUpdates: number;
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
