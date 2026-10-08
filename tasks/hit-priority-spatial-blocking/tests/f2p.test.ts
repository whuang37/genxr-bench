import { expect, it } from "@xrblocks/devtools/test";

import {
  addTarget,
  controller,
  harness,
  mountOverlay,
  ray,
} from "./fixtures/interaction-harness.ts";

it("keeps a visible overlay as the blocking target for controller and hand rays", async () => {
  const { callbacks, interaction, scene } = await harness();
  const world = await addTarget(callbacks, interaction, scene, "world", -0.5);
  const overlay = await mountOverlay(callbacks, interaction, scene);
  const controllerSource = controller();
  const handSource = controller();
  handSource.userData.id = 1;

  try {
    interaction.update({
      directTouches: [],
      raySources: [ray(controllerSource), ray(handSource, false, "hand-ray")],
    });
    interaction.update({
      directTouches: [],
      raySources: [ray(controllerSource, true)],
    });

    expect(overlay.target.enters).toHaveLength(2);
    expect(
      overlay.target.enters.map((event) => event.source.type).sort(),
    ).toEqual(["controller-ray", "hand-ray"]);
    expect(overlay.target.selections).toHaveLength(1);
    expect(overlay.target.selections[0].source.type).toBe("controller-ray");
    expect(world.target.enters).toHaveLength(0);
    expect(world.target.selections).toHaveLength(0);
  } finally {
    overlay.renderer.dispose();
  }
});
