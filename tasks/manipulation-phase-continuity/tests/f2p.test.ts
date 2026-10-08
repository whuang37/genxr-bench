import * as THREE from "three";
import { expect, it, it_session, vi } from "@xrblocks/devtools/test";
import { Script } from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type { RaySourceInput } from "@xrblocks/source/interaction/InteractionTypes.ts";
import type { ManipulationEvent } from "@xrblocks/source/interaction/manipulation/ManipulationTypes.ts";

class ManipulatedObject extends Script {
  readonly events: ManipulationEvent[] = [];
  override onObjectManipulate(event: ManipulationEvent): void {
    this.events.push(event);
  }
}

it("continues a nested transformed model from its scaled pose after the second controller releases", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const parent = new THREE.Group();
  parent.position.set(2, -1, 0.5);
  parent.rotation.set(0.2, -0.35, 0.1);
  parent.scale.set(1.4, 0.8, 1.2);
  const owner = new ManipulatedObject();
  owner.position.set(0.3, 0.2, -0.1);
  owner.rotation.set(0.15, -0.2, 0.3);
  owner.xb = { manipulation: { actions: { translate: true, scale: true } } };
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  owner.add(surface);
  parent.add(owner);
  await callbacks.initScript(owner);
  const primary = controller(0, "left");
  const auxiliary = controller(1, "right");

  update(interaction, [ray(primary, true, 0, surface)]);
  update(interaction, [ray(primary, true, 0.4, surface)]);
  update(interaction, [
    ray(primary, true, 0.4, surface),
    ray(auxiliary, true, 1),
  ]);
  update(interaction, [
    ray(primary, true, 0.1, surface),
    ray(auxiliary, true, 1.7),
  ]);

  const scaledWorldPosition = owner.getWorldPosition(new THREE.Vector3());
  const scaledSize = owner.scale.clone();
  expect(scaledSize.x).toBeGreaterThan(1);

  update(interaction, [
    ray(primary, true, 0.1, surface),
    ray(auxiliary, false, 1.7),
  ]);
  const resumedStart = latest(owner.events, "translate", "start");
  expect(resumedStart?.sources).toHaveLength(1);

  update(interaction, [ray(primary, true, 0.35, surface)]);
  const continuedWorldPosition = owner.getWorldPosition(new THREE.Vector3());
  expect(continuedWorldPosition.x - scaledWorldPosition.x).toBeCloseTo(0.25, 6);
  expect(owner.scale.distanceTo(scaledSize)).toBeLessThan(1e-6);

  update(interaction, [ray(primary, false, 0.35, surface)]);
  expect(interaction.isManipulating(owner)).toBe(false);
  expect(latest(owner.events, "scale", "end")).toBeDefined();
  expect(latest(owner.events, "translate", "end")).toBeDefined();
});

it_session(
  "keeps a public model stable when a second controller releases after scaling",
  { switchHands: true },
  async (session, { primaryHand, secondaryHand }) => {
    await session.stepFrame(3);
    await session.gesture(primaryHand, "neutral");
    await session.gesture(secondaryHand, "neutral");
    await session.pointTo(primaryHand, { tag: "phase-model" });
    await session.startSelect(primaryHand);
    await session.stepFrame(2);
    await session.pointTo(primaryHand, [0.2, 1.25, -1.4]);
    await session.stepFrame(2);
    await session.pointTo(secondaryHand, { tag: "phase-model" });
    await session.startSelect(secondaryHand);
    await session.stepFrame(2);
    await session.pointTo(primaryHand, [0.05, 1.25, -1.4]);
    await session.pointTo(secondaryHand, [0.75, 1.25, -1.4]);
    await session.stepFrame(3);
    const beforeRelease = await modelState(session);
    await session.endSelect(secondaryHand);
    await session.stepFrame(2);
    await session.pointTo(primaryHand, [0.25, 1.25, -1.4]);
    await session.stepFrame(3);
    const afterResume = await modelState(session);
    expect(afterResume.scale).toEqual(beforeRelease.scale);
    expect(afterResume.position[0] - beforeRelease.position[0]).toBeGreaterThan(
      0.1,
    );
    expect(afterResume.events).toContain("scale:end");
    expect(
      afterResume.events.filter((event) => event === "translate:start").length,
    ).toBeGreaterThanOrEqual(2);
    await session.endSelect(primaryHand);
    await session.stepFrame(2);
    expectNoSessionErrors(session.diagnostics);
  },
);

async function modelState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{
  position: [number, number, number];
  scale: [number, number, number];
  events: string[];
}> {
  const inspection = (await session.objects.inspect({
    tag: "phase-model",
  })) as {
    state?: unknown;
    worldTransform: {
      position: [number, number, number];
      scale: [number, number, number];
    };
  };
  expect(inspection.state).toBeDefined();
  return {
    position: inspection.worldTransform.position,
    scale: inspection.worldTransform.scale,
    events: (inspection.state as { events: string[] }).events,
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

function latest(
  events: ManipulationEvent[],
  action: ManipulationEvent["action"],
  phase: ManipulationEvent["phase"],
): ManipulationEvent | undefined {
  return events
    .filter((event) => event.action === action && event.phase === phase)
    .at(-1);
}

function controller(id: number, handedness: "left" | "right"): Controller {
  const value = new THREE.Object3D() as Controller;
  value.userData = { connected: true, id, selected: false };
  value.inputSource = { handedness };
  return value;
}

function ray(
  source: Controller,
  selected: boolean,
  x: number,
  object?: THREE.Object3D,
): RaySourceInput {
  source.userData.selected = selected;
  const origin = new THREE.Vector3(x, 0, 0);
  return {
    controller: source,
    sourceType: "controller-ray",
    selected,
    ray: new THREE.Ray(origin, new THREE.Vector3(0, 0, -1)),
    position: origin,
    orientation: new THREE.Quaternion(),
    intersections: object
      ? [{ distance: 1, object, point: new THREE.Vector3(x, 0, -1) }]
      : [],
  };
}

function update(interaction: Interaction, raySources: RaySourceInput[]): void {
  interaction.update({ directTouches: [], raySources });
}

async function createInteraction(
  callbacks: ScriptsManager,
): Promise<Interaction> {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const { Interaction } = await import(
    "@xrblocks/source/interaction/Interaction.ts"
  );
  return new Interaction({ callbacks });
}
