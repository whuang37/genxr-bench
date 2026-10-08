import { afterEach, expect, it, vi } from "@xrblocks/devtools/test";

import { createTrackedTouchHarness } from "./fixtures/tracked-touch.ts";

afterEach(() => vi.unstubAllGlobals());

it("ends contact and selection when a tracked fingertip is lost", async () => {
  const harness = await createTrackedTouchHarness({ rootLevel: true });
  harness.surface.position.copy(harness.expectedPoint(0));
  harness.surface.updateMatrixWorld(true);
  harness.sample();

  harness.removeFingertip(0);
  const frame = harness.sample();

  expect(frame.directTouches).toHaveLength(0);
  expect(frame.raySources).toHaveLength(0);
  expect(harness.recorder.touchStarts).toHaveLength(1);
  expect(harness.recorder.touchEnds).toHaveLength(1);
  expect(harness.recorder.selectStarts).toHaveLength(1);
  expect(harness.recorder.selectEnds).toHaveLength(1);
});

it("keeps root-level fingertip contact unchanged", async () => {
  const harness = await createTrackedTouchHarness({ rootLevel: true });
  harness.surface.position.copy(harness.expectedPoint(0));
  harness.surface.updateMatrixWorld(true);

  harness.sample();

  expect(harness.recorder.touchStarts).toHaveLength(1);
  expect(harness.recorder.selectStarts).toHaveLength(1);
});
