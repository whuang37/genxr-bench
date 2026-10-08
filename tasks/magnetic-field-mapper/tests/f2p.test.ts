import {
  expect,
  it_session,
  judge,
  judgeTrajectory,
  VerifierError,
} from "@xrblocks/devtools/test";

it_session(
  "At the magnet's final pose, visible field lines leave its north pole and return to its south pole",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "magnetic-field-mapper",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "bar-magnet" });

    const before = (await session.getScreenshot()) as string;

    await session.pointTo(primaryHand, { tag: "bar-magnet" });
    await session.startSelect(primaryHand);
    await session.moveHand(primaryHand, {
      upMeters: 0.1,
      forwardMeters: -0.1,
    });
    await session.endSelect(primaryHand);
    await session.stepFrame(12);

    const screenshot = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify field response to magnet movement. Required changes: The visible field-line pattern changes with the magnet and remains connected to its north and south poles at the final pose.",
      evidence: [
        {
          type: "image",
          label: "Before moving the magnet",
          image: before,
        },
        {
          type: "image",
          label: "After moving the magnet",
          image: screenshot,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "placing like poles together bends field paths away",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "magnetic-field-mapper-like-poles",
    realTime: true,
  },
  async (session) => {
    const result = await session.act(
      "Use the controller ray to select, move, and rotate the visible bar magnets so like poles face each other. Stop when the field paths visibly bend away and at least one target ring is red.",
      { maxTurns: 28, timeoutMs: 80_000 },
    );
    if (result.status === "model_error" || result.status === "aborted") {
      throw new VerifierError(`Actor stopped with status ${result.status}.`);
    }
    const view = (await session.getScreenshot()) as string;
    const verdict = await judgeTrajectory({
      requirement:
        "Objective: Verify the like-pole field pattern. Required changes: The magnets finish with like poles facing, the visible field paths bend away from the gap, and at least one missed target ring is red.",
      trajectory: result.trajectory,
      evidence: [{ type: "image", label: "Final field", image: view }],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
