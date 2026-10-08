import type {
  PhysicalHand,
  Vec3Tuple,
  XRBlocksSession,
} from "@xrblocks/devtools";
import {
  captureOutputSnapshot,
  expect,
  expectOnSurface,
  it_session,
  judge,
} from "@xrblocks/devtools/test";

const BOARD_TAG = "dartboard";
const SCORE_TAG = "dart-score";

it_session(
  "a dart that hits the board remains stuck and changes the score",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "wall-darts",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    await placeBoard(session, primaryHand);
    const before = (await session.getScreenshot()) as string;

    await session.teleportTo({ tag: BOARD_TAG }, { distance: 0.5 });
    await session.wait(1_000);
    const board = (await session.objects.inspect({ tag: BOARD_TAG }))
      .worldTransform.position;
    const camera = (await session.getCamera()) as { position: Vec3Tuple };
    const towardBoard = horizontalDirection(camera.position, board);
    const start: Vec3Tuple = [
      board[0] - towardBoard[0] * 0.3,
      board[1],
      board[2] - towardBoard[2] * 0.3,
    ];
    const release: Vec3Tuple = [
      board[0] - towardBoard[0] * 0.08,
      board[1],
      board[2] - towardBoard[2] * 0.08,
    ];

    await throwDart(session, primaryHand, start, release, 0.9);
    await session.wait(1_000);

    await session.lookAtTarget({ tag: BOARD_TAG });
    await session.stepFrame(8);
    const stuckDart = (await session.getScreenshot()) as string;
    await session.teleportTo({ tag: SCORE_TAG }, { distance: 1.2 });
    await session.wait(1_000);
    await session.lookAtTarget({ tag: SCORE_TAG });
    await session.stepFrame(8);
    const scored = (await session.getScreenshot()) as string;
    await session.teleportTo(await session.getPresetLocation("start"), {
      faceTarget: false,
    });
    await session.wait(1_000);
    await session.rayClick(primaryHand, { tag: "replay-button" });
    await session.stepFrame(8);
    const resetScore = (await session.getScreenshot()) as string;
    await session.lookAtTarget({ tag: BOARD_TAG });
    await session.stepFrame(8);
    const clearedBoard = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify one scoring dart throw and Replay using separate board and scoreboard views. Required changes: The board view after the throw shows a visibly stuck dart, the following scoreboard view shows an increased score, the Replay score view resets the score, and the final board view removes the stuck dart.",
      evidence: [
        { type: "image", label: "Before throw", image: before },
        {
          type: "image",
          label: "Dart stuck in board",
          image: stuckDart,
        },
        {
          type: "image",
          label: "Score after hit",
          image: scored,
        },
        { type: "image", label: "Score after Replay", image: resetScore },
        { type: "image", label: "Board after Replay", image: clearedBoard },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function placeBoard(
  session: XRBlocksSession,
  hand: PhysicalHand,
): Promise<void> {
  expect(await session.objects.findByTag(BOARD_TAG)).toHaveLength(0);
  await session.navigateTo(await session.getPresetLocation("wall-view"));
  const wall = await session.getPresetLocation("wall-primary");
  await session.lookAtTarget(wall);
  await session.pointTo(hand, wall);
  await session.click(hand);
  await session.stepFrame(12);
  const placement = await captureOutputSnapshot(session, { tags: [BOARD_TAG] });
  expectOnSurface(placement, BOARD_TAG, {
    toleranceMeters: 0.08,
  });
}

async function throwDart(
  session: XRBlocksSession,
  hand: PhysicalHand,
  start: Vec3Tuple,
  release: Vec3Tuple,
  speedMetersPerSecond: number,
): Promise<void> {
  await session.gesture(hand, "relaxed");
  await session.reachTo(hand, start);
  await session.gesture(hand, "pinching");
  await session.stepFrame(3);
  await session.reachTo(hand, release, { speedMetersPerSecond });
  await session.gesture(hand, "relaxed");
}

function horizontalDirection(from: Vec3Tuple, to: Vec3Tuple): Vec3Tuple {
  const x = to[0] - from[0];
  const z = to[2] - from[2];
  const length = Math.hypot(x, z);
  if (length === 0) throw new Error("Throw direction must have distance.");
  return [x / length, 0, z / length];
}
