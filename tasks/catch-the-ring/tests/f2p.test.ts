import type { Vec3Tuple, XRBlocksSession } from "@xrblocks/devtools";
import {
  captureOutputSnapshot,
  expect,
  it_session,
  VerifierError,
  judge,
} from "@xrblocks/devtools/test";

it_session(
  "A center pass resolves one ring",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "catch-the-ring",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.lookAtTarget({ tag: "start-button" });
    await session.rayClick(primaryHand, { tag: "start-button" });
    await session.wait(500);

    const before = await captureOutputSnapshot(session, {
      tags: ["score-counter"],
    });
    const beforeView = (await session.getScreenshot()) as string;
    const ringCenter = await waitForLiveRingCenter(session);
    await session.teleportHand(primaryHand, ringCenter, {
      anchor: "palm-center",
    });
    await waitForScoreRenderChange(session, scoreRender(before));
    const afterView = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify one center ring pass. Required changes: The contacted ring resolves as a green center pass, the visible score advances from 0 of 12 to 1 of 12, and no life is lost.",
      evidence: [
        { type: "image", label: "Before center pass", image: beforeView },
        { type: "image", label: "After center pass", image: afterView },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function waitForLiveRingCenter(
  session: XRBlocksSession,
): Promise<Vec3Tuple> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const snapshot = await captureOutputSnapshot(session, {
      tags: ["incoming-ring"],
    });
    const ring = snapshot.outputs.find((output) => output.bounds !== null);
    if (ring?.bounds) return ring.bounds.center;
    await session.wait(100);
  }
  throw new VerifierError("incoming-ring was not ready within 5 seconds.");
}

function scoreRender(
  snapshot: Awaited<ReturnType<typeof captureOutputSnapshot>>,
) {
  return snapshot.outputs.find((output) => output.tag === "score-counter")
    ?.render;
}

async function waitForScoreRenderChange(
  session: XRBlocksSession,
  initialRender: unknown,
): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const snapshot = await captureOutputSnapshot(session, {
      tags: ["score-counter"],
    });
    if (
      JSON.stringify(scoreRender(snapshot)) !== JSON.stringify(initialRender)
    ) {
      return;
    }
    await session.wait(250);
  }
  expect(
    scoreRender(
      await captureOutputSnapshot(session, {
        tags: ["score-counter"],
      }),
    ),
  ).not.toEqual(initialRender);
}
