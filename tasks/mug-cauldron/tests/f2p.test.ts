import { expect, it_session, judge } from "@xrblocks/devtools/test";
import * as THREE from "three";

function makeMugFixture(): THREE.Object3D {
  // MODEL_FIXTURE: Ceramic mug
  return new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.12, 0.12, 20),
    new THREE.MeshStandardMaterial({ color: 0x5b3a29 }),
  );
}

it_session(
  "adding all three ingredients changes and completes the potion",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "mug-cauldron",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    const mugPosition = await session.getPresetLocation("table-primary");
    await session.navigateTo(await session.getPresetLocation("table-view"));
    await session.lookAtTarget(mugPosition);
    await session.simulator.addObjects([
      {
        id: "fixture-mug",
        tag: "detected-mug",
        object: makeMugFixture(),
        position: mugPosition,
        detectObject: true,
        label: "Ceramic mug",
      },
    ]);
    await session.stepFrame(20);

    const initialScreenshot = (await session.getScreenshot()) as string;

    for (const ingredientNumber of [1, 2, 3]) {
      const ingredientTag = `ingredient-${ingredientNumber}`;

      await session.pointTo(primaryHand, { tag: ingredientTag });
      await session.startSelect(primaryHand);
      await session.pointTo(primaryHand, { tag: "potion-bowl" });
      await session.endSelect(primaryHand);
      await session.wait(400);
    }

    const verdict = await judge({
      prompt:
        "Objective: Verify potion completion. Required changes: The final potion visibly differs from the initial bowl and has a clear vapor creature above it.",
      evidence: [
        {
          type: "image",
          label: "Initial potion bowl",
          image: initialScreenshot,
        },
        {
          type: "image",
          label: "Potion after all three ingredients",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
