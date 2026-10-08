import { afterEach, expect, it, vi } from "@xrblocks/devtools/test";

import { createInputInteraction } from "./fixtures/input-interaction.ts";

afterEach(() => vi.unstubAllGlobals());

it("keeps another hand's pointer active during fingertip contact", async () => {
  const harness = await createInputInteraction({ withOtherHand: true });

  try {
    harness.sample();

    expect(harness.near.touchStarts).toBe(1);
    expect(harness.far.hoveringSources).toContain(harness.pointing);
  } finally {
    harness.dispose();
  }
});

it("keeps ordinary hand pointing active without fingertip contact", async () => {
  const harness = await createInputInteraction();

  try {
    harness.removeTouch();
    harness.sample();

    expect(harness.far.hoveringSources).toContain(harness.touching);
    expect(harness.reticle.visible).toBe(true);
  } finally {
    harness.dispose();
  }
});
