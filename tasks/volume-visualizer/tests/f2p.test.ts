import type { Vec3Tuple } from "@xrblocks/devtools";
import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "spatial pinches build a widest-fit 3D shape and Reset clears it",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "volume-visualizer",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    await session.rotate({ yawDegrees: 180 });
    await session.stepFrame(8);
    const initialView = (await session.getScreenshot()) as string;

    const camera = (await session.getCamera()) as { position: Vec3Tuple };
    const center: Vec3Tuple = [
      camera.position[0],
      camera.position[1] - 0.35,
      camera.position[2] + 0.85,
    ];
    const corners: Vec3Tuple[] = [
      offset(center, -0.22, -0.15, -0.18),
      offset(center, 0.22, -0.15, -0.18),
      offset(center, 0.22, -0.15, 0.18),
      offset(center, -0.22, -0.15, 0.18),
      offset(center, 0, 0.25, 0),
    ];

    for (const corner of corners) {
      // Each completed pinch commits one point at the hand's spatial position.
      await session.reachTo(primaryHand, corner);
      await session.click(primaryHand);
      await session.stepFrame(4);
    }

    const completedView = (await session.getScreenshot()) as string;

    await session.rayClick(primaryHand, { tag: "reset-button" });
    await session.stepFrame(8);
    const resetView = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify that five pinches placed at different room positions form one visible outer three-dimensional hull. Required changes: Five point markers connect into one coherent closed shape with a volume label above it. Reset removes the markers, shape, and label.",
      evidence: [
        { type: "image", label: "Initial empty state", image: initialView },
        {
          type: "image",
          label: "Five points and generated 3D shape",
          image: completedView,
        },
        { type: "image", label: "After Reset", image: resetView },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

function offset(center: Vec3Tuple, x: number, y: number, z: number): Vec3Tuple {
  return [center[0] + x, center[1] + y, center[2] + z];
}
