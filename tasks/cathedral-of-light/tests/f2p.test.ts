import {
  expect,
  it_session,
  judgeTrajectory,
  VerifierError,
} from "@xrblocks/devtools/test";

it_session(
  "A compatible glass piece locks into its window slot",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "cathedral-of-light",
    realTime: true,
  },
  async (session) => {
    await session.stepFrame(10);

    const result = await session.act(
      "Choose one glass-piece and its visibly compatible window-slot. Move the piece directly into that slot without rotating it, then release it. Stop when the piece remains visibly locked in the window.",
      { maxTurns: 32, timeoutMs: 150_000 },
    );
    if (result.status === "model_error" || result.status === "aborted") {
      throw new VerifierError(`Actor stopped with status ${result.status}.`);
    }

    const verdict = await judgeTrajectory({
      requirement:
        "Objective: Verify stained-glass placement without rotation. Required changes: One compatible glass piece is moved directly into its matching slot, released, and remains visibly locked in the window.",
      trajectory: result.trajectory,
      evidence: [
        {
          type: "image",
          label: "Locked glass piece",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
