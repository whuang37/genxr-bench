import type { Vec3Tuple, XRBlocksSession } from "@xrblocks/devtools";
import { expect, it_session, judge } from "@xrblocks/devtools/test";
import * as THREE from "three";

it_session(
  "Changing the clearance value changes the floor overlay",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "walking-clearance-visualization",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(40);
    await session.lookAtTarget({ tag: "clearance-distance-slider" });
    const initial = (await session.getScreenshot()) as string;
    await session.pointTo(primaryHand, { tag: "clearance-distance-slider" });
    await session.startSelect(primaryHand);
    await session.pointTo(primaryHand, { tag: "clearance-high-stop" });
    await session.endSelect(primaryHand);
    await session.wait(1_000);
    const finalView = (await session.getScreenshot()) as string;
    await session.rayClick(primaryHand, { tag: "reset-clearance" });
    await session.stepFrame(16);
    const resetView = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify the floor overlay and Reset. Required changes: Increasing the selected clearance contracts the green walkable area and expands the contrasting excluded area around the same walls and obstacles. Reset then restores the default 0.3 m overlay.",
      evidence: [
        { type: "image", label: "Default 0.3 m overlay", image: initial },
        { type: "image", label: "Final 0.8 m overlay", image: finalView },
        { type: "image", label: "Reset 0.3 m overlay", image: resetView },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "The default overlay correctly excludes two nearby obstacles",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "walking-clearance-visualization-default",
    realTime: true,
  },
  async (session) => {
    const fixture = await addClearanceObstacles(session);
    await session.navigateTo(fixture.viewpoint);
    await session.lookAtTarget(fixture.center);
    await session.stepFrame(40);

    const view = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify how the floor-planning overlay treats two nearby box obstacles. Required changes: The contrasting excluded area covers both obstacle footprints and their narrow gap, while green walkable area remains on open floor farther away.",
      evidence: [
        {
          type: "image",
          label: "Default overlay around fixtures",
          image: view,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function addClearanceObstacles(session: XRBlocksSession): Promise<{
  center: Vec3Tuple;
  viewpoint: Vec3Tuple;
}> {
  const viewpoint = await session.getPresetLocation("floor-primary");
  const towardOpenArea = await session.getPresetLocation("floor-secondary");
  const floorY = (await session.getPresetLocation("floor-near-obstacle"))[1];
  const direction = horizontalDirection(viewpoint, towardOpenArea);
  const center: Vec3Tuple = [
    viewpoint[0] + direction[0] * 1.2,
    floorY + 0.25,
    viewpoint[2] + direction[2] * 1.2,
  ];

  await session.simulator.addObjects([
    clearanceObstacle(
      "clearance-obstacle-a",
      [center[0], center[1], center[2] - 0.35],
      0x3f7bd9,
    ),
    clearanceObstacle(
      "clearance-obstacle-b",
      [center[0], center[1], center[2] + 0.35],
      0xf08a3c,
    ),
  ]);
  return { center, viewpoint };
}

function clearanceObstacle(id: string, position: Vec3Tuple, color: number) {
  return {
    id,
    tag: id,
    object: new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.5, 0.3),
      new THREE.MeshStandardMaterial({ color }),
    ),
    position,
  };
}

function horizontalDirection(from: Vec3Tuple, to: Vec3Tuple): Vec3Tuple {
  const x = to[0] - from[0];
  const z = to[2] - from[2];
  const length = Math.hypot(x, z);
  if (length === 0) throw new Error("Fixture direction must have distance.");
  return [x / length, 0, z / length];
}
