import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "Detected-surface selections complete a measurement and Units converts its label",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "tape-measure",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    // These are ordinary points on the detected table, not app-supplied targets.
    const primary = await session.getPresetLocation("table-primary");
    const secondary = await session.getPresetLocation("table-secondary");
    const expectedMeters = Math.hypot(
      secondary[0] - primary[0],
      secondary[1] - primary[1],
      secondary[2] - primary[2],
    );
    const expectedCentimeters = expectedMeters * 100;
    const expectedInches = expectedMeters * 39.3700787402;
    await session.wait(1_000);
    await session.pointTo(primaryHand, primary);
    await session.click(primaryHand);
    await session.pointTo(primaryHand, secondary);
    await session.wait(1_000);
    await session.click(primaryHand);
    await session.wait(1_000);

    const meters = (await session.getScreenshot()) as string;
    await session.rayClick(primaryHand, { tag: "measurement-unit-control" });
    await session.wait(1_000);
    const centimeters = (await session.getScreenshot()) as string;

    await session.rayClick(primaryHand, { tag: "measurement-unit-control" });
    await session.wait(1_000);
    const inches = (await session.getScreenshot()) as string;

    await session.rayClick(primaryHand, { tag: "measurement-unit-control" });
    await session.wait(1_000);
    const metersAgain = (await session.getScreenshot()) as string;

    await session.rayClick(primaryHand, { tag: "clear-measurement" });
    await session.wait(1_000);
    const cleared = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt: `Objective: Verify free detected-surface measurement, unit cycling, and Clear for two scripted table-surface hits ${expectedMeters.toFixed(3)} meters apart. Required changes: Clicking the two untagged surface points creates and retains a measurement. The same fixed measurement shows approximately ${expectedMeters.toFixed(2)} m, ${expectedCentimeters.toFixed(1)} cm, ${expectedInches.toFixed(1)} in, and then ${expectedMeters.toFixed(2)} m again, allowing normal display rounding. The line and endpoints stay in place during unit changes. Clear then removes the measurement line, endpoints, and distance label.`,
      evidence: [
        {
          type: "image",
          label: "Completed measurement in meters",
          image: meters,
        },
        {
          type: "image",
          label: "Same measurement in centimeters",
          image: centimeters,
        },
        {
          type: "image",
          label: "Same measurement in inches",
          image: inches,
        },
        {
          type: "image",
          label: "Measurement cycled back to meters",
          image: metersAgain,
        },
        {
          type: "image",
          label: "After Clear",
          image: cleared,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
