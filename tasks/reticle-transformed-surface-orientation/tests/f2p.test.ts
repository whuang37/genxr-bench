import * as THREE from "three";
import { afterEach, expect, it, it_session, vi } from "@xrblocks/devtools/test";
import { Script } from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { ReticleOptions } from "@xrblocks/source/core/Options.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { RaySourceInput } from "@xrblocks/source/interaction/InteractionTypes.ts";
import type { Reticle } from "@xrblocks/source/interaction/reticle/Reticle.ts";

afterEach(() => vi.unstubAllGlobals());

class Target extends Script {
  override onObjectSelectStart(): void {}
}

it("keeps a reticle flush as a nested mirrored surface moves", async () => {
  const { Interaction, Reticle, ReticleOptions } = await loadSources();
  const scene = new THREE.Scene();
  const callbacks = new ScriptsManager(async () => {});
  const options = new ReticleOptions();
  options.defaultRenderDistance = 0.7;
  const interaction = new Interaction({
    callbacks,
    scene,
    reticleOptions: options,
  });
  const reticle = new Reticle(0);
  const controller = createController(reticle);
  const target = new Target();
  const outer = new THREE.Group();
  outer.rotation.set(0.35, -0.42, 0.2);
  outer.scale.set(-1.7, 0.55, 1.3);
  const inner = new THREE.Group();
  inner.rotation.set(-0.18, 0.24, 0.1);
  inner.scale.set(0.8, 1.25, 0.7);
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  target.add(surface);
  inner.add(target);
  outer.add(inner);
  scene.add(outer);
  await callbacks.initScript(target);
  interaction.registerHitSurface(surface, target);

  for (const offset of [
    new THREE.Vector3(),
    new THREE.Vector3(0.4, -0.2, 0.3),
  ]) {
    outer.position.copy(offset);
    scene.updateMatrixWorld(true);
    interaction.update({
      directTouches: [],
      raySources: [rayAt(surface, controller)],
    });
    expect(reticle.visible).toBe(true);
    expect(reticle.targetObject).toBe(target);
    expect(reticle.intersection).toBeDefined();
    expect(
      reticle.position.distanceTo(reticle.intersection!.point),
    ).toBeLessThan(1e-6);
    expect(surfaceAlignment(reticle, surface)).toBeLessThan(1e-5);
  }

  reticle.dispose();
  surface.geometry.dispose();
  surface.material.dispose();
});

it_session(
  "keeps hover and pressed reticles flush with a transformed surface",
  async (session, { primaryHand }) => {
    await session.gesture(primaryHand, "neutral");
    await session.pointTo(primaryHand, { tag: "reticle-surface" });
    await session.stepFrame(2);
    expect(await reticleState(session)).toMatchObject({
      visible: true,
      hasIntersection: true,
      target: "Transformed reticle surface",
      pressedScale: 1,
    });
    expect((await reticleState(session)).surfaceAlignment).toBeLessThan(0.01);
    await session.startSelect(primaryHand);
    await session.stepFrame(2);
    const pressed = await reticleState(session);
    expect(pressed.pressedScale).toBeGreaterThan(0);
    expect(pressed.pressedScale).toBeLessThan(1);
    expect(pressed.surfaceAlignment).toBeLessThan(0.01);
    await session.endSelect(primaryHand);
    await session.stepFrame(2);
    expect((await reticleState(session)).pressedScale).toBe(1);
    expectNoSessionErrors(session.diagnostics);
  },
);

function createController(reticle: Reticle): Controller {
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { id: 0, connected: true, selected: false };
  controller.inputSource = { handedness: "right" };
  controller.reticle = reticle;
  return controller;
}
function rayAt(
  surface: THREE.Object3D,
  controller: Controller,
): RaySourceInput {
  const center = surface.localToWorld(new THREE.Vector3());
  const normal = new THREE.Vector3(0, 0, 1)
    .applyMatrix3(new THREE.Matrix3().getNormalMatrix(surface.matrixWorld))
    .normalize();
  const origin = center.clone().addScaledVector(normal, 2);
  return {
    controller,
    selected: false,
    sourceType: "controller-ray",
    orientation: new THREE.Quaternion(),
    position: origin,
    ray: new THREE.Ray(origin, normal.negate()),
  };
}
function surfaceAlignment(reticle: Reticle, surface: THREE.Object3D): number {
  const center = surface.localToWorld(new THREE.Vector3());
  const u = surface
    .localToWorld(new THREE.Vector3(0.2, 0, 0))
    .sub(center)
    .normalize();
  const v = surface
    .localToWorld(new THREE.Vector3(0, 0.2, 0))
    .sub(center)
    .normalize();
  const normal = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(reticle.quaternion)
    .normalize();
  return Math.max(Math.abs(normal.dot(u)), Math.abs(normal.dot(v)));
}
async function loadSources(): Promise<{
  Interaction: typeof import("@xrblocks/source/interaction/Interaction.ts").Interaction;
  Reticle: typeof Reticle;
  ReticleOptions: typeof ReticleOptions;
}> {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [{ Interaction }, { Reticle }, { ReticleOptions }] = await Promise.all([
    import("@xrblocks/source/interaction/Interaction.ts"),
    import("@xrblocks/source/interaction/reticle/Reticle.ts"),
    import("@xrblocks/source/core/Options.ts"),
  ]);
  return { Interaction, Reticle, ReticleOptions };
}
async function reticleState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{
  visible: boolean;
  hasIntersection: boolean;
  target: string | null;
  pressedScale: number;
  surfaceAlignment: number;
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
    surfaceAlignment: number;
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
