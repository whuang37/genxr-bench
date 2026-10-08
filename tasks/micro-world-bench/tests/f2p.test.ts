import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "two hydrogens complete the water molecule and a third is rejected",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "micro-world-bench",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    await session.lookAtTarget({ tag: "water-assembly-area" });

    expect(await session.objects.findByTag("water-assembly-area")).toHaveLength(
      1,
    );
    const hydrogens = await session.objects.findByTag("hydrogen-atom");
    const slots = await session.objects.findByTag("open-oxygen-slot");
    expect(hydrogens.length).toBeGreaterThanOrEqual(3);
    expect(slots.length).toBeGreaterThanOrEqual(2);

    const filledSlotPosition = (await session.objects.inspect(slots[0]))
      .worldTransform.position;

    await session.reachTo(primaryHand, hydrogens[0]);
    await session.startSelect(primaryHand);
    await session.reachTo(primaryHand, slots[0]);
    const previewScreenshot = (await session.getScreenshot()) as string;
    await session.endSelect(primaryHand);
    await session.stepFrame(8);

    await session.reachTo(primaryHand, hydrogens[1]);
    await session.startSelect(primaryHand);
    await session.reachTo(primaryHand, slots[1]);
    await session.endSelect(primaryHand);
    await session.stepFrame(16);
    const completedScreenshot = (await session.getScreenshot()) as string;

    await session.reachTo(primaryHand, hydrogens[2]);
    await session.startSelect(primaryHand);
    await session.lookAtTarget(filledSlotPosition);
    await session.reachTo(primaryHand, filledSlotPosition);
    await session.endSelect(primaryHand);
    await session.wait(1_000);

    const rejectedScreenshot = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify water assembly and extra-hydrogen rejection. Required changes: The preview becomes a complete water molecule with two attached hydrogens and no open bond position. The extra hydrogen remains separate while the completed molecule stays intact.",
      evidence: [
        {
          type: "image",
          label: "First hydrogen held near an open slot",
          image: previewScreenshot,
        },
        {
          type: "image",
          label: "Two hydrogens attached",
          image: completedScreenshot,
        },
        {
          type: "image",
          label: "Third hydrogen rejected",
          image: rejectedScreenshot,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
