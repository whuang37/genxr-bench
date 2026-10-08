import { expect, it_session, judge } from "@xrblocks/devtools/test";

it_session(
  "Valid atoms form tetrahedral methane",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "molecular-bond-builder",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    await session.lookAtTarget({ tag: "methane-open-socket" });

    const hydrogens = await session.objects.findByTag("hydrogen-atom");
    expect(hydrogens.length).toBeGreaterThan(0);

    await session.reachTo(primaryHand, {
      tag: "hydrogen-atom",
      id: hydrogens[0].id,
    });
    await session.startSelect(primaryHand);
    await session.reachTo(primaryHand, { tag: "methane-open-socket" });
    await session.endSelect(primaryHand);
    await session.stepFrame(24);

    const screenshot = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify methane completion. Required changes: The finished molecule on the first stand has one central carbon and four hydrogens in tetrahedral geometry.",
      evidence: [{ type: "image", label: "Final methane", image: screenshot }],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "nitrogen is rejected from a methane hydrogen socket",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "molecular-bond-builder-invalid",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    await session.lookAtTarget({ tag: "methane-open-socket" });
    const nitrogenStart = (
      await session.objects.inspect({ tag: "nitrogen-atom" })
    ).worldTransform.position;
    // Script the incompatible placement with the same ray-drag lifecycle as atoms.
    await session.reachTo(primaryHand, { tag: "nitrogen-atom" });
    await session.startSelect(primaryHand);
    await session.reachTo(primaryHand, { tag: "methane-open-socket" });
    await session.endSelect(primaryHand);
    const rejectionView = (await session.getScreenshot()) as string;
    await session.wait(1_000);
    await session.stepFrame(16);
    const nitrogenAfter = (
      await session.objects.inspect({ tag: "nitrogen-atom" })
    ).worldTransform.position;
    expect(distance(nitrogenAfter, nitrogenStart)).toBeLessThan(0.03);
    const verdict = await judge({
      prompt:
        "Objective: Verify invalid nitrogen rejection. Required changes: The nitrogen placement produces visible red rejection feedback and does not complete or alter the methane model.",
      evidence: [
        { type: "image", label: "Rejected nitrogen", image: rejectionView },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

function distance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
