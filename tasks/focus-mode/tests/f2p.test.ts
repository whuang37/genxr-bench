import {
  captureOutputSnapshot,
  expect,
  it_session,
} from "@xrblocks/devtools/test";

const MINIMUM_MOVEMENT_METERS = 0.03;

it_session(
  "The user can move three opaque focus screens",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "focus-mode",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(12);

    const screens = await session.objects.findByTag("focus-screen");
    expect(screens).toHaveLength(3);
    await session.lookAtTarget(screens[0]);
    for (const screen of screens) {
      const before = await session.objects.inspect(screen);
      const snapshot = await captureOutputSnapshot(session, {
        tags: ["focus-screen"],
      });
      const center = snapshot.outputs.find((output) => output.id === screen.id)
        ?.bounds?.center;
      if (!center) throw new Error("Focus screen has no visible bounds.");

      await session.pointTo(primaryHand, center);
      await session.startSelect(primaryHand);
      await session.stepFrame(2);
      await session.moveHand(primaryHand, { upMeters: 0.12 });
      await session.stepFrame(2);

      const raised = await session.objects.inspect(screen);
      expect(
        distance(
          before.worldTransform.position,
          raised.worldTransform.position,
        ),
      ).toBeGreaterThan(MINIMUM_MOVEMENT_METERS);

      await session.moveHand(primaryHand, { upMeters: -0.12 });
      await session.stepFrame(2);
      await session.endSelect(primaryHand);
      await session.stepFrame(3);
    }
  },
);

function distance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
