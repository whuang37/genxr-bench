import type { Vec3Tuple, XRBlocksSession } from "@xrblocks/devtools";
import {
  captureOutputSnapshot,
  expect,
  expectNotVisible,
  expectVisible,
  it_session,
  judge,
} from "@xrblocks/devtools/test";

const FRUIT_SPAWN_TIMEOUT_MS = 5_000;
const BOMB_SPAWN_TIMEOUT_MS = 30_000;
const FRUIT_POLL_INTERVAL_MS = 250;

async function waitForTarget(
  session: XRBlocksSession,
  tag: "fruit" | "bomb",
  timeoutMs: number,
): Promise<{
  identity: { tag: string; id: string };
  position: Vec3Tuple;
}> {
  for (
    let elapsed = 0;
    elapsed < timeoutMs;
    elapsed += FRUIT_POLL_INTERVAL_MS
  ) {
    const snapshot = await captureOutputSnapshot(session, { tags: [tag] });
    const target = snapshot.outputs
      .filter((output) => output.render.displayed)
      .sort(
        (left, right) =>
          right.worldTransform.position[1] - left.worldTransform.position[1],
      )[0];
    if (target) {
      return {
        identity: { tag: target.tag, id: target.id },
        position: target.worldTransform.position,
      };
    }
    await session.wait(FRUIT_POLL_INTERVAL_MS);
  }
  throw new Error(`No ${tag} appeared within ${timeoutMs} ms after Play Game.`);
}

it_session(
  "a fast chop slices one spawned fruit and records one resolved target",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "fruit-slicer",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(10);
    await expectVisible(session, "play-game");
    await expectNotVisible(session, "fruit");
    await session.lookAtTarget({ tag: "play-game" });
    await session.rayClick(primaryHand, { tag: "play-game" });

    const fruit = await waitForTarget(session, "fruit", FRUIT_SPAWN_TIMEOUT_MS);
    await session.lookAtTarget(fruit.position);
    const [x, y, z] = fruit.position;
    await session.teleportHand(primaryHand, [x - 0.12, y, z]);
    await session.reachTo(primaryHand, [x + 0.12, y, z], {
      speedMetersPerSecond: 1.5,
    });
    await session.wait(300);

    await expectNotVisible(session, fruit.identity);
    await expectVisible(session, "resolved-counter");
  },
);

it_session(
  "a fast chop of a bomb removes one life",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "fruit-slicer-bomb",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.lookAtTarget({ tag: "play-game" });
    await session.rayClick(primaryHand, { tag: "play-game" });

    const bomb = await waitForTarget(session, "bomb", BOMB_SPAWN_TIMEOUT_MS);
    const lifeMarkers = { tag: "life-markers" };
    const lifeMarkersBefore = (await session.objects.inspect(lifeMarkers))
      .worldTransform.position;
    await session.lookAtTarget(lifeMarkersBefore);
    const before = (await session.getScreenshot()) as string;

    await session.lookAtTarget(bomb.position);
    const [x, y, z] = bomb.position;
    await session.teleportHand(primaryHand, [x - 0.12, y, z]);
    await session.reachTo(primaryHand, [x + 0.12, y, z], {
      speedMetersPerSecond: 1.5,
    });
    await session.wait(300);

    await expectNotVisible(session, bomb.identity);
    const lifeMarkersAfter = (await session.objects.inspect(lifeMarkers))
      .worldTransform.position;
    await session.lookAtTarget(lifeMarkersAfter);
    const after = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify that slicing a bomb visibly lowers the player's health by one life. Required changes: The life display clearly changes to less life after the bomb strike.",
      evidence: [
        {
          type: "image",
          label: "Life display before bomb strike",
          image: before,
        },
        {
          type: "image",
          label: "Life display after bomb strike",
          image: after,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
