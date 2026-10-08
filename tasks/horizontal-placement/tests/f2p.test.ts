import * as THREE from "three";

import { expect, it, it_session, vi } from "@xrblocks/devtools/test";

Object.defineProperty(globalThis, "window", {
  value: { location: { search: "" } },
  configurable: true,
});

const { placeOnHorizontalSurface } = await import(
  "@xrblocks/source/world/HorizontalPlacement.ts"
);

function plane(
  label: string,
  position: THREE.Vector3,
  polygon = [
    new THREE.Vector2(-1.5, -1.5),
    new THREE.Vector2(1.5, -1.5),
    new THREE.Vector2(1.5, 1.5),
    new THREE.Vector2(-1.5, 1.5),
  ],
  orientation = "horizontal",
) {
  const result = new THREE.Group() as THREE.Group & {
    label?: string;
    orientation?: string;
    simulatorPlane?: { polygon: THREE.Vector2[] };
  };
  result.label = label;
  result.orientation = orientation;
  result.simulatorPlane = { polygon };
  result.position.copy(position);
  return result;
}

function placementObject() {
  const result = new THREE.Group();
  const content = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4));
  content.position.y = 0.2;
  result.add(content);
  return result;
}

function camera() {
  const result = new THREE.PerspectiveCamera();
  result.position.set(0, 1.4, 0);
  result.lookAt(0, 0, -2);
  result.updateMatrixWorld(true);
  return result;
}

function detectors(planes: THREE.Object3D[]) {
  return {
    planes: { get: vi.fn(() => planes) },
    meshes: new THREE.Group(),
  };
}

function clock(start = 0, frameStep = 0.1) {
  let elapsed = start;
  const waitFrame = {
    waitFrame: vi.fn(async () => {
      elapsed += frameStep;
    }),
  };
  return {
    elapsed: () => elapsed,
    setElapsed: (value: number) => {
      elapsed = value;
    },
    timer: { getElapsed: () => elapsed },
    waitFrame,
  };
}

it("chooses the transformed table deterministically and aligns an offset object upright facing the user", async () => {
  const scene = new THREE.Scene();
  const activeCamera = camera();
  const tableParent = new THREE.Group();
  const table = plane("table", new THREE.Vector3());
  const floor = plane("floor", new THREE.Vector3(0, -0.25, -1.5));
  tableParent.position.set(0, 0, -2);
  tableParent.rotation.y = Math.PI / 8;
  tableParent.add(table);
  scene.add(tableParent, floor);
  const object = placementObject();
  scene.add(object);
  const { planes, meshes } = detectors([floor, table] as never);
  const timing = clock();

  const placed = await placeOnHorizontalSurface(
    object,
    activeCamera,
    scene,
    planes as never,
    meshes as never,
    timing.waitFrame as never,
    timing.timer as never,
    { milliseconds: 250 },
    5,
  );

  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(object.quaternion);
  const towardCamera = activeCamera
    .getWorldPosition(new THREE.Vector3())
    .sub(object.getWorldPosition(new THREE.Vector3()))
    .projectOnPlane(new THREE.Vector3(0, 1, 0))
    .normalize();
  const forward = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(object.quaternion)
    .normalize();

  expect(placed).toBe(true);
  expect(timing.waitFrame.waitFrame).not.toHaveBeenCalled();
  expect(bounds.min.y).toBeCloseTo(0);
  expect(up.y).toBeCloseTo(1);
  expect(forward.dot(towardCamera)).toBeGreaterThan(0.99);
  expect(object.getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(0);
  expect(bounds.min.x).toBeGreaterThan(-1.5);
  expect(bounds.max.x).toBeLessThan(1.5);
});

it("retries after visible plane obstacles, excludes mesh-detector and helper meshes, and restores before retry", async () => {
  const scene = new THREE.Scene();
  const activeCamera = camera();
  const targetPlane = plane("table", new THREE.Vector3(0, 0, -2));
  const blockingPlane = new THREE.Mesh(
    new THREE.BoxGeometry(5, 1, 5),
    new THREE.MeshBasicMaterial(),
  ) as THREE.Mesh & {
    label?: string;
    orientation?: string;
    simulatorPlane?: unknown;
  };
  blockingPlane.label = "wall";
  blockingPlane.orientation = "vertical";
  blockingPlane.position.set(0, 0.3, -2);
  const excludedHelper = new THREE.Mesh(
    new THREE.BoxGeometry(5, 1, 5),
    new THREE.MeshBasicMaterial(),
  );
  excludedHelper.name = "reticle-helper";
  excludedHelper.position.copy(blockingPlane.position);
  const meshDetector = new THREE.Group();
  const excludedEnvironmentMesh = new THREE.Mesh(
    new THREE.BoxGeometry(5, 1, 5),
    new THREE.MeshBasicMaterial(),
  );
  excludedEnvironmentMesh.position.copy(blockingPlane.position);
  meshDetector.add(excludedEnvironmentMesh);
  const object = placementObject();
  object.position.set(7, 8, 9);
  object.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.37);
  const originalPosition = object.position.clone();
  const originalQuaternion = object.quaternion.clone();
  scene.add(targetPlane, blockingPlane, excludedHelper, meshDetector, object);
  const activePlanes: THREE.Object3D[] = [targetPlane, blockingPlane];
  const timing = clock();
  timing.waitFrame.waitFrame.mockImplementation(async () => {
    expect(object.position.toArray()).toEqual(originalPosition.toArray());
    expect(object.quaternion.toArray()).toEqual(originalQuaternion.toArray());
    scene.remove(blockingPlane);
    activePlanes.splice(1, 1);
    timing.setElapsed(timing.elapsed() + 0.1);
  });

  const placed = await placeOnHorizontalSurface(
    object,
    activeCamera,
    scene,
    { get: () => activePlanes } as never,
    meshDetector as never,
    timing.waitFrame as never,
    timing.timer as never,
    { milliseconds: 250 },
    5,
  );

  expect(placed).toBe(true);
  expect(timing.waitFrame.waitFrame).toHaveBeenCalled();
  expect(timing.elapsed()).toBeGreaterThan(0);
  expect(object.position.toArray()).not.toEqual(originalPosition.toArray());
});

it("times out deterministically for missing or ineligible detectors and preserves failure state", async () => {
  const scene = new THREE.Scene();
  const activeCamera = camera();
  const missingObject = placementObject();
  missingObject.position.set(4, 5, 6);
  missingObject.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.2);
  scene.add(missingObject);
  const missingTiming = clock();

  const missingResult = await placeOnHorizontalSurface(
    missingObject,
    activeCamera,
    scene,
    undefined,
    undefined,
    missingTiming.waitFrame as never,
    missingTiming.timer as never,
    { milliseconds: 200 },
    5,
  );

  const vertical = plane(
    "wall",
    new THREE.Vector3(0, 0, -2),
    undefined,
    "vertical",
  );
  const upsideDown = plane("table", new THREE.Vector3(0, 0, -2));
  upsideDown.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  const filteredObject = placementObject();
  filteredObject.position.set(-4, 2, 6);
  const filteredOriginal = filteredObject.position.clone();
  scene.add(vertical, upsideDown, filteredObject);
  const filteredTiming = clock();

  const filteredResult = await placeOnHorizontalSurface(
    filteredObject,
    activeCamera,
    scene,
    { get: () => [vertical, upsideDown] } as never,
    undefined,
    filteredTiming.waitFrame as never,
    filteredTiming.timer as never,
    { milliseconds: 200 },
    5,
  );

  expect(missingResult).toBe(false);
  expect(missingTiming.elapsed()).toBeGreaterThanOrEqual(0.2);
  expect(missingTiming.waitFrame.waitFrame).toHaveBeenCalled();
  expect(missingObject.position.toArray()).toEqual([4, 5, 6]);
  expect(filteredResult).toBe(false);
  expect(filteredTiming.elapsed()).toBeGreaterThanOrEqual(0.2);
  expect(filteredTiming.waitFrame.waitFrame).toHaveBeenCalled();
  expect(filteredObject.position.toArray()).toEqual(filteredOriginal.toArray());
});

it_session(
  "places an offset object around a fixed simulator-plane obstacle through the World facade",
  async (session) => {
    const inspection = await waitForPlacementState(session);

    expect(inspection.state).toMatchObject({
      error: null,
      avoidsObstacle: true,
      grounded: true,
      placed: true,
      upright: true,
    });
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "places varied local object shapes on the simulator surface without collisions",
  async (session) => {
    const inspection = await waitForPlacementState(session);
    const state = inspection.state as {
      localComplete: boolean;
      localObjects: Array<{
        bounds: number[][];
        error: string | null;
        finiteBounds: boolean;
        grounded: boolean;
        kind: string;
        obstacleFree: boolean;
        pairwiseFree: boolean;
        placed: boolean;
      }>;
    };
    expect(state.localComplete).toBe(true);
    expect(state.localObjects.map(({ kind }) => kind)).toEqual([
      "offset-box",
      "sphere",
      "tall-cylinder",
    ]);
    for (const object of state.localObjects) {
      const details = JSON.stringify(object);
      expect(object.error, details).toBeNull();
      expect(object.placed, details).toBe(true);
      expect(object.finiteBounds, details).toBe(true);
      expect(object.grounded, details).toBe(true);
      expect(object.obstacleFree, details).toBe(true);
      expect(object.pairwiseFree, details).toBe(true);
      expect(object.bounds).toHaveLength(2);
      expect(
        await session.objects.findByTag(`placed-local-object-${object.kind}`),
      ).toHaveLength(1);
    }
    expectNoSessionErrors(session.diagnostics);
  },
);

async function waitForPlacementState(session: {
  stepFrame(count?: number): Promise<unknown>;
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{ state?: unknown }> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const inspection = (await session.objects.inspect({
      tag: "horizontal-placement-session",
    })) as { state?: { localComplete?: boolean; error?: string | null } };
    if (inspection.state?.localComplete || inspection.state?.error)
      return inspection;
    await session.stepFrame(1);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return (await session.objects.inspect({
    tag: "horizontal-placement-session",
  })) as { state?: unknown };
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
