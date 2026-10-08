import {
  expect,
  it_session,
  judgeTrajectory,
  VerifierError,
} from "@xrblocks/devtools/test";

it_session(
  "The visible storm advances one step and Reset restores the first shape",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "astraphobia-oasis",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    await session.navigateTo(await session.getPresetLocation("wall-view"));
    await session.lookAtTarget({ tag: "storm-window" });
    const initialView = (await session.getScreenshot()) as string;
    const result = await session.act(
      "Trace the active grounding-shape as one continuous gesture. Aim at grounding-trace-start and begin selecting exactly there. Keep the pinch held while you follow the complete outline back to the start. Do not release early. Release only after the outline fills with light and the storm-window advances one step toward calm rain, then stop.",
      { maxTurns: 36, timeoutMs: 180_000 },
    );
    if (result.status === "model_error" || result.status === "aborted") {
      throw new VerifierError(`Actor stopped with status ${result.status}.`);
    }
    const progressedView = (await session.getScreenshot()) as string;

    await session.rayClick(primaryHand, { tag: "storm-reset-control" });
    await session.stepFrame(12);
    const resetView = (await session.getScreenshot()) as string;

    const verdict = await judgeTrajectory({
      requirement:
        "Objective: Verify that tracing one of four visible outline shapes calms a storm shown in a wall-mounted virtual window. Required changes: The active outline fills with light and the rain in the window becomes visibly calmer. Reset clears that progress, restores the stronger initial storm, and highlights the first outline again.",
      trajectory: result.trajectory,
      evidence: [
        { type: "image", label: "Initial storm", image: initialView },
        {
          type: "image",
          label: "After one completed shape",
          image: progressedView,
        },
        { type: "image", label: "After Reset", image: resetView },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
