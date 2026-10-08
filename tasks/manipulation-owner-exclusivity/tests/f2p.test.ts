import * as THREE from "three";
import { expect, it, it_session, vi } from "@xrblocks/devtools/test";
import { Script, type SelectEvent } from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type {
  InteractionFrameInput,
  RaySourceInput,
} from "@xrblocks/source/interaction/InteractionTypes.ts";

class ManipulatedObject extends Script {
  override onObjectSelectStart(_event: SelectEvent): void {}
}

it("keeps an active owner with its first handle when another handle is pressed", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const owner = manipulatedObject();
  const firstHandle = handle();
  const secondHandle = handle();
  owner.add(firstHandle, secondHandle);
  await callbacks.initScript(owner);
  const first = controller(0, "left");
  const second = controller(1, "right");

  update(interaction, [
    ray(first, false, firstHandle, 0),
    ray(second, false, secondHandle, 1),
  ]);
  update(interaction, [
    ray(first, true, firstHandle, 0),
    ray(second, false, secondHandle, 1),
  ]);
  update(interaction, [
    ray(first, true, firstHandle, 0.25),
    ray(second, true, secondHandle, 1),
  ]);
  update(interaction, [
    ray(first, true, firstHandle, 0.5),
    ray(second, true, secondHandle, 2),
  ]);

  expect(owner.position.x).toBeCloseTo(0.5, 6);
  expect(interaction.isManipulating(owner)).toBe(true);

  update(interaction, [
    ray(first, false, firstHandle, 0.5),
    ray(second, false, secondHandle, 1.5),
  ]);
  expect(interaction.isManipulating(owner)).toBe(false);
  expect(owner.position.x).toBeCloseTo(0.5, 6);

  update(interaction, [ray(second, true, secondHandle, 1.5)]);
  update(interaction, [ray(second, true, secondHandle, 1)]);
  expect(owner.position.x).toBeCloseTo(0, 6);
});

it_session(
  "keeps a rendered model with the first controller after its other handle is pressed",
  async (session, { primaryHand, secondaryHand }) => {
    await session.stepFrame(2);
    expect(await session.objects.findByTag("blue-model-handle-1")).toHaveLength(
      1,
    );
    expect(await session.objects.findByTag("blue-model-handle-2")).toHaveLength(
      1,
    );

    await session.gesture(primaryHand, "neutral");
    await session.gesture(secondaryHand, "neutral");
    await session.pointTo(primaryHand, { tag: "blue-model-handle-1" });
    await session.startSelect(primaryHand);
    await session.stepFrame(2);
    await session.pointTo(secondaryHand, { tag: "blue-model-handle-2" });
    await session.startSelect(secondaryHand);
    await session.stepFrame(2);

    await session.moveHand(primaryHand, { rightMeters: 0.2 });
    await session.stepFrame(2);
    const afterPrimaryMove = await modelPosition(session);
    await session.moveHand(secondaryHand, { rightMeters: -0.35 });
    await session.stepFrame(2);

    expect(await modelPosition(session)).toEqual(afterPrimaryMove);
    expectNoSessionErrors(session.diagnostics);
  },
);

async function modelPosition(session: {
  objects: {
    inspect(target: { tag: string }): Promise<{
      worldTransform: { position: [number, number, number] };
    }>;
  };
}): Promise<[number, number, number]> {
  return (await session.objects.inspect({ tag: "blue-model" })).worldTransform
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

function manipulatedObject(): ManipulatedObject {
  const owner = new ManipulatedObject();
  owner.xb = { manipulation: { actions: { translate: true } } };
  return owner;
}

function handle(): THREE.Mesh {
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  physical.xb = { manipulationHandle: { action: "translate" } };
  return physical;
}

function controller(id: number, handedness: "left" | "right"): Controller {
  const source = new THREE.Object3D() as Controller;
  source.userData = { connected: true, id, selected: false };
  source.inputSource = { handedness };
  return source;
}

function ray(
  source: Controller,
  selected: boolean,
  surface: THREE.Object3D,
  x: number,
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
    intersections: [
      {
        distance: 1,
        object: surface,
        point: new THREE.Vector3(x, 0, -1),
      },
    ],
  };
}

function update(interaction: Interaction, raySources: RaySourceInput[]): void {
  const frame: InteractionFrameInput = { raySources, directTouches: [] };
  interaction.update(frame);
}

async function createInteraction(
  callbacks: ScriptsManager,
): Promise<Interaction> {
  installWindowBoundary();
  const { Interaction } = await import(
    "@xrblocks/source/interaction/Interaction.ts"
  );
  return new Interaction({ callbacks });
}

function installWindowBoundary(): void {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
}
