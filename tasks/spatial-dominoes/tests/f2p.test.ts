import type { Vec3Tuple } from "@xrblocks/devtools";
import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "hand contact moves three placed dominoes",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "spatial-dominoes",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    expect(await session.objects.findByTag("domino")).toHaveLength(0);

    const center = await session.getPresetLocation("table-primary");
    const placements: Vec3Tuple[] = [
      [center[0] - 0.14, center[1], center[2]],
      center,
      [center[0] + 0.14, center[1], center[2]],
    ];
    for (const placement of placements) {
      await session.lookAtTarget(placement);
      await session.pointTo(primaryHand, placement);
      await session.click(primaryHand);
      await session.wait(600);
    }

    const dominoes = await session.objects.findByTag("domino");
    expect(dominoes).toHaveLength(3);
    const placed = (await session.getScreenshot()) as string;

    for (const domino of dominoes) {
      await session.reachTo(primaryHand, { tag: "domino", id: domino.id });
      await session.wait(900);
    }
    const moved = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify hand contact with all dominoes. Required changes: Compared with the three initially upright dominoes, the dominoes are toppled or no longer visible because they moved off-screen after contact.",
      evidence: [
        { type: "image", label: "Three placed dominoes", image: placed },
        { type: "image", label: "After contacting each domino", image: moved },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
