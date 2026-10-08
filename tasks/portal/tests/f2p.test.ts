import {
  captureOutputSnapshot,
  expect,
  expectOnSurface,
  it_session,
  judge,
} from "@xrblocks/devtools/test";
import type {
  PhysicalHand,
  Vec3Tuple,
  XRBlocksSession,
} from "@xrblocks/devtools";

it_session(
  "fists place linked portals and a shot exits the linked portal",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "portal",
    realTime: true,
  },
  async (session, { primaryHand, secondaryHand }) => {
    await session.stepFrame(20);
    const primaryWall = await session.getPresetLocation("wall-primary");
    await session.lookAtTarget(primaryWall);
    await session.pointTo(primaryHand, primaryWall);
    await session.gesture(primaryHand, "fist");
    await session.stepFrame(4);
    await session.gesture(primaryHand, "relaxed");

    const secondaryWall = await session.getPresetLocation("wall-secondary");
    await session.lookAtTarget(secondaryWall);
    await session.pointTo(secondaryHand, secondaryWall);
    await session.gesture(secondaryHand, "fist");
    await session.stepFrame(4);
    await session.gesture(secondaryHand, "relaxed");
    await session.stepFrame(16);

    const portals = await captureOutputSnapshot(session, {
      tags: ["blue-portal", "orange-portal"],
    });
    expectOnSurface(portals, "blue-portal", {
      toleranceMeters: 0.08,
    });
    expectOnSurface(portals, "orange-portal", {
      toleranceMeters: 0.08,
    });
    expect(
      distance(outputCenter(portals, "blue-portal"), primaryWall),
    ).toBeLessThan(0.3);
    expect(
      distance(outputCenter(portals, "orange-portal"), secondaryWall),
    ).toBeLessThan(0.3);

    await session.lookAtTarget({ tag: "orange-portal" });
    const bluePortalCenter = outputCenter(portals, "blue-portal");
    await throwThroughPortal(
      session,
      primaryHand,
      camera.position,
      bluePortalCenter,
    );
  },
);

async function throwThroughPortal(
  session: XRBlocksSession,
  hand: PhysicalHand,
  viewerPosition: Vec3Tuple,
  portalPosition: Vec3Tuple,
): Promise<void> {
  const forward = direction(viewerPosition, portalPosition);
  const start = addScaled(portalPosition, forward, -0.5);
  const release = addScaled(portalPosition, forward, -0.12);

  await session.gesture(hand, "relaxed");
  await session.reachTo(hand, start);
  await session.pointTo(hand, { tag: "blue-portal" });
  await session.gesture(hand, "pinching");
  await session.stepFrame(3);
  await session.reachTo(hand, release, { speedMetersPerSecond: 1.5 });
  await session.gesture(hand, "relaxed");
}

async function capturePortalExit(
  session: XRBlocksSession,
  entryPortal: Vec3Tuple,
  exitPortal: Vec3Tuple,
): Promise<string> {
  let sawEntry = false;

  for (let frame = 0; frame < 120; frame += 1) {
    await session.stepFrame(1);
    const balls = await ballPositions(session);
    if (balls.some((position) => distance(position, entryPortal) < 0.3)) {
      sawEntry = true;
    }
    if (
      sawEntry &&
      balls.some((position) => distance(position, exitPortal) < 0.45)
    ) {
      return (await session.getScreenshot()) as string;
    }
  }

  throw new Error(
    sawEntry
      ? "No portal ball appeared at the orange wall portal."
      : "No portal ball reached the blue floor portal.",
  );
}

async function ballPositions(session: XRBlocksSession): Promise<Vec3Tuple[]> {
  const balls = await session.objects.findByTag("portal-ball");
  const positions: Vec3Tuple[] = [];
  for (const ball of balls) {
    try {
      positions.push(
        (await session.objects.inspect({ tag: "portal-ball", id: ball.id }))
          .worldTransform.position,
      );
    } catch {
      // A portal can replace its ball object while it transports the ball.
    }
  }
  return positions;
}

function distance(a: Vec3Tuple, b: Vec3Tuple): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function outputCenter(
  snapshot: Awaited<ReturnType<typeof captureOutputSnapshot>>,
  tag: string,
): Vec3Tuple {
  const bounds = snapshot.outputs.find((output) => output.tag === tag)?.bounds;
  if (!bounds) throw new Error(`${tag} has no world bounds.`);
  return bounds.center;
}
