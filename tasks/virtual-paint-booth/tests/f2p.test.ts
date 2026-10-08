import { expect, it_session, judge } from "@xrblocks/devtools/test";
import type {
  PhysicalHand,
  Vec3Tuple,
  XRBlocksSession,
} from "@xrblocks/devtools";

it_session(
  "pinching sprays the room, a fist changes color, and Reset clears paint",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "virtual-paint-booth",
    realTime: true,
  },
  async (session, { primaryHand, secondaryHand }) => {
    await session.stepFrame(20);
    const start = ((await session.getCamera()) as { position: Vec3Tuple })
      .position;
    const wallView = await session.getPresetLocation("wall-view");
    const wall = await session.getPresetLocation("wall-primary");
    const closeWallView = viewpointNearWall(wallView, wall, 1);
    await session.teleportTo(wallView, { faceTarget: false });
    await session.teleportTo(closeWallView, { faceTarget: false });
    await session.lookAtTarget(wall);
    await session.stepFrame(8);
    const initialView = (await session.getScreenshot()) as string;

    await sprayStroke(
      session,
      primaryHand,
      wallPoint(wall, -0.3, 0.15),
      wallPoint(wall, 0.1, 0.15),
    );

    // A fist advances the shared spray-can color for later paint.
    await session.gesture(secondaryHand, "fist");
    await session.stepFrame(4);
    await session.gesture(secondaryHand, "relaxed");
    await session.stepFrame(4);

    await sprayStroke(
      session,
      primaryHand,
      wallPoint(wall, -0.1, -0.15),
      wallPoint(wall, 0.3, -0.15),
    );
    const paintedView = (await session.getScreenshot()) as string;

    await session.teleportTo(start, { faceTarget: false });
    await session.lookAtTarget({ tag: "reset-button" });
    await session.rayClick(primaryHand, { tag: "reset-button" });
    await session.teleportTo(closeWallView, { faceTarget: false });
    await session.lookAtTarget(wall);
    await session.stepFrame(8);
    const resetView = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify spray painting, color change, and Reset. Required changes: Two wall-attached spray passes appear in different colors with spray-like edges, and Reset removes both passes.",
      evidence: [
        { type: "image", label: "Initial unpainted wall", image: initialView },
        {
          type: "image",
          label: "Two spray passes after changing color",
          image: paintedView,
        },
        { type: "image", label: "Wall after Reset", image: resetView },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function sprayStroke(
  session: XRBlocksSession,
  hand: PhysicalHand,
  start: Vec3Tuple,
  end: Vec3Tuple,
): Promise<void> {
  // Aim the can, hold its trigger with a pinch, and sweep across the wall.
  await session.lookAtTarget(start);
  await session.pointTo(hand, start);
  await session.gesture(hand, "pinching");
  await session.lookAtTarget(end);
  await session.pointTo(hand, end);
  await session.gesture(hand, "relaxed");
  await session.stepFrame(12);
}

function wallPoint(
  center: Vec3Tuple,
  horizontalOffset: number,
  verticalOffset: number,
): Vec3Tuple {
  return [center[0] + horizontalOffset, center[1] + verticalOffset, center[2]];
}

function viewpointNearWall(
  view: Vec3Tuple,
  wall: Vec3Tuple,
  distanceMeters: number,
): Vec3Tuple {
  const offsetX = view[0] - wall[0];
  const offsetZ = view[2] - wall[2];
  const horizontalDistance = Math.hypot(offsetX, offsetZ);
  const scale = distanceMeters / horizontalDistance;
  return [
    wall[0] + offsetX * scale,
    view[1],
    wall[2] + offsetZ * scale,
  ];
}
