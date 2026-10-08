import {
  expect,
  it_session,
  judgeTrajectory,
  VerifierError,
} from "@xrblocks/devtools/test";

it_session(
  "Moving a slit plate changes the pattern and Replay resets it",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "quantum-double-slit-bench",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    const plates = await session.objects.findByTag("slit-plate");
    expect(plates.length).toBeGreaterThan(0);
    await session.lookAtTarget({ tag: "slit-plate", id: plates[0].id });
    const before = (await session.getScreenshot()) as string;

    const result = await session.act(
      `Use the ${primaryHand} controller ray to select one slit-plate and slide it a clear distance along its rail, then release it. Confirm that the slit spacing and visible wall interference-wave pattern change. Then ray-select slit-replay once. Stop after Replay restores the initial plate arrangement, spacing, and wave pattern.`,
      { maxTurns: 12, timeoutMs: 60_000 },
    );
    if (result.status === "model_error" || result.status === "aborted") {
      throw new VerifierError(`Slit movement actor stopped: ${result.status}`);
    }

    const replayed = (await session.getScreenshot()) as string;
    const verdict = await judgeTrajectory({
      requirement:
        "Objective: Verify slit-spacing response and Replay. Required sequence: One slit plate moves a clear distance along its rail and remains at the changed position after release. The displayed slit spacing and visible wall interference-wave pattern change in response. Replay is then selected and restores the initial plate arrangement, spacing value, and wave pattern.",
      trajectory: result.trajectory,
      evidence: [
        {
          type: "image",
          label: "Initial slit spacing and waves",
          image: before,
        },
        {
          type: "image",
          label: "Slit spacing and waves after Replay",
          image: replayed,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
