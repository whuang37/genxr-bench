import type { Vec3Tuple } from "@xrblocks/devtools";
import {
  captureOutputSnapshot,
  expect,
  expectOnSurface,
  it_session,
  judge,
} from "@xrblocks/devtools/test";

const AQUARIUM_TAG = "wall-aquarium";

it_session(
  "three wall clicks leave three visible aquariums after a floor click",
  {
    required: true,
    scenes: ["Living Room"],
    recording: "wall-aquarium",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    await session.stepFrame(20);
    expect(await session.objects.findByTag(AQUARIUM_TAG)).toHaveLength(0);

    await session.navigateTo(await session.getPresetLocation("wall-view"));
    const wall = await session.getPresetLocation("wall-primary");
    const wallSites: Vec3Tuple[] = [
      offset(wall, -0.45, -0.18),
      offset(wall, 0, 0.18),
      offset(wall, 0.45, -0.18),
    ];

    for (const site of wallSites) {
      await session.lookAtTarget(site);
      await session.pointTo(primaryHand, site);
      await session.click(primaryHand);
      await session.stepFrame(8);
    }

    const wallPlacement = await captureOutputSnapshot(session, {
      tags: [AQUARIUM_TAG],
    });
    expect(wallPlacement.outputs).toHaveLength(wallSites.length);
    for (const aquarium of wallPlacement.outputs) {
      expectOnSurface(
        wallPlacement,
        { tag: AQUARIUM_TAG, id: aquarium.id },
        { toleranceMeters: 0.08 },
      );
    }
    const wallAquariums = (await session.getScreenshot()) as string;
    const wallAquariumIds = wallPlacement.outputs
      .map((aquarium) => aquarium.id)
      .sort();

    const floor = wallPlacement.surfaces.find(
      (surface) => surface.label === "floor",
    );
    expect(floor).toBeDefined();
    const clearFloor = await session.getPresetLocation("floor-primary");
    const floorTarget: [number, number, number] = [
      clearFloor[0],
      floor!.position[1],
      clearFloor[2],
    ];
    await session.lookAtTarget(floorTarget);
    await session.pointTo(primaryHand, floorTarget);
    await session.click(primaryHand);
    await session.stepFrame(8);

    const afterFloorClick = await captureOutputSnapshot(session, {
      tags: [AQUARIUM_TAG],
    });
    expect(afterFloorClick.outputs).toHaveLength(wallSites.length);
    expect(
      afterFloorClick.outputs.map((aquarium) => aquarium.id).sort(),
    ).toEqual(wallAquariumIds);
    await session.lookAtTarget(wall);
    await session.stepFrame(8);
    const verdict = await judge({
      prompt:
        "Objective: Verify wall placement, animation, and floor-click rejection. Required changes: Three upright aquariums with frames, water, plants, and fish remain flush to the wall. Fish positions change between views, and the floor click creates or moves no aquarium.",
      evidence: [
        {
          type: "image",
          label: "Three aquariums after wall clicks",
          image: wallAquariums,
        },
        {
          type: "image",
          label: "Same aquariums after rejected floor click",
          image: (await session.getScreenshot()) as string,
        },
      ],
    });
    expect(verdict.verdict, verdict.reason).toBe(true);
  },
);

function offset(
  point: Vec3Tuple,
  horizontalOffset: number,
  verticalOffset: number,
): Vec3Tuple {
  return [point[0] + horizontalOffset, point[1] + verticalOffset, point[2]];
}
