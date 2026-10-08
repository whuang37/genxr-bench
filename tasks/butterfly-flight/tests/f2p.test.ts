import {
  expectNotVisible,
  expect,
  it_session,
  judge,
  judgeTrajectory,
  VerifierError,
  expectVisible,
} from "@xrblocks/devtools/test";

it_session(
  "Translating the hand without wrist rotation does not clear a flight ring",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "butterfly-flight-translation",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    await session.gesture(primaryHand, "fist");
    await session.moveHand(primaryHand, { upMeters: 0.1 });
    await session.wait(300);
    await expectNotVisible(session, "butterfly-completion");
    await expectVisible(session, "wrist-butterfly");
    await expectVisible(session, "butterfly-flight-ring");
  },
);

it_session(
  "Opening the active hand resets the route and either fist can restart it",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "butterfly-flight",
    realTime: true,
  },
  async (session, { primaryHand, secondaryHand }) => {
    await session.stepFrame(20);
    const initial = (await session.getScreenshot()) as string;

    await session.gesture(primaryHand, "fist");
    const result = await session.act(
      `Keep the ${primaryHand} fist closed and rotate its wrist until the butterfly passes through one active butterfly-flight-ring. Finish after that ring turns green and one visible trail segment appears.`,
      { maxTurns: 36, timeoutMs: 180_000 },
    );
    if (result.status === "model_error" || result.status === "aborted")
      throw new VerifierError(`Actor did not complete: ${result.status}`);
    const progressed = (await session.getScreenshot()) as string;

    const progressVerdict = await judgeTrajectory({
      requirement:
        "Objective: Verify one completed flight-ring pass. Required changes: The crossed ring turns green and one visible trail segment appears.",
      trajectory: result.trajectory,
      evidence: [
        { type: "image", label: "Initial idle state", image: initial },
        { type: "image", label: "Progress before reset", image: progressed },
      ],
    });
    expect(progressVerdict.verdict, progressVerdict.reason).toBe(true);

    await session.gesture(primaryHand, "relaxed");
    await session.wait(500);
    const reset = (await session.getScreenshot()) as string;

    await session.gesture(secondaryHand, "fist");
    await session.wait(500);
    const restarted = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify route reset and hand switching. Required changes: Opening the active hand restores six uncleared rings and an empty trail. Closing the other hand starts a fresh route with the butterfly following that wrist.",
      evidence: [
        { type: "image", label: "Initial idle state", image: initial },
        { type: "image", label: "Progress before reset", image: progressed },
        { type: "image", label: "After opening active hand", image: reset },
        { type: "image", label: "Restarted with other fist", image: restarted },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
