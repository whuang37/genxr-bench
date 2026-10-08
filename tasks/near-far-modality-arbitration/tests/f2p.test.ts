import { afterEach, expect, it, vi } from "@xrblocks/devtools/test";

import { createInputInteraction } from "./fixtures/input-interaction.ts";

afterEach(() => vi.unstubAllGlobals());

it("transitions the same hand between far hover and fingertip contact without stale feedback", async () => {
  const harness = await createInputInteraction();

  try {
    harness.removeTouch();
    harness.sample();

    expect(harness.far.hoveringSources).toEqual([harness.touching]);
    expect(harness.far.hoverExits).toEqual([]);
    expect(harness.reticle.visible).toBe(true);

    harness.restoreTouch();
    harness.sample();

    expect(harness.near.touchStarts).toBe(1);
    expect(harness.far.hoverExits).toEqual([harness.touching]);
    expect(harness.far.selectStarts).toBe(0);
    expect(harness.reticle.visible).toBe(false);

    harness.removeTouch();
    harness.sample();

    expect(harness.near.touchEnds).toBe(1);
    expect(harness.far.hoveringSources).toEqual([
      harness.touching,
      harness.touching,
    ]);
    expect(harness.reticle.visible).toBe(true);

    harness.restoreTouch();
    harness.sample();

    expect(harness.near.touchStarts).toBe(2);
    expect(harness.far.hoverExits).toEqual([
      harness.touching,
      harness.touching,
    ]);
    expect(harness.reticle.visible).toBe(false);
  } finally {
    harness.dispose();
  }
});
