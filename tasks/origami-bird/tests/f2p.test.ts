import { expect, it_session, judge } from "@xrblocks/devtools/test";
import type {
  PhysicalHand,
  Vec3Tuple,
  XRBlocksSession,
} from "@xrblocks/devtools";

const PALM_LIFT_METERS = 0.12;
const CENTERED_PALM_OFFSET: Vec3Tuple = [0, -0.15, -0.45];

it_session(
  "an open palm lands the bird and an upward lift restarts the loop",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "origami-bird",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);

    const palmPosition = await getCenteredPalmPosition(session);
    await placePalm(session, primaryHand, palmPosition, "up");
    await session.lookAtTarget(palmPosition);
    await session.wait(10_000);
    const landed = (await session.getScreenshot()) as string;

    // Lifting the supporting hand sends the bird back into flight.
    await session.moveHand(primaryHand, { upMeters: PALM_LIFT_METERS });
    await session.wait(1_000);
    const afterLift = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify one Origami Bird landing and takeoff. Required changes: the paper bird is visibly resting on that hand after a ten second wait. One second after the supporting hand lifts, the bird is no longer resting on the hand and has returned to flight.",
      evidence: [
        {
          type: "image",
          label: "Bird landed after ten seconds",
          image: landed,
        },
        {
          type: "image",
          label: "Bird one second after hand lift",
          image: afterLift,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "a face-up fist does not land the bird",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "origami-bird-face-up-fist",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);

    const palmPosition = await getCenteredPalmPosition(session);
    await placePalm(session, primaryHand, palmPosition, "up");
    await session.lookAtTarget(palmPosition);
    await session.gesture(primaryHand, "fist");
    await session.wait(3_000);

    const afterHold = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify that Origami Bird requires an open palm for landing. Required result: After the upward-facing fist remains fixed for three seconds, the paper bird is not resting on or attached to the fist and remains in flight.",
      evidence: [
        {
          type: "image",
          label: "Face-up fist after three seconds",
          image: afterHold,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function placePalm(
  session: XRBlocksSession,
  hand: PhysicalHand,
  target: Vec3Tuple,
  facing: "up" | "down",
) {
  await session.gesture(hand, "relaxed");
  if (facing === "up") {
    await session.rotateHand(hand, { rollDegrees: 180 });
  }
  await session.rotateHand(hand, { pitchDegrees: -60 });
  await session.teleportHand(hand, target, { anchor: "palm-center" });
}

async function getCenteredPalmPosition(
  session: XRBlocksSession,
): Promise<Vec3Tuple> {
  const camera = (await session.getCamera()) as unknown as {
    position: Vec3Tuple;
  };
  return [
    camera.position[0] + CENTERED_PALM_OFFSET[0],
    camera.position[1] + CENTERED_PALM_OFFSET[1],
    camera.position[2] + CENTERED_PALM_OFFSET[2],
  ];
}

it_session(
  "a downward-facing palm does not land the bird",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "origami-bird-invalid-gesture",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);

    const palmPosition = await getCenteredPalmPosition(session);
    await placePalm(session, primaryHand, palmPosition, "down");
    await session.lookAtTarget(palmPosition);
    await session.wait(3_000);

    const verdict = await judge({
      prompt:
        "Objective: Verify that Origami Bird requires an upward-facing open palm for landing. Required result: After the centered downward-facing open palm remains fixed for three seconds, the paper bird is not resting on or attached to the palm and remains in flight.",
      evidence: [
        {
          type: "image",
          label: "Downward-facing palm after three seconds",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
