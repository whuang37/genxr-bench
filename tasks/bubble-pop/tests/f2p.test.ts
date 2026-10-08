import type { XRBlocksSession } from "@xrblocks/devtools";
import {
  expect,
  it_session,
  judge,
  VerifierError,
} from "@xrblocks/devtools/test";

it_session(
  "Play starts the round and full-hand contact pops one bubble",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "bubble-pop",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await session.lookAtTarget({ tag: "play-button" });
    await session.rayClick(primaryHand, { tag: "play-button" });
    await session.stepFrame(4);

    const bubbles = await waitForTag(session, "bubble");
    const bubble = bubbles.find(
      (candidate): candidate is typeof candidate & { id: string } =>
        typeof candidate.id === "string" && candidate.id.length > 0,
    );
    if (!bubble) {
      throw new VerifierError("No bubble had a stable object ID.");
    }
    await session.lookAtTarget({ tag: "bubble", id: bubble.id });
    await session.stepFrame(4);
    const beforeContact = (await session.getScreenshot()) as string;
    await session.teleportHand(primaryHand, { tag: "bubble", id: bubble.id });
    await waitForObjectGone(session, "bubble", bubble.id, 5_000);
    await session.moveHand(primaryHand, { upMeters: -0.15 });
    await session.stepFrame(4);
    const afterContact = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify one bubble pop. Required changes: The contacted bubble disappears from its former location while the other bubbles remain as an active play field.",
      evidence: [
        { type: "image", label: "Before contact", image: beforeContact },
        { type: "image", label: "After contact", image: afterContact },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

async function waitForTag(session: XRBlocksSession, tag: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const objects = await session.objects.findByTag(tag);
    if (objects.length > 0) return objects;
    await session.wait(100);
  }
  throw new VerifierError(`${tag} was not ready within 5 seconds.`);
}

async function waitForObjectGone(
  session: XRBlocksSession,
  tag: string,
  id: string,
  timeoutMs: number,
): Promise<void> {
  const attempts = Math.ceil(timeoutMs / 500);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const objects = await session.objects.findByTag(tag);
    if (!objects.some((object) => object.id === id)) return;
    await session.wait(500);
  }
  throw new VerifierError(`${tag} ${id} remained after ${timeoutMs} ms.`);
}
