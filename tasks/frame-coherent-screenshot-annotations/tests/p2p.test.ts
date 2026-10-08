import * as THREE from "three";
import { expect, it } from "@xrblocks/devtools/test";

import {
  createDetector,
  markByName,
  sceneWithMarkedObject,
} from "./fixtures/scene-context-fixtures.ts";

it("keeps a normal camera-inclusive screenshot and its public metadata usable", async () => {
  const { scene } = sceneWithMarkedObject(new THREE.Vector3(0.5, 0, -2));
  const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 10);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const overlayRequests: boolean[] = [];
  const detector = await createDetector({
    scene,
    camera,
    capturedAt: 42.5,
    deviceCamera: { loaded: true },
    getScreenshot: async (overlayOnCamera) => {
      overlayRequests.push(overlayOnCamera);
      return "data:image/png;base64,stationary-view";
    },
  });

  try {
    const context = await detector.runSetOfMarkDetection();
    const mark = markByName(context, "Tracked object");
    expect(context.image).toContain("stationary-view");
    expect(context.snapshotId).toMatch(/\S/);
    expect(context.capturedAt).toBe(42.5);
    expect(overlayRequests).toContain(true);
    expect(mark.nodeId).toMatch(/\S/);
    expect(mark.x).toBeCloseTo(0.625, 2);
    expect(mark.y).toBeCloseTo(0.5, 2);
  } finally {
    detector.dispose();
  }
});
