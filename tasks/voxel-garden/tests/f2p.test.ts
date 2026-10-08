import {
  captureOutputSnapshot,
  expect,
  expectOnSurface,
  it_session,
  judge,
} from "@xrblocks/devtools/test";
const FLOWER_TAG = "voxel-flower";

it_session(
  "two environment clicks grow two voxel flowers",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "voxel-garden",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.wait(1_000);
    expect(await session.objects.findByTag(FLOWER_TAG)).toHaveLength(0);

    await session.navigateTo(await session.getPresetLocation("table-view"));
    const primary = await session.getPresetLocation("table-primary");
    const secondary = await session.getPresetLocation("table-secondary");
    const plantingSites = [primary, secondary];

    for (const site of plantingSites) {
      await session.lookAtTarget(site);
      await session.pointTo(primaryHand, site);
      await session.click(primaryHand);
      await session.wait(1_000);
    }

    const flowers = await captureOutputSnapshot(session, {
      tags: [FLOWER_TAG],
    });
    expect(flowers.outputs).toHaveLength(plantingSites.length);
    for (const flower of flowers.outputs) {
      expectOnSurface(
        flowers,
        { tag: FLOWER_TAG, id: flower.id },
        { toleranceMeters: 0.06 },
      );
    }

    await session.lookAtTarget(primary);
    const primaryFlower = (await session.getScreenshot()) as string;
    await session.lookAtTarget(secondary);
    const secondaryFlower = (await session.getScreenshot()) as string;

    const verdict = await judge({
      prompt:
        "Objective: Verify voxel-flower planting on the table. Required changes: The two images show two recognizable voxel flowers planted on the tabletop.",
      evidence: [
        {
          type: "image",
          label: "Flower at primary table location",
          image: primaryFlower,
        },
        {
          type: "image",
          label: "Flower at secondary table location",
          image: secondaryFlower,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);
