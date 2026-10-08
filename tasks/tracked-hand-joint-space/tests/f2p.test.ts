import * as THREE from "three";
import { afterEach, expect, it, vi } from "@xrblocks/devtools/test";

import { createTrackedTouchHarness } from "./fixtures/tracked-touch.ts";

afterEach(() => vi.unstubAllGlobals());

it("reports each hand at its visible fingertip through nested tracking transforms", async () => {
  const harness = await createTrackedTouchHarness({ handCount: 2 });
  const expected = [harness.expectedPoint(0), harness.expectedPoint(1)];

  for (const point of expected) {
    harness.surface.position.copy(point);
    harness.surface.updateMatrixWorld(true);
    harness.sample();
  }

  expect(harness.recorder.touchStarts).toHaveLength(2);
  expect(harness.recorder.selectStarts).toHaveLength(2);
  for (const [index, event] of harness.recorder.touchStarts.entries()) {
    expect(event.touchPosition.distanceTo(expected[index])).toBeLessThan(1e-5);
  }
});

it("samples a reappeared fingertip in its current reference space", async () => {
  const harness = await createTrackedTouchHarness();
  harness.surface.position.copy(harness.expectedPoint(0));
  harness.surface.updateMatrixWorld(true);
  harness.sample();

  harness.removeFingertip(0);
  const missing = harness.sample();
  expect(missing.directTouches).toHaveLength(0);

  harness.moveReferenceSpace(0, new THREE.Vector3(-1.1, 0.8, -0.6));
  harness.restoreFingertip(0);
  const expected = harness.expectedPoint(0);
  harness.surface.position.copy(expected);
  harness.surface.updateMatrixWorld(true);
  const restored = harness.sample();

  expect(restored.directTouches).toHaveLength(1);
  expect(restored.directTouches[0].point.distanceTo(expected)).toBeLessThan(
    1e-5,
  );
  expect(harness.recorder.touchStarts).toHaveLength(2);
  expect(harness.recorder.touchEnds).toHaveLength(1);
  expect(
    harness.recorder.touchStarts[1].touchPosition.distanceTo(expected),
  ).toBeLessThan(1e-5);
});
