import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "Ray-selecting crank circles moves the four-bar linkage",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "four-bar-linkage",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "valid-length-set-tab" });

    const initial = (await session.getScreenshot()) as string;

    // Select the authored length set before advancing its crank cycle.
    await session.rayClick(primaryHand, { tag: "valid-length-set-tab" });
    await session.stepFrame(8);
    const motionSamples: string[] = [];
    for (let circle = 1; circle <= 4; circle += 1) {
      const circleTag = `crank-circle-${circle}`;

      // A click on the next circle advances the crank without a grab gesture.
      await session.rayClick(primaryHand, { tag: circleTag });
      await session.stepFrame(8);
      motionSamples.push((await session.getScreenshot()) as string);
    }

    // Reset returns the mechanism and circular targets to their initial state.
    await session.rayClick(primaryHand, { tag: "reset-linkage" });
    await session.stepFrame(8);
    const reset = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify that four circular controls advance and reset a connected four-bar mechanism. Required changes: The initial view has no active configuration or completion. The circles surround the rotating pivot without a grabbable handle. Each selection moves all connected bars together, extends the endpoint path trace, turns three path gates green in order, and finishes with visible completion. Reset restores the initial mechanism and clears the active and completion feedback.",
      evidence: [
        { type: "image", label: "Initial mechanism", image: initial },
        ...motionSamples.map((image, index) => ({
          type: "image" as const,
          label: `After selecting crank circle ${index + 1}`,
          image,
        })),
        { type: "image", label: "After Reset", image: reset },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
