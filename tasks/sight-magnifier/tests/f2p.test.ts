import type { PhysicalHand, XRBlocksSession } from "@xrblocks/devtools";
import {
  expectNotVisible,
  expect,
  it_session,
  judge,
} from "@xrblocks/devtools/test";

it_session(
  "The two-hand pose gates the enclosed magnifier",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "sight-magnifier",
    realTime: true,
  },
  async (session) => {
    await session.stepFrame(20);
    await expectNotVisible(session, "magnifier-frame");
    await expectNotVisible(session, "magnified-region");

    await prepareFrameHands(session);
    await formUShape(session);
    await session.stepFrame(20);
    await expectNotVisible(session, "magnifier-frame");
    await expectNotVisible(session, "magnified-region");

    await formMagnifierFrame(session);
    await session.stepFrame(20);
    const view = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify the two-hand magnifier. Required changes: Two L-shaped hands form diagonal corners of one rectangular border with opposite palm directions, and only the scene inside the border is magnified.",
      evidence: [{ type: "image", label: "Final user view", image: view }],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);

    await session.gesture("left", "relaxed");
    await session.gesture("right", "relaxed");
    await session.stepFrame(8);
    await expectNotVisible(session, "magnifier-frame");
    await expectNotVisible(session, "magnified-region");
  },
);

async function prepareFrameHands(session: XRBlocksSession) {
  await setLHandPose(session, "left");
  await setLHandPose(session, "right");
  await session.rotateHand("left", { pitchDegrees: 90, yawDegrees: 45 });
  await session.rotateHand("right", {
    pitchDegrees: -90,
    rollDegrees: 70,
  });
}

async function formMagnifierFrame(session: XRBlocksSession) {
  // Undo the temporary U rotation and restore the known-good box pose exactly.
  await session.rotateHand("right", { rollDegrees: -180 });
  await session.teleportHand("left", [-0.2, 1.14, -0.8]);
  await session.teleportHand("right", [0.2, 1.46, -0.8]);
}

async function formUShape(session: XRBlocksSession) {
  // Turn the right L upright so the equal-height hands form an invalid U.
  await session.rotateHand("right", { rollDegrees: 180 });
  await session.teleportHand("left", [-0.2, 1.3, -0.8]);
  await session.teleportHand("right", [0.2, 1.3, -0.8]);
}

async function setLHandPose(session: XRBlocksSession, hand: PhysicalHand) {
  await session.gesture(hand, "pointing");
  await session.setHandPose(hand, {
    "thumb-metacarpal": hand === "left" ? [0, -0.25, 0] : [0, 0, 0],
    "thumb-phalanx-proximal": [0, 0, 0],
    "thumb-phalanx-distal": [0, 0, 0],
    "index-finger-metacarpal": [0, 0, 0],
    "index-finger-phalanx-proximal": [0, 0, 0],
    "index-finger-phalanx-intermediate": [0, 0, 0],
    "index-finger-phalanx-distal": [0, 0, 0],
  });
}
