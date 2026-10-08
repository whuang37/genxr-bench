import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "Pulling and pressing deform the clay, and Reset restores the puck",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "clay-prototype",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    const table = await session.getPresetLocation("table-primary");
    const tableView = await session.getPresetLocation("table-view");
    await session.teleportTo(tableView);
    await session.lookAtTarget(table);
    await session.pointTo(primaryHand, table);
    await session.click(primaryHand);
    await session.stepFrame(20);
    const initial = (await session.getScreenshot()) as string;

    await session.reachTo(primaryHand, { tag: "clay-puck" });
    await session.startSelect(primaryHand);
    await session.moveHand(primaryHand, { rightMeters: 0.16, upMeters: 0.08 });
    await session.endSelect(primaryHand);
    await session.stepFrame(12);
    const afterPull = (await session.getScreenshot()) as string;

    await session.gesture(primaryHand, "pointing");
    const clayPosition = (await session.objects.inspect({ tag: "clay-puck" }))
      .worldTransform.position;
    await session.reachTo(primaryHand, [
      clayPosition[0] - 0.08,
      clayPosition[1],
      clayPosition[2],
    ]);
    await session.stepFrame(12);
    const afterPress = (await session.getScreenshot()) as string;

    await session.rayClick(primaryHand, { tag: "undo-clay-edit" });
    await session.stepFrame(12);
    const afterUndo = (await session.getScreenshot()) as string;

    await session.rayClick(primaryHand, { tag: "reset-clay" });
    await session.stepFrame(12);
    const afterReset = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify clay deformation, undo, and reset. Required changes: Pull stretches one local area. Press adds an indentation elsewhere while the pull remains. Undo removes the press while keeping the earlier pull. Reset restores the original undeformed puck.",
      evidence: [
        { type: "image", label: "Initial clay puck", image: initial },
        { type: "image", label: "After pull", image: afterPull },
        { type: "image", label: "After fingertip press", image: afterPress },
        { type: "image", label: "After Undo", image: afterUndo },
        { type: "image", label: "After Reset", image: afterReset },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
