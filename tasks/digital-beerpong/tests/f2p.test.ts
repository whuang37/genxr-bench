import type {
  PhysicalHand,
  Vec3Tuple,
  XRBlocksSession,
} from "@xrblocks/devtools";
import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "Throwing a spawned ball downward into a cup scores",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "digital-beerpong",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(40);
    const cups = await session.objects.findByTag("beerpong-cup");
    expect(cups.length).toBeGreaterThan(0);
    const cupTarget = { tag: "beerpong-cup", id: cups[0].id };
    const cup = (await session.objects.inspect(cupTarget)).worldTransform
      .position;
    await session.navigateTo([cup[0], cup[1] + 0.65, cup[2] + 0.08]);
    await session.lookAtTarget(cupTarget);
    const initial = (await session.getScreenshot()) as string;
    const start: Vec3Tuple = [cup[0], cup[1] + 0.35, cup[2]];
    const end: Vec3Tuple = [cup[0], cup[1] + 0.1, cup[2]];

    await throwBall(session, primaryHand, start, end, 0.8);
    await session.wait(1_000);

    const afterScore = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify automatic cup setup and scoring. Required changes: Six cups begin on a horizontal room surface without a placement step, and the downward pinch throw from above visibly scores the target cup.",
      evidence: [
        { type: "image", label: "Automatic cup layout", image: initial },
        { type: "image", label: "After direct score", image: afterScore },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "A ball thrown away from the cups is removed from the runtime",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "digital-beerpong-miss",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(40);
    const table = await session.getPresetLocation("table-primary");
    const wall = await session.getPresetLocation("wall-secondary");
    await session.teleportTo(table);
    const cups = await session.objects.findByTag("beerpong-cup");
    expect(cups.length).toBeGreaterThan(0);
    const cup = (
      await session.objects.inspect({ tag: "beerpong-cup", id: cups[0].id })
    ).worldTransform.position;
    await session.lookAtTarget(cup);
    const away = horizontalDirection(cup, wall);
    const start: Vec3Tuple = [table[0], table[1] + 0.4, table[2]];
    const end: Vec3Tuple = [
      start[0] + away[0] * 0.35,
      start[1] + 0.05,
      start[2] + away[2] * 0.35,
    ];

    await throwBall(session, primaryHand, start, end, 1.3);
    await session.wait(1_000);
    expect(await session.objects.findByTag("beerpong-ball")).toHaveLength(1);
    const missedThrow = (await session.getScreenshot()) as string;
    await waitForNoBall(session, 5_500);
    expect(await session.objects.findByTag("beerpong-ball")).toHaveLength(0);
    const afterCleanup = (await session.getScreenshot()) as string;

    await replay(session, primaryHand);
    expect(await session.objects.findByTag("beerpong-ball")).toHaveLength(0);
    const afterReplay = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify missed-ball cleanup and Replay. Required changes: The missed ball is gone after the cleanup delay, and Replay restores six cups with no active ball.",
      evidence: [
        { type: "image", label: "Miss traveling away", image: missedThrow },
        {
          type: "image",
          label: "Five seconds after miss",
          image: afterCleanup,
        },
        { type: "image", label: "After Replay", image: afterReplay },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "A faster hand movement releases the ball with more velocity",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "digital-beerpong-velocity",
    realTime: true,
  },
  async (session, { primaryHand, secondaryHand }) => {
    await session.stepFrame(40);

    const slowDistance = await throwAndMeasureTravel(session, primaryHand, 0.4);

    await replay(session, secondaryHand);

    const fastDistance = await throwAndMeasureTravel(session, primaryHand, 3);

    expect(fastDistance).toBeGreaterThan(slowDistance);
  },
);

async function throwBall(
  session: XRBlocksSession,
  hand: PhysicalHand,
  start: Vec3Tuple,
  end: Vec3Tuple,
  speedMetersPerSecond: number,
): Promise<void> {
  await session.gesture(hand, "relaxed");
  await session.reachTo(hand, start);
  await session.gesture(hand, "pinching");
  await session.stepFrame(3);
  await session.reachTo(hand, end, { speedMetersPerSecond });
  await session.gesture(hand, "relaxed");
}

async function throwAndMeasureTravel(
  session: XRBlocksSession,
  hand: PhysicalHand,
  speedMetersPerSecond: number,
): Promise<number> {
  await session.gesture(hand, "relaxed");
  await session.gesture(hand, "pinching");
  await session.stepFrame(3);

  const releaseDurationMs = 500;
  const releaseDistance = speedMetersPerSecond * (releaseDurationMs / 1_000);
  const releaseControl = {
    move: [0, 0, -releaseDistance],
    pose: "relaxed",
  };
  await session.stepControl({
    durationMs: releaseDurationMs,
    control:
      hand === "left"
        ? { leftHand: releaseControl }
        : { rightHand: releaseControl },
  });

  const balls = await session.objects.findByTag("beerpong-ball");
  expect(balls).toHaveLength(1);
  const ballTarget = { tag: "beerpong-ball", id: balls[0].id };
  const releasedAt = (await session.objects.inspect(ballTarget)).worldTransform
    .position;

  await session.wait(100);
  const movedTo = (await session.objects.inspect(ballTarget)).worldTransform
    .position;
  const distance = horizontalDistance(releasedAt, movedTo);

  await session.moveHand(hand, { forwardMeters: -releaseDistance });
  return distance;
}

async function replay(session: XRBlocksSession, hand: PhysicalHand) {
  await session.rayClick(hand, { tag: "beerpong-replay" });
  await session.stepFrame(24);
}

async function waitForNoBall(
  session: XRBlocksSession,
  timeoutMs: number,
): Promise<void> {
  const attempts = Math.ceil(timeoutMs / 1_000);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if ((await session.objects.findByTag("beerpong-ball")).length === 0) return;
    await session.wait(1_000);
  }
  throw new Error("The missed ball did not clear within the allowed time.");
}

function horizontalDirection(from: Vec3Tuple, to: Vec3Tuple): Vec3Tuple {
  const x = to[0] - from[0];
  const z = to[2] - from[2];
  const length = Math.hypot(x, z);
  if (length === 0) throw new Error("Throw direction must have distance.");
  return [x / length, 0, z / length];
}

function horizontalDistance(from: Vec3Tuple, to: Vec3Tuple): number {
  return Math.hypot(to[0] - from[0], to[2] - from[2]);
}
