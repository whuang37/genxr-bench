import * as THREE from "three";
import { expect, it, it_session } from "@xrblocks/devtools/test";

import {
  createDetector,
  markByName,
  sceneWithMarkedObject,
} from "./fixtures/scene-context-fixtures.ts";

type CaptureSummary = {
  image: boolean;
  markX: number | null;
  snapshotId: string | null;
  targetPixels: number;
  targetX: number | null;
};

it("returns one Set-of-Mark transaction when the viewer changes during capture", async () => {
  const { scene } = sceneWithMarkedObject(new THREE.Vector3(0, 0, -2));
  const second = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2));
  second.name = "Second object";
  second.position.set(-0.5, 0, -2);
  scene.add(second);
  const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 10);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  let captureTime = 12.5;
  const detector = await createDetector({
    scene,
    camera,
    capturedAt: () => captureTime,
    getScreenshot: async () => {
      camera.position.x = 1;
      camera.fov = 30;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      captureTime = 99;
      return "data:image/png;base64,captured-view";
    },
  });

  try {
    const context = await detector.runSetOfMarkDetection();
    expect(context.image).toContain("captured-view");
    expect(context.snapshotId).toMatch(/\S/);
    expect(context.capturedAt).toBe(12.5);
    expect(context.marks.map((mark) => mark.name).sort()).toEqual([
      "Second object",
      "Tracked object",
    ]);
    expect(markByName(context, "Tracked object").x).toBeCloseTo(0.5, 2);
    expect(markByName(context, "Second object").x).toBeCloseTo(0.375, 2);
  } finally {
    detector.dispose();
  }
});

it_session(
  "keeps each label aligned with its image when camera position and zoom change during capture",
  async (session) => {
    type CaptureState = {
      evaluated: CaptureSummary | null;
      pending: boolean;
    };
    let state: CaptureState | undefined;
    for (let frame = 0; frame < 24; frame += 1) {
      await session.stepFrame(1);
      const inspection = await session.objects.inspect({
        tag: "screenshot-capture-observation",
      });
      state = inspection.state as CaptureState;
      if (!state.pending) break;
    }

    expect(state?.pending).toBe(false);
    expect(state).toBeDefined();
    const evaluated = state!.evaluated!;
    expect(evaluated).not.toBeNull();
    expect(evaluated.image).toBe(true);
    expect(evaluated.markX).not.toBeNull();
    expect(evaluated.snapshotId).toMatch(/\S/);
    expect(evaluated.targetPixels).toBeGreaterThan(20);
    expect(evaluated.targetX).not.toBeNull();
    expect(Math.abs(evaluated.markX! - evaluated.targetX!)).toBeLessThan(0.03);
    expectNoSessionErrors(session.diagnostics);
  },
);

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
