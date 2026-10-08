import type { XRBlocksSession } from "@xrblocks/devtools";
import {
  captureOutputSnapshot,
  expect,
  it_session,
  judge,
} from "@xrblocks/devtools/test";
import * as THREE from "three";

const BROOM_HALF_HEIGHT_METERS = 0.04;
const LIFT_HEIGHT_METERS = 0.8;

// MODEL_FIXTURE: tracked physical broom head for floor coverage
function makeBroomHead() {
  return new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.08, 0.16),
    new THREE.MeshStandardMaterial({ color: 0x805b3b }),
  );
}

it_session(
  "Sweeping records coverage and Reset clears it",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "sweep-assist-ar",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    const floorPrimary = await session.getPresetLocation("floor-primary");
    const floorSecondary = await session.getPresetLocation("floor-secondary");
    const contactY =
      (await detectedFloorHeight(session)) + BROOM_HALF_HEIGHT_METERS;
    await session.lookAtTarget([floorPrimary[0], contactY, floorPrimary[2]]);
    await session.simulator.addObjects([
      {
        id: "broom-head",
        tag: "broom-head",
        object: makeBroomHead(),
        position: [floorPrimary[0], contactY, floorPrimary[2]],
        detectObject: true,
        label: "Broom head",
      },
    ]);
    await session.stepFrame(20);
    const beforeSweep = (await session.getScreenshot()) as string;
    await session.simulator.updateObjects([
      {
        id: "broom-head",
        position: [
          (floorPrimary[0] * 2 + floorSecondary[0]) / 3,
          contactY,
          (floorPrimary[2] * 2 + floorSecondary[2]) / 3,
        ],
      },
    ]);
    await session.stepFrame(12);
    await session.simulator.updateObjects([
      {
        id: "broom-head",
        position: [
          (floorPrimary[0] + floorSecondary[0] * 2) / 3,
          contactY,
          (floorPrimary[2] + floorSecondary[2] * 2) / 3,
        ],
      },
    ]);
    await session.stepFrame(12);
    const afterSweep = (await session.getScreenshot()) as string;
    await session.rayClick(primaryHand, { tag: "reset-coverage" });
    await session.stepFrame(8);
    const afterReset = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify floor coverage and Reset. Required changes: Moving the tracked broom head while it touches the floor grows a visible cleaned area. Reset then removes the recorded cleaned area and restores the initial coverage state.",
      evidence: [
        { type: "image", label: "Before sweeping", image: beforeSweep },
        { type: "image", label: "After sweeping", image: afterSweep },
        { type: "image", label: "After Reset", image: afterReset },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
it_session(
  "Lifting the broom above the floor records no cleaned path",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "sweep-assist-ar-off-floor",
    realTime: true,
  },
  async (session) => {
    const floorPrimary = await session.getPresetLocation("floor-primary");
    const floorSecondary = await session.getPresetLocation("floor-secondary");
    const liftedY = (await detectedFloorHeight(session)) + LIFT_HEIGHT_METERS;
    await session.lookAtTarget([floorPrimary[0], liftedY, floorPrimary[2]]);
    await session.simulator.addObjects([
      {
        id: "broom-head",
        tag: "broom-head",
        object: makeBroomHead(),
        position: [floorPrimary[0], liftedY, floorPrimary[2]],
        detectObject: true,
        label: "Broom head",
      },
    ]);
    await session.stepFrame(8);
    const beforeLiftedSweep = (await session.getScreenshot()) as string;
    await session.simulator.updateObjects([
      {
        id: "broom-head",
        position: [floorSecondary[0], liftedY, floorSecondary[2]],
      },
    ]);
    await session.stepFrame(12);
    const afterLiftedSweep = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify that moving the tracked broom head above the room floor does not count as cleaning. Required changes: The raised movement creates no cleaned path or floor-contact highlight, and the cleaning percentage does not advance.",
      evidence: [
        {
          type: "image",
          label: "Before raised sweep",
          image: beforeLiftedSweep,
        },
        {
          type: "image",
          label: "After raised sweep",
          image: afterLiftedSweep,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function detectedFloorHeight(session: XRBlocksSession): Promise<number> {
  await session.stepFrame(1);
  const snapshot = await captureOutputSnapshot(session);
  const floor = snapshot.surfaces.find((surface) => surface.label === "floor");
  expect(floor).toBeDefined();
  return floor!.position[1];
}
