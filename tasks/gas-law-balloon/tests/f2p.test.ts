import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "Moving both plates inward compresses the gas",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "gas-law-balloon",
    realTime: true,
  },
  async (session, { primaryHand, secondaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "gas-chamber" });

    const initial = (await session.getScreenshot()) as string;
    const leftPlate = await session.objects.inspect({
      tag: "compression-plate-left",
    });
    const rightPlate = await session.objects.inspect({
      tag: "compression-plate-right",
    });
    await session.pointTo(secondaryHand, { tag: "compression-plate-left" });
    await session.startSelect(secondaryHand);
    await session.pointTo(primaryHand, { tag: "compression-plate-right" });
    await session.startSelect(primaryHand);
    await session.pointTo(secondaryHand, [
      leftPlate.worldTransform.position[0] + 0.15,
      leftPlate.worldTransform.position[1],
      leftPlate.worldTransform.position[2],
    ]);
    await session.pointTo(primaryHand, [
      rightPlate.worldTransform.position[0] - 0.15,
      rightPlate.worldTransform.position[1],
      rightPlate.worldTransform.position[2],
    ]);
    await session.stepFrame(8);
    const compressed = (await session.getScreenshot()) as string;
    await session.endSelect(secondaryHand);
    await session.endSelect(primaryHand);

    const verdict = await judge({
      prompt:
        "Objective: Verify compression of a transparent chamber containing visible gas particles. Required changes: Compared with the initial view, both side plates move inward and the chamber containing the gas becomes clearly narrower. Judge the visible compression rather than exact dimensions or displayed numeric values.",
      evidence: [
        {
          type: "image",
          label: "Initial chamber",
          image: initial,
        },
        {
          type: "image",
          label: "Compressed chamber",
          image: compressed,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
