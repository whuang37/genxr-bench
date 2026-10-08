import * as THREE from "three";

import { expect, it, it_session } from "@xrblocks/devtools/test";

import { FollowHead } from "@xrblocks/source/placement/FollowHead.ts";

it("keeps automatic follow updates suspended while the object is held", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const object = new THREE.Object3D();
  scene.add(camera, object);
  const follow = new FollowHead({
    offset: new THREE.Vector3(0, 0, -1),
    smoothing: 1,
  });
  object.add(follow);
  follow.init({ camera, timer: { getDelta: () => 1 } as THREE.Timer });
  follow.update();

  follow.suspend();
  object.position.set(4, 2, -3);
  camera.position.set(-2, 1, 5);
  follow.update();

  expect(object.position.toArray()).toEqual([4, 2, -3]);
});

it("keeps ordinary automatic motion unchanged before manipulation", () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const object = new THREE.Object3D();
  scene.add(camera, object);
  const follow = new FollowHead({
    offset: new THREE.Vector3(0.5, -0.25, -2),
    smoothing: 1,
  });
  object.add(follow);
  follow.init({ camera, timer: { getDelta: () => 1 } as THREE.Timer });

  camera.position.set(1, 2, 3);
  follow.update();

  expect(object.position.x).toBeCloseTo(1.5);
  expect(object.position.y).toBeCloseTo(1.75);
  expect(object.position.z).toBeCloseTo(1);
});

it_session(
  "manipulates and resumes a public head-following card through the simulator",
  async (session, { primaryHand }) => {
    await session.stepFrame(3);
    const initial = await cardPosition(session);
    await session.gesture(primaryHand, "neutral");
    await session.pointTo(primaryHand, { tag: "follow-card" });
    await session.startSelect(primaryHand);
    await session.pointTo(primaryHand, [0.3, 1.45, -1.2]);
    await session.stepFrame(2);
    const held = await cardPosition(session);
    expect(distance(held, initial)).toBeGreaterThan(0.05);
    await session.endSelect(primaryHand);
    await session.stepFrame(2);
    const released = await cardPosition(session);
    // The simulator settles the pointer transform over the next frame.
    expect(distance(released, held)).toBeLessThan(0.04);
    await session.rotate({ yawDegrees: 20, speedDegreesPerSecond: 90 });
    await session.stepFrame(3);
    expect(distance(await cardPosition(session), released)).toBeGreaterThan(
      0.01,
    );
    expectNoSessionErrors(session.diagnostics);
  },
);

function distance(left: readonly number[], right: readonly number[]): number {
  return Math.hypot(...left.map((value, index) => value - (right[index] ?? 0)));
}

async function cardPosition(session: {
  objects: {
    inspect(target: { tag: string }): Promise<{
      worldTransform: { position: [number, number, number] };
    }>;
  };
}): Promise<[number, number, number]> {
  return (await session.objects.inspect({ tag: "follow-card" })).worldTransform
    .position;
}

function expectNoSessionErrors(diagnostics: {
  consoleEntries: Array<{ level?: unknown }>;
  pageErrors: unknown[];
  networkErrors: unknown[];
}): void {
  expect(
    diagnostics.consoleEntries.filter((entry) => entry.level === "error"),
  ).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
  expect(diagnostics.networkErrors).toEqual([]);
}
