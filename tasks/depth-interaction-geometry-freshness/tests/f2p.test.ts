import * as THREE from "three";
import { expect, it } from "@xrblocks/devtools/test";

import {
  cpuDepth,
  createDetectionHarness,
} from "./fixtures/depth-freshness-fixtures.ts";

it("runs detection against the latest changed depth surface", async () => {
  const { mesh, recognizer } = await createDetectionHarness();

  try {
    mesh.updateDepth(cpuDepth(1), new THREE.Matrix4(), "float32");
    mesh.updatePose(new THREE.Vector3(0, 0, 0), new THREE.Quaternion());
    const first = await recognizer.runDetection();
    mesh.updateDepth(cpuDepth(3), new THREE.Matrix4(), "float32");
    mesh.updatePose(new THREE.Vector3(2, 0, 0), new THREE.Quaternion());
    const second = await recognizer.runDetection();
    mesh.updateDepth(cpuDepth(4, 3, 2), new THREE.Matrix4(), "float32");
    const resized = await recognizer.runDetection();
    const unchanged = await recognizer.runDetection();

    const firstPosition = first[0]?.position;
    const secondPosition = second[0]?.position;
    const resizedPosition = resized[0]?.position;
    const unchangedPosition = unchanged[0]?.position;

    expect(firstPosition).toBeDefined();
    expect(secondPosition).toBeDefined();
    expect(resizedPosition).toBeDefined();
    expect(unchangedPosition).toBeDefined();
    expect(secondPosition!.distanceTo(firstPosition!)).toBeGreaterThan(1.5);
    expect(resizedPosition!.distanceTo(secondPosition!)).toBeGreaterThan(0.5);
    expect(unchangedPosition!.distanceTo(resizedPosition!)).toBeLessThan(0.001);
  } finally {
    recognizer.dispose();
  }
});
