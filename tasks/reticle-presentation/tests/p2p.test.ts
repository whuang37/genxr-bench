import * as THREE from "three";
import { expect, it, it_session, vi } from "@xrblocks/devtools/test";
import type { Input } from "@xrblocks/source/input/Input.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import {
  Script,
  type SelectEndEvent,
  type SelectEvent,
} from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type {
  InteractionFrameInput,
  RaySourceInput,
} from "@xrblocks/source/interaction/InteractionTypes.ts";
import type { Reticle } from "@xrblocks/source/interaction/reticle/Reticle.ts";

class SelectionRecorder extends Script {
  starts: SelectEvent[] = [];
  ends: SelectEndEvent[] = [];

  override onObjectSelectStart(event: SelectEvent): void {
    this.starts.push(event);
  }

  override onObjectSelectEnd(event: SelectEndEvent): void {
    this.ends.push(event);
  }
}

it("creates hidden presentation-only reticles that cannot intercept a ray", async () => {
  const { Input, Reticle } = await loadInputSources();
  const input = new Input();
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { id: 0, connected: true, selected: false };
  input.controllers = [controller];
  input.addReticles();

  expect(controller.reticle).toBeInstanceOf(Reticle);
  expect(controller.reticle?.visible).toBe(false);
  expect(input.reticles.children).toEqual([controller.reticle]);

  const target = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  target.position.z = -1;
  target.updateMatrixWorld(true);
  controller.reticle!.position.set(0, 0, -0.5);
  controller.reticle!.updateMatrixWorld(true);
  const hits = new THREE.Raycaster(
    new THREE.Vector3(),
    new THREE.Vector3(0, 0, -1),
  ).intersectObjects([controller.reticle!, target]);
  expect(hits).not.toHaveLength(0);
  expect(hits.every((hit) => hit.object === target)).toBe(true);
});

it("keeps reticle creation idempotent and hides it when its controller disconnects", async () => {
  const { Input } = await loadInputSources();
  const input = new Input();
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { id: 0, connected: true, selected: true };
  input.controllers = [controller];

  input.addReticles();
  const reticle = controller.reticle!;
  input.addReticles();
  reticle.visible = true;
  input.defaultOnDisconnected({
    type: "disconnected",
    target: controller,
    data: { handedness: "right" },
  });

  expect(controller.reticle).toBe(reticle);
  expect(input.reticles.children).toEqual([reticle]);
  expect(reticle.visible).toBe(false);
  expect(controller.userData.connected).toBe(false);
  expect(controller.userData.selected).toBe(false);
});

it("keeps ordinary registered ray targets selectable while reticles exist", async () => {
  const { Input } = await loadInputSources();
  const input = new Input();
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { id: 0, connected: true, selected: false };
  input.controllers = [controller];
  input.addReticles();

  const callbacks = new ScriptsManager(async () => {});
  const { Interaction } = await import(
    "@xrblocks/source/interaction/Interaction.ts"
  );
  const interaction = new Interaction({ callbacks });
  const target = new SelectionRecorder();
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(surface, target);
  await callbacks.initScript(target);

  update(interaction, [ray(controller, false, surface)]);
  update(interaction, [ray(controller, true, surface)]);
  update(interaction, [ray(controller, false, surface)]);

  expect(target.starts).toHaveLength(1);
  expect(target.ends).toHaveLength(1);
  expect(target.ends[0]).toMatchObject({
    completed: true,
    reason: "released",
    source: { type: "controller-ray" },
  });
});

it("keeps ray capture cancellation when a reticle-bearing source is lost", async () => {
  const { Input } = await loadInputSources();
  const input = new Input();
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { id: 0, connected: true, selected: false };
  input.controllers = [controller];
  input.addReticles();
  const callbacks = new ScriptsManager(async () => {});
  const { Interaction } = await import(
    "@xrblocks/source/interaction/Interaction.ts"
  );
  const interaction = new Interaction({ callbacks });
  const target = new SelectionRecorder();
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(surface, target);
  await callbacks.initScript(target);

  update(interaction, [ray(controller, true, surface)]);
  update(interaction, []);

  expect(target.starts).toHaveLength(1);
  expect(target.ends).toHaveLength(1);
  expect(target.ends[0]).toMatchObject({
    completed: false,
    reason: "source-lost",
  });
  expect(controller.reticle?.visible).toBe(false);
});

async function loadInputSources(): Promise<{
  Input: typeof Input;
  Reticle: typeof Reticle;
}> {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [{ Input }, { Reticle }] = await Promise.all([
    import("@xrblocks/source/input/Input.ts"),
    import("@xrblocks/source/interaction/reticle/Reticle.ts"),
  ]);
  return { Input, Reticle };
}

function ray(
  controller: Controller,
  selected: boolean,
  surface: THREE.Object3D,
): RaySourceInput {
  controller.userData.selected = selected;
  return {
    controller,
    sourceType: "controller-ray",
    selected,
    ray: new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1)),
    position: new THREE.Vector3(),
    orientation: new THREE.Quaternion(),
    intersections: [
      {
        distance: 1,
        object: surface,
        point: new THREE.Vector3(0, 0, -1),
      },
    ],
  };
}

function update(
  interaction: { update(frame: InteractionFrameInput): void },
  raySources: RaySourceInput[],
): void {
  interaction.update({ raySources, directTouches: [] });
}

it_session(
  "keeps ordinary ray selection callbacks available with reticle presentation enabled",
  async (session, { primaryHand }) => {
    await session.stepFrame(2);
    expect(await targetState(session)).toEqual({
      selectStarts: 0,
      selectEnds: 0,
      completed: null,
    });

    await session.gesture(primaryHand, "neutral");
    await session.pointTo(primaryHand, { tag: "reticle-surface" });
    await session.startSelect(primaryHand);
    await session.stepFrame(2);
    expect(await targetState(session)).toMatchObject({
      selectStarts: 1,
      selectEnds: 0,
    });

    await session.endSelect(primaryHand);
    await session.stepFrame(2);
    expect(await targetState(session)).toEqual({
      selectStarts: 1,
      selectEnds: 1,
      completed: true,
    });
    expectNoSessionErrors(session.diagnostics);
  },
);

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
