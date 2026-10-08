import {
  expect,
  it_session,
  judgeTrajectory,
  VerifierError,
} from "@xrblocks/devtools/test";

it_session(
  "The particle responds to model orientation and the reached target turns green",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "bppv-balance-disruption-orientation",
    realTime: true,
  },
  async (session) => {
    await session.stepFrame(20);
    const result = await session.act(
      "Use the controller ray to select and rotate the model so the particle moves toward the active canal target. Use: inner-ear-model, canal-particle, canal-target, illuminated-canal-path, anatomy-completion-card. Stop when the particle responds to model orientation and the reached target turns green.",
      { maxTurns: 36, timeoutMs: 180_000 },
    );
    if (result.status === "model_error" || result.status === "aborted")
      throw new VerifierError(`Actor did not complete: ${result.status}`);
    const view = (await session.getScreenshot()) as string;
    const verdict = await judgeTrajectory({
      requirement:
        "Objective: Verify that rotating the transparent inner-ear model moves its visible particle through a semicircular canal. Required changes: The particle moves toward the active numbered canal target as the model rotates, and the reached target turns green.",
      trajectory: result.trajectory,
      evidence: [{ type: "image", label: "Final user view", image: view }],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
