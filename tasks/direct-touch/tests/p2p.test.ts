import * as THREE from "three";
import { expect, it, it_session, vi } from "@xrblocks/devtools/test";
import {
  Script,
  type ObjectTouchEvent,
  type SelectEndEvent,
  type SelectEvent,
} from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type {
  InteractionFrameInput,
  RaySourceInput,
} from "@xrblocks/source/interaction/InteractionTypes.ts";

type TouchInput = {
  controller: Controller;
  handIndex: number;
  point: THREE.Vector3;
  selected: boolean;
};

class Recorder extends Script {
  readonly touchStarts: ObjectTouchEvent[] = [];
  readonly selectStarts: SelectEvent[] = [];
  readonly selectEnds: SelectEndEvent[] = [];

  override onObjectTouchStart(event: ObjectTouchEvent): void {
    this.touchStarts.push(event);
  }

  override onObjectSelectStart(event: SelectEvent): void {
    this.selectStarts.push(event);
  }

  override onObjectSelectEnd(event: SelectEndEvent): void {
    this.selectEnds.push(event);
  }
}

it("keeps ordinary ray selection start, hold, and completed release callbacks", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const target = new Recorder();
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(physical, target);
  await callbacks.initScript(target);
  const controller = createController(0);

  interaction.update(frame([], [ray(controller, false, physical)]));
  interaction.update(frame([], [ray(controller, true, physical)]));
  interaction.update(frame([], [ray(controller, true, physical)]));
  interaction.update(frame([], [ray(controller, false, physical)]));

  expect(target.selectStarts).toHaveLength(1);
  expect(target.selectStarts[0].source.type).toBe("controller-ray");
  expect(target.selectEnds).toHaveLength(1);
  expect(target.selectEnds[0]).toMatchObject({
    completed: true,
    reason: "released",
    source: { type: "controller-ray" },
  });
});

it("keeps ordinary ray cancellation on release outside and source loss", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const target = new Recorder();
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(physical, target);
  await callbacks.initScript(target);
  const controller = createController(0);

  interaction.update(frame([], [ray(controller, true, physical)]));
  interaction.update(frame([], [ray(controller, false)]));
  interaction.update(frame([], [ray(controller, true, physical)]));
  interaction.update(frame([], []));

  expect(target.selectStarts).toHaveLength(2);
  expect(target.selectEnds).toHaveLength(2);
  expect(
    target.selectEnds.map(({ completed, reason }) => ({ completed, reason })),
  ).toEqual([
    { completed: false, reason: "released-outside" },
    { completed: false, reason: "source-lost" },
  ]);
});

it("keeps hit-surface unregistration from routing later ray callbacks", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const target = new Recorder();
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  const unregister = interaction.registerHitSurface(physical, target);
  await callbacks.initScript(target);
  const controller = createController(0);

  interaction.update(frame([], [ray(controller, true, physical)]));
  interaction.update(frame([], [ray(controller, false, physical)]));
  unregister();
  interaction.update(frame([], [ray(controller, true, physical)]));
  interaction.update(frame([], [ray(controller, false, physical)]));

  expect(target.selectStarts).toHaveLength(1);
  expect(target.selectEnds).toHaveLength(1);
});

it("keeps controller disconnection and listener cleanup independent from touch sampling", async () => {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const { Input } = await import("@xrblocks/source/input/Input.ts");
  const input = new Input();
  const controller = createController(0);
  controller.userData.selected = true;
  input.controllers.push(controller);
  const selectEnd = vi.fn();
  input.bindListener("selectend", selectEnd);

  input.defaultOnDisconnected({ type: "disconnected", target: controller });
  expect(controller.userData.selected).toBe(false);
  expect(selectEnd).toHaveBeenCalledOnce();

  input.dispose();
  controller.dispatchEvent({ type: "selectend", target: controller });
  expect(selectEnd).toHaveBeenCalledOnce();
});

it_session(
  "keeps a live simulator ray available outside direct contact",
  async (session, { primaryHand }) => {
    const before = await rayState(session);
    expect(before.selectStarts).toBe(0);
    expect(before.selectEnds).toBe(0);

    await session.gesture(primaryHand, "neutral");
    await session.pointTo(primaryHand, { tag: "ray-only-target" });
    await session.click(primaryHand);
    await session.stepFrame(2);

    const selected = await rayState(session);
    expect(selected.selectStarts).toBe(1);
    expect(selected.selectEnds).toBe(1);
    expect(selected.lastSource).toBe("controller-ray");
    expect(selected.completed).toBe(true);
    expectNoSessionErrors(session.diagnostics);
  },
);

it("keeps hidden and interaction-disabled surfaces out of direct-touch contact", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const target = new Recorder();
  const physical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  physical.xb = { pointerEvents: "none" };
  interaction.registerHitSurface(physical, target);
  await callbacks.initScript(target);
  const controller = createController(0);

  interaction.update(frame([touch(controller, new THREE.Vector3())]));
  interaction.update(frame([touch(controller, new THREE.Vector3())]));

  expect(target.touchStarts).toHaveLength(0);
  expect(target.selectStarts).toHaveLength(0);
  expect(target.selectEnds).toHaveLength(0);

  physical.xb = { pointerEvents: "auto" };
  const hiddenParent = new THREE.Group();
  hiddenParent.visible = false;
  hiddenParent.add(physical);
  interaction.update(frame([touch(controller, new THREE.Vector3())]));
  expect(target.touchStarts).toHaveLength(0);

  hiddenParent.visible = true;
  target.xb = { interactionEnabled: false };
  interaction.update(frame([touch(controller, new THREE.Vector3())]));
  expect(target.touchStarts).toHaveLength(0);
});

function createController(id: number): Controller {
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { connected: true, id, selected: false };
  controller.inputSource = { handedness: "right" };
  return controller;
}

function touch(controller: Controller, point: THREE.Vector3): TouchInput {
  return { controller, handIndex: 0, point, selected: false };
}

function ray(
  controller: Controller,
  selected: boolean,
  object?: THREE.Object3D,
): RaySourceInput {
  controller.userData.selected = selected;
  return {
    controller,
    sourceType: "controller-ray",
    selected,
    ray: new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1)),
    position: new THREE.Vector3(),
    orientation: new THREE.Quaternion(),
    ...(object
      ? {
          intersections: [
            {
              distance: 1,
              object,
              point: new THREE.Vector3(0, 0, -1),
            },
          ],
        }
      : {}),
  };
}

function frame(
  directTouches: TouchInput[],
  raySources: RaySourceInput[] = [],
): InteractionFrameInput {
  return { raySources, directTouches } as unknown as InteractionFrameInput;
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

async function rayState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{
  selectStarts: number;
  selectEnds: number;
  lastSource: string | null;
  completed: boolean | null;
}> {
  const target = (await session.objects.inspect({
    tag: "ray-only-target",
  })) as { state?: unknown };
  expect(target?.state).toBeDefined();
  return target.state as {
    selectStarts: number;
    selectEnds: number;
    lastSource: string | null;
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
