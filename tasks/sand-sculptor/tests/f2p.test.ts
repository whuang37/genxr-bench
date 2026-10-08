import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "sand accumulates and beads fall into the sand",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "sand-sculptor",
    realTime: true,
  },
  async (session, { primaryHand, secondaryHand }) => {
    await session.stepFrame(20);
    const tableView = await session.getPresetLocation("table-view");
    const tablePrimary = await session.getPresetLocation("table-primary");
    const tableSecondary = await session.getPresetLocation("table-secondary");
    const sandRelease: [number, number, number] = [
      tablePrimary[0],
      tablePrimary[1] + 0.35,
      tablePrimary[2],
    ];
    const rightHandAway: [number, number, number] = [
      tableSecondary[0],
      tableSecondary[1] + 0.35,
      tableSecondary[2],
    ];
    const beadRelease = sandRelease;

    await session.navigateTo(tableView);
    await session.lookAtTarget(tablePrimary);
    const before = (await session.getScreenshot()) as string;

    await session.teleportHand(primaryHand, sandRelease);
    await session.gesture(primaryHand, "pinching");
    await session.wait(2_000);
    await session.gesture(primaryHand, "relaxed");
    await session.stepFrame(12);
    await session.lookAtTarget(tablePrimary);
    const accumulated = (await session.getScreenshot()) as string;

    await session.teleportHand(primaryHand, rightHandAway);
    await session.teleportHand(secondaryHand, beadRelease);
    await session.lookAtTarget(beadRelease);
    for (let bead = 0; bead < 3; bead++) {
      await session.click(secondaryHand);
      await session.wait(100);
    }
    await session.stepFrame(2);
    const released = (await session.getScreenshot()) as string;
    await session.wait(2_000);
    await session.lookAtTarget(tablePrimary);
    const settled = (await session.getScreenshot()) as string;

    await session.reachTo(primaryHand, tablePrimary);
    await session.wait(500);
    await session.teleportHand(primaryHand, rightHandAway);
    await session.wait(500);
    await session.lookAtTarget(tablePrimary);
    const afterHandContact = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify sand accumulation and bead physics on the real table. Required changes: Pinching creates a retained raised sand area without a virtual tray. The released beads fall directly into the accumulated sand and visibly settle in or become partly embedded in it. Beads that land only on the bare table, float, or pass through the sand do not satisfy the requirement.",
      evidence: [
        { type: "image", label: "Initial table", image: before },
        { type: "image", label: "Accumulated sand", image: accumulated },
        { type: "image", label: "Beads released", image: released },
        { type: "image", label: "Beads after falling", image: settled },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);

    const handContactVerdict = await judge({
      prompt:
        "Objective: Verify hand-driven sand deformation. Required changes: Hand contact visibly displaces or reshapes the mound.",
      evidence: [
        { type: "image", label: "Before hand contact", image: settled },
        {
          type: "image",
          label: "After hand contact",
          image: afterHandContact,
        },
      ],
    });
    expect(handContactVerdict.verdict, handContactVerdict.reason).toBe(true);
  },
);
