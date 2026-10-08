import type { PhysicalHand, XRBlocksSession } from "@xrblocks/devtools";
import { expect, it_session, judge } from "@xrblocks/devtools/test";
import * as THREE from "three";

function makePlateFixture(): THREE.Object3D {
  // MODEL_FIXTURE: Paper plate
  return new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.015, 24),
    new THREE.MeshStandardMaterial({ color: 0xf5f0df }),
  );
}

it_session(
  "holding and moving the plate activates the UFO and collects one sheep",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "plate-ufo",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    const plateStart = await session.getPresetLocation("table-primary");
    await session.navigateTo(await session.getPresetLocation("table-view"));
    await session.lookAtTarget(plateStart);
    await session.gesture(primaryHand, "relaxed");
    await session.teleportHand(primaryHand, [
      plateStart[0] + 0.7,
      plateStart[1] + 0.4,
      plateStart[2],
    ]);
    await session.simulator.addObjects([
      {
        id: "fixture-plate",
        object: makePlateFixture(),
        position: plateStart,
        detectObject: true,
        label: "Paper plate",
      },
    ]);
    await session.stepFrame(20);

    await session.teleportHand(
      primaryHand,
      plateGripPosition(plateStart, primaryHand),
    );
    await waitForTag(session, "plate-ufo", 4_000);

    const sheepTargets = await session.objects.findByTag("sheep");
    expect(sheepTargets.length).toBeGreaterThan(0);
    const sheepTarget = { tag: "sheep", id: sheepTargets[0].id };
    const sheep = (await session.objects.inspect(sheepTarget)).worldTransform
      .position;
    await session.lookAtTarget(sheep);
    await session.stepFrame(4);
    const beforeCollection = (await session.getScreenshot()) as string;
    const plateOverSheep: [number, number, number] = [
      sheep[0],
      sheep[1] + 0.3,
      sheep[2],
    ];
    await moveHeldPlate(session, primaryHand, plateStart, plateOverSheep);
    await session.wait(1_500);
    await session.lookAtTarget(sheep);
    await session.stepFrame(4);
    const afterCollection = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify UFO activation and sheep collection. Required changes: The held plate shows its mounted UFO and beam. The sheep under it is visibly pulled into the UFO or collected and is no longer on the ground, while other sheep remain.",
      evidence: [
        {
          type: "image",
          label: "Before collecting a sheep",
          image: beforeCollection,
        },
        {
          type: "image",
          label: "After collecting a sheep",
          image: afterCollection,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function moveHeldPlate(
  session: XRBlocksSession,
  hand: PhysicalHand,
  start: [number, number, number],
  end: [number, number, number],
): Promise<void> {
  for (const progress of [0.25, 0.5, 0.75, 1]) {
    const position: [number, number, number] = [
      THREE.MathUtils.lerp(start[0], end[0], progress),
      THREE.MathUtils.lerp(start[1], end[1], progress),
      THREE.MathUtils.lerp(start[2], end[2], progress),
    ];
    await session.simulator.updateObjects([{ id: "fixture-plate", position }]);
    await session.teleportHand(hand, plateGripPosition(position, hand));
    await session.wait(50);
  }
}

function plateGripPosition(
  plate: [number, number, number],
  hand: PhysicalHand,
): [number, number, number] {
  return [
    plate[0] + (hand === "left" ? -0.14 : 0.14),
    plate[1] + 0.04,
    plate[2],
  ];
}

async function waitForTag(
  session: XRBlocksSession,
  tag: string,
  timeoutMs: number,
): Promise<void> {
  const attempts = Math.ceil(timeoutMs / 250);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if ((await session.objects.findByTag(tag)).length > 0) return;
    await session.wait(250);
  }
  throw new Error(`${tag} did not appear within ${timeoutMs} ms.`);
}
