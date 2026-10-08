import {
  captureOutputSnapshot,
  expect,
  expectOnSurface,
  it_session,
  judge,
} from "@xrblocks/devtools/test";

it_session(
  "A long wall root grows buds that open into flowers",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "flora-symphony",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.lookAtTarget({ tag: "seed-control" });
    await session.stepFrame(10);

    const seedPosition = (
      await session.objects.inspect({ tag: "seed-control" })
    ).worldTransform.position;
    const horizontalDirection = seedPosition[0] > 0.5 ? -1 : 1;

    await session.pointTo(primaryHand, { tag: "seed-control" });
    await session.startSelect(primaryHand);
    for (let step = 1; step <= 10; step += 1) {
      const rootPoint: [number, number, number] = [
        seedPosition[0] + horizontalDirection * step * 0.025,
        seedPosition[1] + step * 0.025,
        seedPosition[2],
      ];
      await session.lookAtTarget(rootPoint);
      await session.pointTo(primaryHand, rootPoint);
    }
    await session.endSelect(primaryHand);
    await session.stepFrame(12);

    const buds = await session.objects.findByTag("bud");
    expect(buds.length).toBeGreaterThan(0);
    const surfaceSnapshot = await captureOutputSnapshot(session, {
      tags: ["bud"],
    });
    for (const output of surfaceSnapshot.outputs) {
      expectOnSurface(
        surfaceSnapshot,
        { tag: output.tag, id: output.id },
        { toleranceMeters: 0.08 },
      );
    }
    const rootWithBuds = (await session.getScreenshot()) as string;

    let firstBloom = rootWithBuds;
    for (const [index, bud] of buds.entries()) {
      await session.rayClick(primaryHand, bud);
      await session.stepFrame(8);
      if (index === 0) {
        firstBloom = (await session.getScreenshot()) as string;
      }
    }

    const verdict = await judge({
      prompt:
        "Objective: Verify root growth and full bloom. Required changes: A glowing route grows along the wall, generated buds visibly open when selected, and opening all generated buds produces a larger final flower at the route end. Do not require an exact bud count, exact flower shape, or exact visual style. If only one bud is generated, its opening and the completed bloom can occur in the same stage.",
      evidence: [
        {
          type: "image",
          label: "Long root with generated buds",
          image: rootWithBuds,
        },
        {
          type: "image",
          label: "After opening one bud",
          image: firstBloom,
        },
        {
          type: "image",
          label: "All buds open",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);

    // The seed remains the reset control for the complete generated plant.
    await session.rayClick(primaryHand, { tag: "seed-control" });
    await session.stepFrame(12);
  },
);
