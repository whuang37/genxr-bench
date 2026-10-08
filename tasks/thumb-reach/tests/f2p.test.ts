import { expect, it_session, judge } from "@xrblocks/devtools/test";
import type { PhysicalHand, XRBlocksSession } from "@xrblocks/devtools";

type JointRotation = [number, number, number];

type ThumbSweepPose = {
  "thumb-metacarpal": JointRotation;
  "thumb-phalanx-proximal": JointRotation;
  "thumb-phalanx-distal": JointRotation;
};

const THUMB_SWEEP_POSES: ThumbSweepPose[] = [
  {
    "thumb-metacarpal": [-0.111, 0.005, -0.328],
    "thumb-phalanx-proximal": [-0.002, -0.007, 0],
    "thumb-phalanx-distal": [-0.067, 0, 0],
  },
  {
    "thumb-metacarpal": [0.255, 0.182, 0.588],
    "thumb-phalanx-proximal": [0.175, 0.021, 0],
    "thumb-phalanx-distal": [-0.189, 0, 0],
  },
  {
    "thumb-metacarpal": [0.441, 0.189, 0.642],
    "thumb-phalanx-proximal": [0.146, -0.033, 0],
    "thumb-phalanx-distal": [-0.212, 0, 0],
  },
  {
    "thumb-metacarpal": [0.627, 0.195, 0.696],
    "thumb-phalanx-proximal": [0.117, -0.086, 0],
    "thumb-phalanx-distal": [-0.234, 0, 0],
  },
  {
    "thumb-metacarpal": [0.603, 0.584, 0.752],
    "thumb-phalanx-proximal": [0.114, 0.12, 0],
    "thumb-phalanx-distal": [1.127, 0, 0],
  },
];

it_session(
  "Programmed thumb motion leaves a visible trail around the hand",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "thumb-reach",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    await session.gesture(primaryHand, "relaxed");
    await session.teleportHand(primaryHand, [
      primaryHand === "left" ? -0.18 : 0.18,
      1.2,
      -0.6,
    ]);
    await session.lookAtTarget({ tag: "thumb-sweep-guide" });
    const before = (await session.getScreenshot()) as string;

    await performThumbSweep(session, primaryHand);
    await session.wait(300);
    const reachedView = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify that thumb joint movement records a visible reach. Required changes: The initial view has a clear hand-following guide without a completed trail. After the programmed thumb rotations, a visible trail and translucent reach envelope remain around the hand.",
      evidence: [
        { type: "image", label: "Before thumb movement", image: before },
        { type: "image", label: "Completed thumb reach", image: reachedView },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function performThumbSweep(session: XRBlocksSession, hand: PhysicalHand) {
  for (const pose of THUMB_SWEEP_POSES) {
    await session.setHandPose(hand, pose);
    await session.wait(150);
  }
}
