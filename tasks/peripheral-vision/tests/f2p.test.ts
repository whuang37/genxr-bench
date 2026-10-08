import {
  expect,
  it_session,
  judge,
  judgeTrajectory,
  VerifierError,
} from "@xrblocks/devtools/test";

it_session(
  "all six shape changes accept a pinch and change the same target color",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "peripheral-vision",
    realTime: true,
  },
  async (session) => {
    await session.stepFrame(20);
    const initial = (await session.getScreenshot()) as string;

    const result = await session.act(
      "Keep the head-direction-guide green and watch the center-marker. Complete all six trials. Each time one side-attention-target visibly changes shape, pinch before its response window ends. Do not reach toward a side target. Stop only after the attention-practice-summary is visible.",
      { maxTurns: 48, timeoutMs: 180_000 },
    );
    if (result.status === "model_error" || result.status === "aborted") {
      throw new VerifierError(`Actor stopped with status ${result.status}.`);
    }

    const finalView = (await session.getScreenshot()) as string;
    const verdict = await judgeTrajectory({
      requirement:
        "Objective: Verify all peripheral-attention trials. Required changes: One side target changes shape at a time, a prompt pinch turns that target green and advances the counter, and the final view shows a nonclinical summary for six completed trials.",
      trajectory: result.trajectory,
      evidence: [
        { type: "image", label: "Initial attention practice", image: initial },
        {
          type: "image",
          label: "Completed six-trial summary",
          image: finalView,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "missing a shape change leaves the score at zero",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "peripheral-vision-miss",
    realTime: true,
  },
  async (session) => {
    await session.stepFrame(20);

    const result = await session.act(
      "Keep the head-direction-guide green and watch the center-marker. Do not pinch or make any response. Stop as soon as one side-attention-target visibly changes shape.",
      { maxTurns: 16, timeoutMs: 30_000 },
    );
    if (result.status === "model_error" || result.status === "aborted") {
      throw new VerifierError(`Actor stopped with status ${result.status}.`);
    }

    await session.wait(15_250);
    const verdict = await judge({
      prompt:
        "Objective: Verify missed-response feedback. Required changes: With no pinch during the response window, the visible score remains 0 of 6, Missed feedback appears, and no final summary is shown.",
      evidence: [
        {
          type: "image",
          label: "First trial after no response",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
