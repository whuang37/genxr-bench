import * as THREE from "three";
import { expect, it, it_session, judge, vi } from "@xrblocks/devtools/test";
import type { ReticleOptions } from "@xrblocks/source/core/Options.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import {
  type ResolvedRay,
  type InteractionSourceState,
} from "@xrblocks/source/interaction/InteractionTypes.ts";
import type { ReticlePresenter } from "@xrblocks/source/interaction/ReticlePresenter.ts";
import type { Reticle } from "@xrblocks/source/interaction/reticle/Reticle.ts";

it("presents an automatic resolved hit on a rotated nonuniformly scaled surface", async () => {
  const { Reticle, ReticlePresenter } = await loadReticleSources();
  const reticle = new Reticle();
  reticle.rotationSmoothing = 0;
  const controller = createController(reticle);
  const snapshot = raySnapshot(
    controller,
    new THREE.Vector3(0.2, 1.1, 0.4),
    new THREE.Vector3(-0.2, -0.1, -1),
  );
  const outer = new THREE.Group();
  outer.position.set(0.3, 1.2, -1.1);
  outer.rotation.set(0.35, -0.42, 0.2);
  outer.scale.set(1.7, 0.55, 1.3);
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  surface.rotation.set(-0.18, 0.24, 0.1);
  outer.add(surface);
  new THREE.Scene().add(outer).updateMatrixWorld(true);

  const localPoint = new THREE.Vector3(0.15, -0.2, 0);
  const point = localPoint.clone().applyMatrix4(surface.matrixWorld);
  const localNormal = new THREE.Vector3(0, 0, 1);
  const expectedNormal = localNormal
    .clone()
    .applyMatrix3(new THREE.Matrix3().getNormalMatrix(surface.matrixWorld))
    .normalize();
  const target = new THREE.Object3D();
  target.name = "Automatic target";
  const resolved = resolution({
    surface,
    target,
    point,
    normal: localNormal,
    reticleMode: "auto",
  });

  const presenter = new ReticlePresenter();
  presenter.present(snapshot, resolved);

  expect(reticle.visible).toBe(true);
  expect(reticle.intersection).toBe(resolved.intersection);
  expect(reticle.targetObject).toBe(target);
  expect(reticle.position.toArray()).toEqual(point.toArray());
  expect(reticle.direction.toArray()).toEqual(
    snapshot.ray!.direction.clone().normalize().toArray(),
  );
  expect(normalFrom(reticle).dot(expectedNormal)).toBeCloseTo(1, 6);
  expect(reticle.scale.x).toBe(1);

  snapshot.selectionProgress = 0.4;
  presenter.present(snapshot, resolved);
  expect(reticle.scale.x).toBeGreaterThan(0);
  expect(reticle.scale.x).toBeLessThan(1);
});

it("uses reticle modes and visual range without changing the resolved hit contract", async () => {
  const { Reticle, ReticleOptions, ReticlePresenter } =
    await loadReticleSources();
  const options = new ReticleOptions();
  options.maxDistance = 2;
  options.defaultRenderDistance = 1.5;
  const presenter = new ReticlePresenter(options);
  const reticle = new Reticle();
  reticle.rotationSmoothing = 0;
  const controller = createController(reticle);
  const origin = new THREE.Vector3(1, 2, 3);
  const direction = new THREE.Vector3(0, 0, -2);
  const snapshot = raySnapshot(controller, origin, direction, true);
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  const target = new THREE.Object3D();
  target.name = "Hidden from presentation";
  const point = new THREE.Vector3(1, 2, -1);

  const surfaceOnly = resolution({
    surface,
    target,
    point,
    normal: new THREE.Vector3(0, 0, 1),
    reticleMode: "surface",
  });
  presenter.present(snapshot, surfaceOnly);
  expect(reticle.visible).toBe(true);
  expect(reticle.intersection).toBe(surfaceOnly.intersection);
  expect(reticle.targetObject).toBeUndefined();
  expect(reticle.scale.x).toBeLessThan(1);

  presenter.present(
    snapshot,
    resolution({
      surface,
      target,
      point,
      normal: new THREE.Vector3(0, 0, 1),
      reticleMode: "hidden",
    }),
  );
  expect(reticle.visible).toBe(false);
  expect(reticle.intersection).toBeUndefined();
  expect(reticle.targetObject).toBeUndefined();

  const outOfRange = resolution({
    surface,
    target,
    point,
    normal: new THREE.Vector3(0, 0, 1),
    distance: 2,
    reticleMode: "auto",
  });
  presenter.present(snapshot, outOfRange);
  expect(reticle.visible).toBe(true);
  expect(reticle.intersection).toBeUndefined();
  expect(reticle.targetObject).toBeUndefined();
  expect(reticle.position.toArray()).toEqual([1, 2, 1.5]);
  expect(normalFrom(reticle).dot(new THREE.Vector3(0, 0, 1))).toBeCloseTo(1, 6);

  snapshot.selectionProgress = 0.25;
  presenter.present(snapshot, undefined);
  expect(reticle.visible).toBe(true);
  expect(reticle.position.toArray()).toEqual([1, 2, 1.5]);
  expect(reticle.scale.x).toBeGreaterThan(0.7);
  expect(reticle.scale.x).toBeLessThan(1);

  options.defaultRenderDistance = 0;
  presenter.present(snapshot, undefined);
  expect(reticle.visible).toBe(false);
});

it("updates repeated sources and clears all presentation state when a ray is lost", async () => {
  const { Reticle, ReticlePresenter } = await loadReticleSources();
  const presenter = new ReticlePresenter();
  const reticle = new Reticle();
  reticle.rotationSmoothing = 0;
  const controller = createController(reticle);
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  const firstTarget = new THREE.Object3D();
  const secondTarget = new THREE.Object3D();
  const first = raySnapshot(
    controller,
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, -1),
  );

  presenter.present(
    first,
    resolution({
      surface,
      target: firstTarget,
      point: new THREE.Vector3(0, 1, -1),
      normal: new THREE.Vector3(0, 0, 1),
      reticleMode: "auto",
    }),
  );
  const movedCamera = raySnapshot(
    controller,
    new THREE.Vector3(1, 1.4, 0.5),
    new THREE.Vector3(-1, -0.4, -1),
  );
  const secondPoint = new THREE.Vector3(-0.2, 0.6, -1.3);
  presenter.present(
    movedCamera,
    resolution({
      surface,
      target: secondTarget,
      point: secondPoint,
      normal: undefined,
      reticleMode: "auto",
    }),
  );
  expect(reticle.targetObject).toBe(secondTarget);
  expect(reticle.position.toArray()).toEqual(secondPoint.toArray());
  expect(reticle.direction.toArray()).toEqual(
    movedCamera.ray!.direction.clone().normalize().toArray(),
  );
  expect(
    normalFrom(reticle).dot(
      movedCamera.ray!.direction.clone().negate().normalize(),
    ),
  ).toBeCloseTo(1, 6);

  movedCamera.ray = undefined;
  presenter.present(movedCamera, undefined);
  expect(reticle.visible).toBe(false);
  expect(reticle.intersection).toBeUndefined();
  expect(reticle.targetObject).toBeUndefined();
  presenter.clear(controller);
  presenter.clear(controller);

  const withoutReticle = createController();
  const noVisual = raySnapshot(
    withoutReticle,
    new THREE.Vector3(),
    new THREE.Vector3(0, 0, -1),
  );
  expect(() => presenter.present(noVisual, undefined)).not.toThrow();
  expect(() => presenter.clear(withoutReticle)).not.toThrow();
});

it_session(
  "presents hover, transformed orientation, and pressed state through the simulator",
  async (session, { primaryHand }) => {
    await session.stepFrame(2);
    expect(await reticleState(session)).toHaveProperty("visible");

    await session.gesture(primaryHand, "neutral");
    await session.pointTo(primaryHand, { tag: "reticle-surface" });
    await session.stepFrame(2);

    expect(await reticleState(session)).toMatchObject({
      visible: true,
      hasIntersection: true,
      target: "Reticle presentation surface",
      pressedScale: 1,
    });
    const hovering = await reticleState(session);
    expect(hovering.positionError).toBeLessThan(0.0001);
    expect(hovering.normalAlignment).toBeGreaterThan(0.999);
    const hoverImage = await session.getScreenshot();
    await expectReticlePresentation(
      hoverImage,
      "The image must show at least one small, clear aiming reticle on the blue tilted surface at a hand/controller aim point. The reticle must look flush with the surface, and a hover ring must be visible. Two valid reticles may appear because the simulator has two controllers. Return false if no reticle is on the surface, the reticles are detached, or they are large unrelated scene objects.",
    );

    await session.startSelect(primaryHand);
    await session.stepFrame(2);
    const pressed = (await reticleState(session)).pressedScale;
    expect(pressed).toBeGreaterThan(0);
    expect(pressed).toBeLessThan(1);
    expect(await targetState(session)).toMatchObject({
      selectStarts: 1,
      selectEnds: 0,
    });
    const pressedImage = await session.getScreenshot();
    await expectReticlePresentation(
      pressedImage,
      "The image must show a small pressed aiming reticle on the blue tilted surface at a hand/controller aim point. It must remain attached and flush to the surface, and it must have a visibly compact filled or pressed presentation. A second normal reticle may appear because the simulator has two controllers. Return false if no pressed reticle is on the surface, the reticles are detached, or they are large unrelated scene objects.",
    );

    await session.endSelect(primaryHand);
    await session.stepFrame(2);
    expect(await reticleState(session)).toMatchObject({ pressedScale: 1 });
    expect(await targetState(session)).toMatchObject({
      selectStarts: 1,
      selectEnds: 1,
      completed: true,
    });
    expectNoSessionErrors(session.diagnostics);
  },
);

async function expectReticlePresentation(
  image: string,
  prompt: string,
): Promise<void> {
  expect(image).toMatch(/^data:image\/png;base64,/);
  const result = await judge({
    prompt,
    evidence: [
      {
        type: "image",
        label: "Reticle presentation",
        image,
      },
    ],
  });
  expect(result.verdict, result.reason).toBe(true);
}

function createController(reticle?: Reticle): Controller {
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { id: 0, connected: true, selected: false };
  controller.inputSource = { handedness: "right" };
  controller.reticle = reticle;
  return controller;
}

function raySnapshot(
  controller: Controller,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  selected = false,
): InteractionSourceState {
  return {
    controller,
    selected,
    ray: new THREE.Ray(origin, direction),
  } as InteractionSourceState;
}

function resolution({
  surface,
  target,
  point,
  normal,
  distance = 1,
  reticleMode,
}: {
  surface: THREE.Object3D;
  target?: THREE.Object3D;
  point: THREE.Vector3;
  normal: THREE.Vector3 | undefined;
  distance?: number;
  reticleMode: ResolvedRay["reticleMode"];
}): ResolvedRay {
  return {
    intersection: {
      distance,
      object: surface,
      point,
      ...(normal ? { normal } : {}),
    },
    hitObject: surface,
    surface,
    target,
    scriptPath: [],
    objectPath: [surface],
    reticleMode,
  };
}

function normalFrom(reticle: Reticle): THREE.Vector3 {
  return new THREE.Vector3(0, 0, 1).applyQuaternion(reticle.quaternion);
}

async function loadReticleSources(): Promise<{
  ReticleOptions: typeof ReticleOptions;
  ReticlePresenter: typeof ReticlePresenter;
  Reticle: typeof Reticle;
}> {
  installWindowBoundary();
  const [{ ReticleOptions }, { ReticlePresenter }, { Reticle }] =
    await Promise.all([
      import("@xrblocks/source/core/Options.ts"),
      import("@xrblocks/source/interaction/ReticlePresenter.ts"),
      import("@xrblocks/source/interaction/reticle/Reticle.ts"),
    ]);
  return { ReticleOptions, ReticlePresenter, Reticle };
}

function installWindowBoundary(): void {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
}

async function reticleState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{
  visible: boolean;
  hasIntersection: boolean;
  target: string | null;
  pressedScale: number;
  positionError: number;
  normalAlignment: number;
}> {
  const inspection = (await session.objects.inspect({
    tag: "reticle-observer",
  })) as { state?: unknown };
  expect(inspection.state).toBeDefined();
  return inspection.state as {
    visible: boolean;
    hasIntersection: boolean;
    target: string | null;
    pressedScale: number;
    positionError: number;
    normalAlignment: number;
  };
}

async function targetState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{
  selectStarts: number;
  selectEnds: number;
  completed: boolean | null;
}> {
  const inspection = (await session.objects.inspect({
    tag: "reticle-surface",
  })) as { state?: unknown };
  expect(inspection.state).toBeDefined();
  return inspection.state as {
    selectStarts: number;
    selectEnds: number;
    completed: boolean | null;
  };
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
