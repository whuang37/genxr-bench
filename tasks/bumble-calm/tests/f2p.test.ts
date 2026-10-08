import {
  expect,
  it_session,
  judgeTrajectory,
  VerifierError,
} from "@xrblocks/devtools/test";
import type { PhysicalHand, XRBlocksSession } from "@xrblocks/devtools";

it_session(
  "A steady open-palm hold lands the bee",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "bumble-calm",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    const ringCenter = (
      await session.objects.inspect({ tag: "palm-steadiness-ring" })
    ).worldTransform.position;
    await placePalmUp(session, primaryHand, ringCenter);
    const initial = (await session.getScreenshot()) as string;
    const result = await holdOpenPalmUntilComplete(session, primaryHand);
    const completed = (await session.getScreenshot()) as string;

    const verdict = await judgeTrajectory({
      requirement:
        "Objective: Verify the steady-palm calming interaction. Required changes: Keeping the center of an upward open palm inside the shrinking ring makes the bee approach and finish resting on the palm with the completed glow visible.",
      trajectory: result.trajectory,
      evidence: [
        { type: "image", label: "Palm placed in ring", image: initial },
        { type: "image", label: "Completed hold", image: completed },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "A face-up fist does not advance the steadiness ring",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "bumble-calm-face-up-fist",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    const ringCenter = (
      await session.objects.inspect({ tag: "palm-steadiness-ring" })
    ).worldTransform.position;
    await placePalmUp(session, primaryHand, ringCenter);
    await session.gesture(primaryHand, "fist");

    const before = (await session.getScreenshot()) as string;
    const result = await holdFistInRing(session, primaryHand);
    const after = (await session.getScreenshot()) as string;

    const verdict = await judgeTrajectory({
      requirement:
        "Objective: Verify that the calming hold requires an open palm. Required changes: The face-up fist remains centered inside the ring for at least five seconds, but the ring does not visibly fill or shrink and the bee does not begin approaching the hand.",
      trajectory: result.trajectory,
      evidence: [
        { type: "image", label: "Face-up fist at start", image: before },
        { type: "image", label: "Face-up fist after five seconds", image: after },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function placePalmUp(
  session: XRBlocksSession,
  hand: PhysicalHand,
  target: unknown,
) {
  await session.gesture(hand, "relaxed");
  await session.rotateHand(hand, { rollDegrees: 180 });
  await session.rotateHand(hand, { pitchDegrees: -60 });
  await session.teleportHand(hand, target, { anchor: "palm-center" });
}

async function holdOpenPalmUntilComplete(
  session: XRBlocksSession,
  hand: PhysicalHand,
) {
  const result = await session.act(
    `The ${hand} hand is already inside the palm steadiness ring with its open palm facing up. Using only small translations of that hand, keep the palm center inside the visible ring as it shrinks. Wait between corrections so the ten-second hold can progress. Do not navigate, rotate either hand, change either hand pose, or select anything. Stop only after the bee lands on the palm and the completed glow appears.`,
    { maxTurns: 20, timeoutMs: 60_000 },
  );
  if (result.status === "model_error" || result.status === "aborted") {
    throw new VerifierError(`Open-palm actor stopped: ${result.status}`);
  }
  return result;
}

async function holdFistInRing(session: XRBlocksSession, hand: PhysicalHand) {
  const result = await session.act(
    `The ${hand} hand is already inside the palm steadiness ring with a face-up fist pose. Using only small translations of that hand, center the fist in the visible ring and keep it there for at least five seconds. Do not navigate, rotate either hand, change either hand pose, or select anything. Stop after the fist has remained centered for at least five seconds.`,
    { maxTurns: 12, timeoutMs: 30_000 },
  );
  if (result.status === "model_error" || result.status === "aborted") {
    throw new VerifierError(`Fist actor stopped: ${result.status}`);
  }
  return result;
}
