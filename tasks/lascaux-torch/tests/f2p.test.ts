import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "torch position changes the wall illumination and revealed painting detail",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "lascaux-torch",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    await session.lookAtTarget({ tag: "artwork-reveal-region" });

    const initialTorchPosition = (await session.getScreenshot()) as string;

    await session.pointTo(primaryHand, { tag: "virtual-torch" });
    await session.startSelect(primaryHand);
    await session.pointTo(primaryHand, { tag: "artwork-reveal-region" });
    await session.wait(1_000);
    const revealedView = (await session.getScreenshot()) as string;

    const table = await session.getPresetLocation("table-primary");
    await session.lookAtTarget(table);
    await session.pointTo(primaryHand, table);
    await session.wait(1_000);
    const fadedView = (await session.getScreenshot()) as string;
    await session.endSelect(primaryHand);

    const verdict = await judge({
      prompt:
        "Objective: Verify position-dependent torch illumination. Required changes: Aiming at the prepared artwork creates a soft-edged local emphasis that reveals its details, and aiming away moves or fades that emphasis instead of leaving it fixed. Other wall illumination may remain in every view.",
      evidence: [
        {
          type: "image",
          label: "Wall at the initial torch position",
          image: initialTorchPosition,
        },
        {
          type: "image",
          label: "Artwork inside the torch beam",
          image: revealedView,
        },
        {
          type: "image",
          label: "Wall after the torch aims away",
          image: fadedView,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
