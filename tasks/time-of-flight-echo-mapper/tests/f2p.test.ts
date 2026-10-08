import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "Moving and activating the probe shows rays reflecting from room surfaces",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "time-of-flight-echo-mapper",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    await session.lookAtTarget({ tag: "echo-probe-source" });
    await session.pointTo(primaryHand, { tag: "echo-probe-source" });
    await session.startSelect(primaryHand);
    const floorTarget = await session.getPresetLocation("floor-secondary");
    await session.lookAtTarget(floorTarget);
    await session.pointTo(primaryHand, floorTarget);
    await session.endSelect(primaryHand);
    await session.stepFrame(20);

    await session.rayClick(primaryHand, { tag: "activate-echo-probe" });
    await session.wait(2_000);
    const completed = (await session.getScreenshot()) as string;

    await session.rayClick(primaryHand, { tag: "replay-echoes" });
    await session.stepFrame(8);
    const replayed = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify an room scan after one probe move, followed by Replay. Required changes: Activating the relocated probe shows visible ray paths extending to first-hit markers on room surfaces. Each hit has a reflected return segment and distance label. Replay clears all scan results and returns the probe to its ready state.",
      evidence: [
        { type: "image", label: "Echo scan", image: completed },
        { type: "image", label: "After Replay", image: replayed },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
