import type {
  PhysicalHand,
  Vec3Tuple,
  XRBlocksSession,
} from "@xrblocks/devtools";
import {
  captureOutputSnapshot,
  expect,
  expectOnSurface,
  it_session,
  judge,
} from "@xrblocks/devtools/test";

const WIPE_RADIUS_METERS = 0.06;
const WIPE_POINTS = 12;
const WIPE_REVOLUTIONS = 2;
const WIPE_SPEED_METERS_PER_SECOND = 0.6;

async function wipeCircle(
  session: XRBlocksSession,
  hand: PhysicalHand,
  center: Vec3Tuple,
  heightOffset = 0,
) {
  const point = (step: number): Vec3Tuple => {
    const angle = (step / WIPE_POINTS) * Math.PI * 2;
    return [
      center[0] + Math.cos(angle) * WIPE_RADIUS_METERS,
      center[1] + heightOffset,
      center[2] + Math.sin(angle) * WIPE_RADIUS_METERS,
    ];
  };

  await session.teleportHand(hand, point(0));
  for (let step = 1; step <= WIPE_POINTS * WIPE_REVOLUTIONS; step += 1) {
    await session.reachTo(hand, point(step), {
      speedMetersPerSecond: WIPE_SPEED_METERS_PER_SECOND,
    });
  }
}

it_session(
  "a circular wiping motion removes at least one grime patch",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "grime-and-grace",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    const patches = await session.objects.findByTag("grime-patch");
    const patchSnapshot = await captureOutputSnapshot(session, {
      tags: ["grime-patch"],
    });
    const targetPatch = patches[0];
    await session.lookAtTarget({ tag: "grime-patch", id: targetPatch.id });
    expectOnSurface(
      patchSnapshot,
      { tag: "grime-patch", id: targetPatch.id },
      { toleranceMeters: 0.06 },
    );
    const beforeCleaning = (await session.getScreenshot()) as string;
    const center = (await session.objects.inspect(targetPatch)).worldTransform
      .position;
    await session.gesture(primaryHand, "relaxed");
    await wipeCircle(session, primaryHand, center);
    await session.stepFrame(12);

    const afterCleaning = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify partial grime cleaning. Required changes: Some grime is visibly cleaned from the contacted area, the underlying surface looks cleaner, other grime remains, and the visible counter shows progress. A tagged patch does not need to disappear.",
      evidence: [
        { type: "image", label: "Before cleaning", image: beforeCleaning },
        { type: "image", label: "After cleaning", image: afterCleaning },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

it_session(
  "the same circular motion above the surface does not clean a patch",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "grime-and-grace-no-contact",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    const patches = await session.objects.findByTag("grime-patch");
    const targetPatch = patches[0];
    await session.lookAtTarget({ tag: "grime-patch", id: targetPatch.id });
    const beforeLiftedWipe = (await session.getScreenshot()) as string;
    const center = (await session.objects.inspect(targetPatch)).worldTransform
      .position;
    await session.gesture(primaryHand, "relaxed");
    await wipeCircle(session, primaryHand, center, 0.25);
    await session.stepFrame(12);

    const afterLiftedWipe = (await session.getScreenshot()) as string;
    const verdict = await judge({
      prompt:
        "Objective: Verify raised-wipe rejection. Required changes: The raised wiping motion cleans no visible grime, and the cleaning counter remains at zero.",
      evidence: [
        {
          type: "image",
          label: "Before raised wipe",
          image: beforeLiftedWipe,
        },
        {
          type: "image",
          label: "After raised wipe",
          image: afterLiftedWipe,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
