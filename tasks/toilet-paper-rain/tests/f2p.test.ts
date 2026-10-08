import {
  captureOutputSnapshot,
  expect,
  it_session,
  judge,
} from "@xrblocks/devtools/test";

const MAX_ACTIVE_ROLLS = 50;

it_session(
  "Toilet paper rolls are visible falling through the room",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "toilet-paper-rain",
    realTime: true,
  },
  async (session) => {
    await session.rotate({ pitchDegrees: -15 });
    await session.stepFrame(10);

    const evidence = [];
    for (let checkpoint = 1; checkpoint <= 5; checkpoint += 1) {
      const snapshot = await captureOutputSnapshot(session, {
        tags: ["falling-toilet-paper-roll"],
      });
      expect(snapshot.outputs.length).toBeLessThanOrEqual(MAX_ACTIVE_ROLLS);

      evidence.push({
        type: "image" as const,
        label: `Toilet paper rain checkpoint ${checkpoint}`,
        image: (await session.getScreenshot()) as string,
      });
      if (checkpoint < 5) await session.wait(2_500);
    }

    const verdict = await judge({
      prompt:
        "Objective: Verify the passive toilet paper rain. Required result: The evidence sequence shows recognizable toilet paper rolls falling through the room. A roll does not need to appear in every checkpoint.",
      evidence,
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
