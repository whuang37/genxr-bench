import type { XRBlocksSession } from "@xrblocks/devtools";
import {
  expect,
  it_session,
  expectVisible,
  judge,
} from "@xrblocks/devtools/test";

it_session(
  "The apple enters the basket, the corridor turns green, and progress increases",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "orchard-reach-basket",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    const basket = (await session.objects.inspect({ tag: "apple-basket" }))
      .worldTransform.position;
    const apple = await findActiveApple(session);
    await session.lookAtTarget({ tag: "apple-reach-corridor" });
    const before = (await session.getScreenshot()) as string;
    await session.reachTo(primaryHand, apple);
    await session.startSelect(primaryHand);
    await session.reachTo(primaryHand, [basket[0], basket[1] + 0.1, basket[2]]);
    await session.endSelect(primaryHand);
    await session.wait(1_000);
    const verdict = await judge({
      prompt:
        "Objective: Verify that an apple released above a basket falls into it through the wide visible guide for that apple. Required changes: The apple settles inside the basket, the guide path turns green, and visible progress advances to 1 of 6.",
      evidence: [
        { type: "image", label: "Before basket", image: before },
        {
          type: "image",
          label: "Apple settled in basket",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "an apple that falls outside the basket returns to its branch",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "orchard-reach",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    const basket = (await session.objects.inspect({ tag: "apple-basket" }))
      .worldTransform.position;
    const apple = await findActiveApple(session);
    const initialPosition = (await session.objects.inspect(apple))
      .worldTransform.position;
    await session.lookAtTarget(apple);
    await session.reachTo(primaryHand, apple);
    await session.startSelect(primaryHand);
    await session.reachTo(primaryHand, [basket[0] + 0.5, basket[1], basket[2]]);
    const heldPosition = (await session.objects.inspect(apple)).worldTransform
      .position;
    expect(distance(heldPosition, initialPosition)).toBeGreaterThan(0.1);
    await session.endSelect(primaryHand);
    await session.wait(2000);

    const returnedPosition = (await session.objects.inspect(apple))
      .worldTransform.position;
    expect(distance(returnedPosition, initialPosition)).toBeLessThanOrEqual(
      0.05,
    );
    await expectVisible(session, apple);
    await expectVisible(session, "apple-reach-corridor");
    await expectVisible(session, "apple-basket");
  },
);

async function findActiveApple(session: XRBlocksSession) {
  const apples = await session.objects.findByTag("reach-apple");
  expect(apples.length).toBeGreaterThan(0);
  const corridorPosition = (
    await session.objects.inspect({ tag: "apple-reach-corridor" })
  ).worldTransform.position;

  let closest = { tag: "reach-apple", id: apples[0].id };
  let closestDistance = distance(
    (await session.objects.inspect(closest)).worldTransform.position,
    corridorPosition,
  );
  for (const apple of apples.slice(1)) {
    const candidate = { tag: "reach-apple", id: apple.id };
    const candidateDistance = distance(
      (await session.objects.inspect(candidate)).worldTransform.position,
      corridorPosition,
    );
    if (candidateDistance < closestDistance) {
      closest = candidate;
      closestDistance = candidateDistance;
    }
  }
  return closest;
}

function distance(left: number[], right: number[]): number {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2]);
}
