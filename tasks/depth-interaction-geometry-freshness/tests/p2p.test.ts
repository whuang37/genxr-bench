import * as THREE from "three";
import { expect, it, it_session } from "@xrblocks/devtools/test";

import {
  cpuDepth,
  createDepthMesh,
  createDetectionHarness,
} from "./fixtures/depth-freshness-fixtures.ts";

it("keeps detection on the same observed surface between depth frames", async () => {
  const { mesh, recognizer } = await createDetectionHarness();

  try {
    mesh.updateDepth(cpuDepth(2), new THREE.Matrix4(), "float32");
    const first = await recognizer.runDetection();
    const second = await recognizer.runDetection();

    expect(first[0]?.position.z).toBeCloseTo(-2);
    expect(second[0]?.position.z).toBeCloseTo(-2);
  } finally {
    recognizer.dispose();
  }
});

it("keeps ordinary depth-mesh raycasts current across frames", async () => {
  const { mesh } = await createDepthMesh();
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -1),
  );

  mesh.updateDepth(cpuDepth(1), new THREE.Matrix4(), "float32");
  mesh.updateMatrixWorld(true);
  const first = raycaster.intersectObject(mesh)[0];
  mesh.updateDepth(cpuDepth(3), new THREE.Matrix4(), "float32");
  const second = raycaster.intersectObject(mesh)[0];

  expect(first?.distance).toBeCloseTo(1);
  expect(second?.distance).toBeCloseTo(3);
});

it_session(
  "renders and raycasts deterministic depth frames through the running application",
  async (session) => {
    const inspection = await session.objects.inspect({
      tag: "depth-freshness-live",
    });
    const state = inspection.state as {
      error: string | null;
      firstDistance: number;
      firstRed: number;
      secondDistance: number;
      secondRed: number;
      thirdDistance: number;
    };

    expect(state.error).toBeNull();
    expect(state.firstDistance).toBeCloseTo(1);
    expect(state.secondDistance).toBeCloseTo(3);
    expect(state.thirdDistance).toBeCloseTo(4);
    expect(state.secondRed).toBeGreaterThan(state.firstRed + 80);
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
