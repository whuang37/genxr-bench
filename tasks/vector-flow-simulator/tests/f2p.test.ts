import {
  captureOutputSnapshot,
  expect,
  it_session,
  judge,
} from "@xrblocks/devtools/test";

const PRESETS = [
  { tag: "vector-preset-east-wind", label: "East Wind" },
  { tag: "vector-preset-helical-vortex", label: "Helical Vortex" },
  { tag: "vector-preset-wall-push", label: "Wall Push" },
] as const;

it_session(
  "Each vector preset shows its field and moves the ball",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "vector-flow-simulator",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "vector-flow-ball" });
    const evidence: Array<{
      type: "image";
      label: string;
      image: string;
    }> = [];

    for (const preset of PRESETS) {
      evidence.push({
        type: "image",
        label: `Before selecting ${preset.label}`,
        image: (await session.getScreenshot()) as string,
      });
      await session.rayClick(primaryHand, { tag: preset.tag });
      await session.wait(1_000);
      evidence.push({
        type: "image",
        label: `After selecting ${preset.label}`,
        image: (await session.getScreenshot()) as string,
      });
    }

    const verdict = await judge({
      prompt:
        "Objective: Verify three presets that show a mathematical arrow field acting on a visible ball. Required changes: Selecting East Wind, Helical Vortex, and Wall Push changes the displayed equation and arrow pattern, and the ball changes position in response to each field.",
      evidence,
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "Wall Push moves the ball to the wall without leaving the room",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "vector-flow-simulator-wall-push",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    const beforeSnapshot = await captureOutputSnapshot(session, {
      tags: ["vector-flow-ball"],
    });
    const beforeBall = beforeSnapshot.outputs[0];
    if (!beforeBall?.bounds) {
      throw new Error("The vector ball has no initial world bounds.");
    }
    await session.lookAtTarget({ tag: "vector-flow-ball" });
    const before = (await session.getScreenshot()) as string;
    await session.rayClick(primaryHand, { tag: "vector-preset-wall-push" });
    await session.wait(3_000);

    const afterSnapshot = await captureOutputSnapshot(session, {
      tags: ["vector-flow-ball"],
    });
    const afterBall = afterSnapshot.outputs[0];
    if (!afterBall?.bounds) {
      throw new Error("The vector ball has no final world bounds.");
    }
    expect(afterBall.render.displayed).toBe(true);
    expect(afterBall.bounds.center[2]).toBeLessThan(
      beforeBall.bounds.center[2] - 0.1,
    );

    const verdict = await judge({
      prompt:
        "Objective: Verify the Wall Push field moves the durable physics ball toward a room boundary without losing it. Required changes: The final view keeps the same ball visible at or near a wall after clear movement in the negative-Z direction. Accept bouncing or rolling and do not require exact wall coordinates.",
      evidence: [
        { type: "image", label: "Before Wall Push", image: before },
        {
          type: "image",
          label: "Ball after Wall Push",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
