import {
  captureOutputSnapshot,
  expect,
  expectOnSurface,
  expectTransformChanged,
  it_session,
  judge,
} from "@xrblocks/devtools/test";

it_session(
  "A dictated table note keeps its text after it moves",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "spatial-sticky-notes",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    const noteText = "Remember to water the plants";
    await session.stepFrame(20);
    const tableView = await session.getPresetLocation("table-view");
    const primaryTable = await session.getPresetLocation("table-primary");
    const secondaryTable = await session.getPresetLocation("table-secondary");
    await session.navigateTo(tableView);
    await session.lookAtTarget(primaryTable);
    await session.pointTo(primaryHand, primaryTable);
    await session.click(primaryHand);
    await session.waitForAudioConsumer({ timeoutMs: 5_000 });
    await session.injectAudio({ text: noteText });
    await session.wait(1_000);

    const placed = await captureOutputSnapshot(session, {
      tags: ["spatial-note"],
    });
    expect(placed.outputs).toHaveLength(1);
    const note = { tag: "spatial-note", id: placed.outputs[0].id };

    await session.pointTo(primaryHand, note);
    await session.startSelect(primaryHand);
    await session.lookAtTarget(secondaryTable);
    await session.pointTo(primaryHand, secondaryTable);
    await session.endSelect(primaryHand);
    await session.wait(1_000);

    const moved = await captureOutputSnapshot(session, {
      tags: ["spatial-note"],
    });
    expectTransformChanged(placed, moved, note, { positionMeters: 0.1 });
    expectOnSurface(moved, note, {
      toleranceMeters: 0.08,
    });
    await session.lookAtTarget(note);
    await session.stepFrame(8);
    const verdict = await judge({
      prompt:
        'Objective: Verify the table note. Required changes: One clear note is visible with readable text that says or clearly conveys "Remember to water the plants."',
      evidence: [
        {
          type: "image",
          label: "Moved table note",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
