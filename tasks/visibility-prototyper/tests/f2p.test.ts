import {
  captureOutputSnapshot,
  expect,
  expectNotVisible,
  expectOnSurface,
  it_session,
  judge,
} from "@xrblocks/devtools/test";

it_session(
  "Two plane clicks create a window with an inward visibility view",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "visibility-prototyper",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    await expectNotVisible(session, "visibility-window");
    await expectNotVisible(session, "window-inward-visibility");

    const wall = await session.getPresetLocation("wall-primary");
    await session.navigateTo(await session.getPresetLocation("wall-view"));
    const firstCorner: [number, number, number] = [
      wall[0] - 0.25,
      wall[1] - 0.2,
      wall[2],
    ];
    const oppositeCorner: [number, number, number] = [
      wall[0] + 0.25,
      wall[1] + 0.2,
      wall[2],
    ];

    await session.lookAtTarget(firstCorner);
    await session.pointTo(primaryHand, firstCorner);
    await session.click(primaryHand);
    await session.stepFrame(6);
    await expectNotVisible(session, "visibility-window");

    await session.lookAtTarget(oppositeCorner);
    await session.pointTo(primaryHand, oppositeCorner);
    await session.click(primaryHand);
    await session.stepFrame(12);

    const snapshot = await captureOutputSnapshot(session, {
      tags: ["visibility-window", "window-inward-visibility"],
    });
    expectOnSurface(snapshot, "visibility-window", {
      toleranceMeters: 0.08,
    });

    const view = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify a wall opening that visualizes what an outside observer could see inside the room. Required changes: Two selected wall points define one flush rectangular outline. Rays start outside the wall, pass through the window, and visibly continue into the room to first-hit marks on room surfaces or objects, showing the visible parts of the room.",
      evidence: [{ type: "image", label: "Completed window", image: view }],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
