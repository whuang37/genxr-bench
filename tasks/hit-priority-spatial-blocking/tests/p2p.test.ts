import * as THREE from "three";
import { expect, it } from "@xrblocks/devtools/test";

import {
  addTarget,
  controller,
  harness,
  mountOverlay,
  ray,
} from "./fixtures/interaction-harness.ts";

it("keeps the nearest world interaction first", async () => {
  const { callbacks, interaction, scene } = await harness();
  const near = await addTarget(callbacks, interaction, scene, "near", -1);
  const far = await addTarget(callbacks, interaction, scene, "far", -2);
  scene.updateMatrixWorld(true);

  interaction.update({ directTouches: [], raySources: [ray(controller())] });

  expect(near.target.enters).toHaveLength(1);
  expect(far.target.enters).toHaveLength(0);
});

it("does not deliver hover through a pointer-disabled overlay", async () => {
  const { callbacks, interaction, scene } = await harness();
  const world = await addTarget(callbacks, interaction, scene, "world", -2);
  const overlay = await mountOverlay(callbacks, interaction, scene, "none");

  try {
    interaction.update({ directTouches: [], raySources: [ray(controller())] });

    expect(world.target.enters).toHaveLength(1);
    expect(overlay.target.enters).toHaveLength(0);
  } finally {
    overlay.renderer.dispose();
  }
});

it("keeps display order as the tie-break for coplanar interactions", async () => {
  const { callbacks, interaction, scene } = await harness();
  const lower = await addTarget(callbacks, interaction, scene, "lower", -1, 1);
  const upper = await addTarget(callbacks, interaction, scene, "upper", -1, 2);
  scene.updateMatrixWorld(true);

  interaction.update({ directTouches: [], raySources: [ray(controller())] });

  expect(upper.target.enters).toHaveLength(1);
  expect(lower.target.enters).toHaveLength(0);
});
