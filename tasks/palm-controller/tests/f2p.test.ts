import type { PhysicalHand, XRBlocksSession } from "@xrblocks/devtools";
import { expect, it_session, judge } from "@xrblocks/devtools/test";
import * as THREE from "three";

it_session(
  "two palm targets select shapes and form the completed emblem",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "palm-controller",
    realTime: true,
  },
  async (session, { primaryHand: displayHand, secondaryHand: tappingHand }) => {
    await placePalmUp(session, displayHand);
    await session.gesture(tappingHand, "pointing");
    await session.wait(1_000);
    await session.lookAtTarget({ tag: "palm-target-1" });
    const originalTappingHandPosition = await indexFingertipPosition(
      session,
      tappingHand,
    );

    await session.reachTo(
      tappingHand,
      { tag: "palm-target-1" },
      {
        anchor: "index-tip",
      },
    );
    await session.wait(1_000);
    const shape1 = (await session.getScreenshot()) as string;

    await session.reachTo(
      tappingHand,
      await indexFingertipPosition(session, displayHand),
    );
    await session.wait(1_000);
    const afterFingerTap = (await session.getScreenshot()) as string;

    await session.reachTo(
      tappingHand,
      { tag: "palm-target-2" },
      {
        anchor: "index-tip",
      },
    );
    await session.wait(1_000);

    await session.reachTo(
      tappingHand,
      originalTappingHandPosition,
      {
        anchor: "index-tip",
      },
    );
    await session.wait(1_000);
    const completed = (await session.getScreenshot()) as string;

    await session.gesture(displayHand, "fist");
    await session.wait(1_000);
    await session.gesture(displayHand, "relaxed");
    await session.wait(1_000);
    const reset = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify palm-target selection, completion, and reset. Required changes: The upward-facing palm shows two targets. Target 1 shows its shape, a non-target fingertip touch leaves it unchanged, and selecting Target 2 completes an emblem combining both icons. Closing and reopening the display hand then removes the emblem and restores both unused targets.",
      evidence: [
        { type: "image", label: "Shape 1 selected", image: shape1 },
        {
          type: "image",
          label: "After non-target fingertip tap",
          image: afterFingerTap,
        },
        { type: "image", label: "Both shapes joined", image: completed },
        { type: "image", label: "Reset after fist and reopen", image: reset },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "the palm interface stays hidden when neither palm faces upward",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "palm-controller-hidden",
    realTime: true,
  },
  async (session, { primaryHand: displayHand, secondaryHand: tappingHand }) => {
    // The simulator's default relaxed-hand rotation faces the palm down.
    await session.gesture(displayHand, "relaxed");
    await session.gesture(tappingHand, "pointing");
    await session.wait(1_000);

    const verdict = await judge({
      prompt:
        "Objective: Verify that the palm interface stays hidden when neither palm faces upward. Required result: No numbered palm targets, raised shape, confirmation outline, or completed emblem is visible.",
      evidence: [
        {
          type: "image",
          label: "Palms not facing upward",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function placePalmUp(session: XRBlocksSession, hand: PhysicalHand) {
  await session.gesture(hand, "relaxed");
  await session.rotateHand(hand, { rollDegrees: 180 });
  await session.rotateHand(hand, { pitchDegrees: -60 });
  await session.teleportHand(hand, [hand === "left" ? -0.2 : 0.2, 1.2, -0.65]);
}

async function indexFingertipPosition(
  session: XRBlocksSession,
  hand: PhysicalHand,
): Promise<[number, number, number]> {
  const hands = (await session.getHands()) as unknown as {
    leftHand: {
      position: [number, number, number];
      quaternion: [number, number, number, number];
    };
    rightHand: {
      position: [number, number, number];
      quaternion: [number, number, number, number];
    };
  };
  const state = hand === "left" ? hands.leftHand : hands.rightHand;
  const localOffset =
    hand === "left"
      ? new THREE.Vector3(-0.0252, -0.1134, -0.0113)
      : new THREE.Vector3(0.027, -0.1136, -0.0103);
  const fingertip = localOffset
    .applyQuaternion(new THREE.Quaternion(...state.quaternion))
    .add(new THREE.Vector3(...state.position));

  return [fingertip.x, fingertip.y, fingertip.z];
}
