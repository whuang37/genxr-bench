import * as THREE from "three";
import { describe, expect, it, it_session } from "@xrblocks/devtools/test";

import { HeadGestureRecognition } from "@xrblocks/source/input/headGestures/HeadGestureRecognition";
import { HeadGestureRecognitionOptions } from "@xrblocks/source/input/headGestures/HeadGestureRecognitionOptions";
import { HeuristicHeadGestureRecognizer } from "@xrblocks/source/input/headGestures/gestureRecognizers/HeuristicHeadGestureRecognizer";

import {
  degrees,
  irregularTimestamps,
  makeCompletedGestureSamples,
  makeNoisyNodSamples,
  makeOneWaySamples,
  makeSlowNodSamples,
} from "./fixtures/poseHistories";

describe("head-gesture built-in heuristics", () => {
  it("recognizes completed nods in either direction and reports the matching alias", () => {
    for (const [direction, name, opposite] of [
      [1, "nod-up", "nod-down"],
      [-1, "nod-down", "nod-up"],
    ] as const) {
      const scores = new HeuristicHeadGestureRecognizer().recognize({
        samples: makeCompletedGestureSamples({ axis: "pitch", direction }),
      });
      const nod = scores.nod;

      expect(nod?.confidence).toBeGreaterThanOrEqual(0.6);
      expect(scores[name]).toEqual(nod);
      expect(scores[opposite]).toBeUndefined();
    }
  });

  it("recognizes completed shakes in either direction and reports the matching alias", () => {
    for (const [direction, name, opposite] of [
      [1, "shake-left", "shake-right"],
      [-1, "shake-right", "shake-left"],
    ] as const) {
      const scores = new HeuristicHeadGestureRecognizer().recognize({
        samples: makeCompletedGestureSamples({ axis: "yaw", direction }),
      });
      const shake = scores.shake;

      expect(shake?.confidence).toBeGreaterThanOrEqual(0.6);
      expect(scores[name]).toEqual(shake);
      expect(scores[opposite]).toBeUndefined();
    }
  });

  it("rejects a one-way look, a slow movement, and a history too short to complete", () => {
    const recognizer = new HeuristicHeadGestureRecognizer();

    expect(
      recognizer.recognize({ samples: makeOneWaySamples("yaw") }).shake,
    ).toBeUndefined();
    expect(
      recognizer.recognize({ samples: makeSlowNodSamples() }).nod,
    ).toBeUndefined();
    expect(
      recognizer.recognize({
        samples: makeCompletedGestureSamples({ axis: "pitch" }).slice(0, 4),
      }).nod,
    ).toBeUndefined();
    expect(
      recognizer.recognize({
        samples: makeCompletedGestureSamples({ axis: "pitch" }).map(
          (sample) => ({
            ...sample,
            timestamp: 0,
          }),
        ),
      }).nod,
    ).toBeUndefined();
  });

  it("rejects off-axis and noisy pose histories instead of treating them as nods", () => {
    const recognizer = new HeuristicHeadGestureRecognizer();

    expect(
      recognizer.recognize({
        samples: makeCompletedGestureSamples({
          axis: "pitch",
          secondaryAxisDegrees: 22,
        }),
      }).nod,
    ).toBeUndefined();
    expect(
      recognizer.recognize({ samples: makeNoisyNodSamples() }).nod,
    ).toBeUndefined();
  });

  it("recognizes a local nod at irregular timestamps after world rotation and translation", () => {
    const worldOrientation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(degrees(12), degrees(-40), degrees(8), "YXZ"),
    );
    const scores = new HeuristicHeadGestureRecognizer().recognize({
      samples: makeCompletedGestureSamples({
        axis: "pitch",
        timestamps: irregularTimestamps(),
        worldOrientation,
        worldPosition: new THREE.Vector3(100, -30, 7),
      }),
    });

    expect(scores.nod?.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it("uses built-in sensitivity and enabled options when publishing a detected nod", async () => {
    const recognizer = new HeuristicHeadGestureRecognizer();
    const samples = makeCompletedGestureSamples({ axis: "pitch" });
    recognizer.setGestureConfig("nod", {
      enabled: true,
      threshold: degrees(45),
    });
    expect(recognizer.recognize({ samples }).nod).toBeUndefined();
    recognizer.setGestureConfig("nod", {
      enabled: true,
      threshold: degrees(10),
    });
    expect(
      recognizer.recognize({ samples }).nod?.confidence,
    ).toBeGreaterThanOrEqual(0.6);

    const enabledEvents = await replayBuiltInNod(true);
    const disabledEvents = await replayBuiltInNod(false);
    expect(enabledEvents).toContain("nod");
    expect(disabledEvents).not.toContain("nod");
    expect(disabledEvents).not.toContain("nod-up");
  });
});

it_session(
  "emits a public nod event after controlled simulator head motion",
  async (session) => {
    await session.stepFrame(16);
    await session.rotate({
      pitchDegrees: 25,
      speedDegreesPerSecond: 100,
    });
    await session.rotate({
      pitchDegrees: -25,
      speedDegreesPerSecond: 100,
    });
    await session.stepFrame(4);

    const state = await sessionHeadGestureState(session);
    expectNoSessionErrors(session.diagnostics);
    const nod = state.events.find((event) => event.name === "nod");
    expect(nod).toBeDefined();
  },
);

async function replayBuiltInNod(enabled: boolean) {
  const camera = new THREE.Camera();
  const options = new HeadGestureRecognitionOptions().enable();
  options.updateIntervalMs = 0;
  options.warmupDurationMs = 0;
  options.maximumSampleAngleRadians = Math.PI;
  options.setGestureEnabled("nod", enabled);
  options.setGestureEnabled("nod-up", enabled);
  const recognition = new HeadGestureRecognition();
  await recognition.init({ camera, options });
  const events: string[] = [];
  recognition.addEventListener("gesture", (event) =>
    events.push(event.detail.name),
  );

  for (const sample of makeCompletedGestureSamples({ axis: "pitch" })) {
    camera.position.copy(sample.position);
    camera.quaternion.copy(sample.orientation);
    camera.updateMatrixWorld(true);
    recognition.update(sample.timestamp);
  }
  recognition.dispose();
  return events;
}

async function sessionHeadGestureState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{ events: Array<{ confidence: number; name: string }> }> {
  const inspection = (await session.objects.inspect({
    tag: "head-gesture-state",
  })) as { state?: unknown };
  expect(inspection.state).toBeDefined();
  return inspection.state as Awaited<
    ReturnType<typeof sessionHeadGestureState>
  >;
}

function expectNoSessionErrors(diagnostics: {
  consoleEntries: Array<{ level?: unknown }>;
  pageErrors: unknown[];
  networkErrors: unknown[];
}) {
  expect(
    diagnostics.consoleEntries.filter((entry) => entry.level === "error"),
  ).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.networkErrors).toEqual([]);
}
