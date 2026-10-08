import {
  expect,
  it_session,
  judgeTrajectory,
  VerifierError,
} from "@xrblocks/devtools/test";

it_session(
  "A correct waveform card locks beside its matching torso zone",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "diagnostic-sound-map",
    realTime: true,
  },
  async (session) => {
    await session.stepFrame(20);
    const result = await session.act(
      "Complete one match. Direct-touch one matching-lung-zone once so its waveform is visible. Compare that waveform with the three waveform-card patterns. Ray-select the one card with the same visible pattern, drag it to that same zone, and release it once. Stop as soon as one matched-waveform-card remains visibly locked beside the torso. Do not try to match the other cards.",
      { maxTurns: 24, timeoutMs: 120_000 },
    );
    if (result.status === "model_error" || result.status === "aborted") {
      throw new VerifierError(`Actor stopped with status ${result.status}.`);
    }
    const verdict = await judgeTrajectory({
      requirement:
        "Objective: Verify that one floating sound-waveform card matches a marked area on the torso model. Required changes: Releasing the card at its matching body area leaves it visibly locked beside that area.",
      trajectory: result.trajectory,
      evidence: [
        {
          type: "image",
          label: "Matched card",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "A waveform card returns when released at a wrong zone",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "diagnostic-sound-map-wrong-zone",
    realTime: true,
  },
  async (session) => {
    await session.stepFrame(20);
    const result = await session.act(
      "Complete one rejected placement. Ray-select one available waveform-card, drag it directly to one visibly incompatible nonmatching-lung-zone, and release it once. Stop as soon as that card returns to the available-card area. Do not try another card or zone.",
      { maxTurns: 20, timeoutMs: 90_000 },
    );
    if (result.status === "model_error" || result.status === "aborted") {
      throw new VerifierError(`Actor stopped with status ${result.status}.`);
    }
    const verdict = await judgeTrajectory({
      requirement:
        "Objective: Verify that a sound-waveform card is rejected by the wrong marked area on the torso model. Required changes: The card does not remain at the wrong body area and visibly returns to the available-card area.",
      trajectory: result.trajectory,
      evidence: [
        {
          type: "image",
          label: "Returned card",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
