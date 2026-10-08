import { expect, it_session, judge } from "@xrblocks/devtools/test";
import type { PhysicalHand, XRBlocksSession } from "@xrblocks/devtools";

it_session(
  "The same hand chop splits the ionic lattice, bends the covalent lattice, and Replay restores both",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "crystal-lattice-shear-lab",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "ionic-lattice" });
    const initial = (await session.getScreenshot()) as string;

    await chopThrough(session, primaryHand, "ionic-lattice");
    await session.stepFrame(8);
    const afterIonicChop = (await session.getScreenshot()) as string;

    await chopThrough(session, primaryHand, "covalent-lattice");
    await session.stepFrame(8);
    const afterBothChops = (await session.getScreenshot()) as string;

    await session.rayClick(primaryHand, { tag: "replay-lattices" });
    await session.stepFrame(8);
    const afterReplay = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify contrasting lattice responses and Replay. Required changes: The ionic lattice separates along a cleavage plane, while the covalent lattice bends but remains connected. Replay restores both intact lattices.",
      evidence: [
        { type: "image", label: "Initial lattices", image: initial },
        {
          type: "image",
          label: "After ionic chop",
          image: afterIonicChop,
        },
        {
          type: "image",
          label: "After both chops",
          image: afterBothChops,
        },
        { type: "image", label: "After Replay", image: afterReplay },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function chopThrough(
  session: XRBlocksSession,
  hand: PhysicalHand,
  targetTag: string,
) {
  const target = (await session.objects.inspect({ tag: targetTag }))
    .worldTransform.position;
  await session.gesture(hand, "relaxed");
  await session.rotateHand(hand, { rollDegrees: 90 });
  await session.reachTo(hand, [target[0], target[1] + 0.35, target[2]]);
  await session.moveHand(hand, { upMeters: -0.7 });
}
