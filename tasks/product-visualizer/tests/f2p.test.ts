import {
  captureOutputSnapshot,
  expect,
  expectRenderStateChanged,
  expectTransformChanged,
  it_session,
  type OutputBounds,
  type OutputSnapshot,
} from "@xrblocks/devtools/test";
import * as THREE from "three";
import type { XRBlocksSession } from "@xrblocks/devtools";

const PLACEMENT_SURFACE_THICKNESS_METERS = 0.06;

function makePlacementSurface(): THREE.Object3D {
  return new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 1.2, PLACEMENT_SURFACE_THICKNESS_METERS),
    new THREE.MeshStandardMaterial({ color: 0x777777 }),
  );
}

function makePlacementObstacle(): THREE.Object3D {
  return new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.3, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x444444 }),
  );
}

it_session(
  "the box resizes, rotates, and reports a collision while on the surface",
  {
    required: true,
    switchHands: true,
    scenes: ["Living Room"],
    recording: "product-visualizer",
    realTime: true,
  },
  async (session, { primaryHand }) => {
    const surface = await addPlacementSurface(session);
    await session.stepFrame(40);
    await session.lookAtTarget({ tag: "variable-box" });

    const initialSnapshot = await captureOutputSnapshot(session, {
      tags: ["variable-box", "box-fit-mark"],
    });
    expect(
      initialSnapshot.outputs.find((output) => output.tag === "variable-box")
        ?.render.displayed,
    ).toBe(true);
    expect(
      initialSnapshot.outputs.find((output) => output.tag === "box-fit-mark")
        ?.render.displayed,
    ).toBe(true);
    const initialBounds = boxBounds(initialSnapshot);
    expectRestingOnSurface(initialBounds, surface.topY);

    for (const control of [
      "box-size-x-increase",
      "box-size-x-increase",
      "box-size-y-increase",
      "box-size-z-increase",
    ]) {
      await session.rayClick(primaryHand, { tag: control });
      await session.wait(1_000);
    }

    const resizedSnapshot = await captureOutputSnapshot(session, {
      tags: ["variable-box"],
    });
    const resizedBounds = boxBounds(resizedSnapshot);
    expect(resizedBounds.size[0]).toBeGreaterThan(initialBounds.size[0]);
    expect(resizedBounds.size[1]).toBeGreaterThan(initialBounds.size[1]);
    expect(resizedBounds.size[2]).toBeGreaterThan(initialBounds.size[2]);
    expectRestingOnSurface(resizedBounds, surface.topY);

    for (const control of [
      "box-size-x-decrease",
      "box-size-y-decrease",
      "box-size-z-decrease",
    ]) {
      await session.rayClick(primaryHand, { tag: control });
      await session.wait(1_000);
    }

    const decreasedSnapshot = await captureOutputSnapshot(session, {
      tags: ["variable-box"],
    });
    const decreasedBounds = boxBounds(decreasedSnapshot);
    expect(decreasedBounds.size[0]).toBeLessThan(resizedBounds.size[0]);
    expect(decreasedBounds.size[1]).toBeLessThan(resizedBounds.size[1]);
    expect(decreasedBounds.size[2]).toBeLessThan(resizedBounds.size[2]);
    expectRestingOnSurface(decreasedBounds, surface.topY);

    await session.rayClick(primaryHand, { tag: "box-rotate-right" });
    await session.wait(1_000);
    const rotatedSnapshot = await captureOutputSnapshot(session, {
      tags: ["variable-box", "box-fit-mark"],
    });
    expectTransformChanged(decreasedSnapshot, rotatedSnapshot, "variable-box", {
      rotationDegrees: 1,
    });
    expectRestingOnSurface(boxBounds(rotatedSnapshot), surface.topY);

    await session.rayClick(primaryHand, { tag: "box-rotate-left" });
    await session.wait(1_000);
    const restoredRotationSnapshot = await captureOutputSnapshot(session, {
      tags: ["variable-box", "box-fit-mark"],
    });
    expectTransformChanged(
      rotatedSnapshot,
      restoredRotationSnapshot,
      "variable-box",
      { rotationDegrees: 1 },
    );
    expectRestingOnSurface(boxBounds(restoredRotationSnapshot), surface.topY);

    await session.pointTo(primaryHand, { tag: "variable-box" });
    await session.startSelect(primaryHand);
    await session.lookAtTarget(surface.obstacleDropPoint);
    await session.pointTo(primaryHand, surface.obstacleDropPoint);
    await session.endSelect(primaryHand);
    await session.wait(1_000);

    const movedSnapshot = await captureOutputSnapshot(session, {
      tags: ["variable-box", "box-fit-mark"],
    });
    expectTransformChanged(
      restoredRotationSnapshot,
      movedSnapshot,
      "variable-box",
      { positionMeters: 0.05 },
    );
    expectRestingOnSurface(boxBounds(movedSnapshot), surface.topY);
    expect(
      movedSnapshot.outputs.find((output) => output.tag === "box-fit-mark")
        ?.render.displayed,
    ).toBe(true);
    expectTransformChanged(
      restoredRotationSnapshot,
      movedSnapshot,
      "box-fit-mark",
      { positionMeters: 0.05 },
    );
    expectRenderStateChanged(
      restoredRotationSnapshot,
      movedSnapshot,
      "box-fit-mark",
      ["color"],
    );
  },
);

function boxBounds(snapshot: OutputSnapshot): OutputBounds {
  const box = snapshot.outputs.find((output) => output.tag === "variable-box");
  if (!box) throw new Error("The variable box output is missing.");
  const bounds = box.bounds;
  if (!bounds) throw new Error("The variable box has no world bounds.");
  return bounds;
}

function expectRestingOnSurface(bounds: OutputBounds, topY: number): void {
  expect(Math.abs(bounds.min[1] - topY)).toBeLessThan(0.04);
}

async function addPlacementSurface(session: XRBlocksSession): Promise<{
  topY: number;
  obstacleDropPoint: [number, number, number];
}> {
  const table = await session.getPresetLocation("table-primary");
  const center: [number, number, number] = [
    table[0],
    table[1] - PLACEMENT_SURFACE_THICKNESS_METERS / 2,
    table[2],
  ];
  await session.simulator.addObjects([
    {
      id: "box-placement-surface",
      object: makePlacementSurface(),
      position: center,
      quaternion: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2],
    },
  ]);
  const topY = center[1] + PLACEMENT_SURFACE_THICKNESS_METERS / 2;
  const obstacleCenter: [number, number, number] = [
    center[0] + 0.5,
    topY + 0.15,
    center[2] + 0.3,
  ];
  await session.simulator.addObjects([
    {
      id: "box-placement-obstacle",
      object: makePlacementObstacle(),
      position: obstacleCenter,
    },
  ]);
  return {
    topY,
    obstacleDropPoint: [obstacleCenter[0], topY, obstacleCenter[2]],
  };
}
