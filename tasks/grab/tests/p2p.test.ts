import * as THREE from "three";
import { expect, it, it_session, vi } from "@xrblocks/devtools/test";
import {
  type ObjectGrabEvent,
  type ObjectTouchEvent,
  type ObjectTouchStartEvent,
  Script,
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

class RayRecorder extends Script {
  readonly selectStarts: SelectEvent[] = [];
  readonly selectEnds: SelectEndEvent[] = [];
  readonly grabStarts: ObjectGrabEvent[] = [];
  readonly touchStarts: ObjectTouchStartEvent[] = [];
  readonly touching: ObjectTouchEvent[] = [];
  readonly touchEnds: ObjectTouchEvent[] = [];

  override onObjectSelectStart(event: SelectEvent): void {
    this.selectStarts.push(event);
  }

  override onObjectSelectEnd(event: SelectEndEvent): void {
    this.selectEnds.push(event);
  }

  override onObjectGrabStart(event: ObjectGrabEvent): void {
    this.grabStarts.push(event);
  }

  override onObjectTouchStart(event: ObjectTouchStartEvent): void {
    this.touchStarts.push(event);
  }

  override onObjectTouching(event: ObjectTouchEvent): void {
    this.touching.push(event);
  }

  override onObjectTouchEnd(event: ObjectTouchEvent): void {
    this.touchEnds.push(event);
  }
}

it("keeps direct-touch enter, retained contact, and exit independent from grab", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const target = new RayRecorder();
  const physical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  interaction.registerHitSurface(physical, target);
  await callbacks.initScript(target);
  const controller = createController(0);
  const hand = new THREE.Object3D();

  interaction.update(frame([touch(controller, hand, new THREE.Vector3())]));
  interaction.update(
    frame([touch(controller, hand, new THREE.Vector3(0.1, 0, 0))]),
  );
  interaction.update(
    frame([touch(controller, hand, new THREE.Vector3(2, 0, 0))]),
  );

  expect(target.touchStarts).toHaveLength(1);
  expect(target.touching).toHaveLength(1);
  expect(target.touchEnds).toHaveLength(1);
  expect(target.touchStarts[0]).toMatchObject({
    source: { type: "direct-touch" },
    handIndex: 0,
    hand,
  });
  expect(target.grabStarts).toHaveLength(0);
});

it("keeps accepted direct-touch selection and completed contact release", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const target = new RayRecorder();
  const physical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  interaction.registerHitSurface(physical, target);
  await callbacks.initScript(target);
  const controller = createController(0);
  const hand = new THREE.Object3D();

  interaction.update(frame([touch(controller, hand, new THREE.Vector3())]));
  interaction.update(frame([touch(controller, hand, new THREE.Vector3())]));
  interaction.update(
    frame([touch(controller, hand, new THREE.Vector3(2, 0, 0))]),
  );

  expect(target.selectStarts).toHaveLength(1);
  expect(target.selectStarts[0].source.type).toBe("direct-touch");
  expect(target.selectEnds).toHaveLength(1);
  expect(target.selectEnds[0]).toMatchObject({
    completed: true,
    reason: "released",
    source: { type: "direct-touch" },
  });
  expect(target.grabStarts).toHaveLength(0);
});

it("keeps ordinary ray cancellation reasons independent from direct grab", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const target = new RayRecorder();
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(physical, target);
  await callbacks.initScript(target);
  const controller = createController(0);

  interaction.update(frame([], [ray(controller, true, hit(physical))]));
  interaction.update(frame([], [ray(controller, false)]));
  interaction.update(frame([], [ray(controller, true, hit(physical))]));
  interaction.update(frame([], []));

  expect(
    target.selectEnds.map(({ completed, reason }) => ({ completed, reason })),
  ).toEqual([
    { completed: false, reason: "released-outside" },
    { completed: false, reason: "source-lost" },
  ]);
  expect(target.grabStarts).toHaveLength(0);
});

it("keeps hit-surface registration cleanup from leaving selectable targets", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const target = new RayRecorder();
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  const unregister = interaction.registerHitSurface(physical, target);
  await callbacks.initScript(target);
  const controller = createController(0);

  interaction.update(frame([], [ray(controller, true, hit(physical))]));
  interaction.update(frame([], [ray(controller, false, hit(physical))]));
  unregister();
  interaction.update(frame([], [ray(controller, true, hit(physical))]));
  interaction.update(frame([], [ray(controller, false, hit(physical))]));

  expect(target.selectStarts).toHaveLength(1);
  expect(target.selectEnds).toHaveLength(1);
});

it_session(
  "keeps direct touch non-grabbing until the simulator pinch begins",
  async (session, { primaryHand }) => {
    const before = await grabState(session);
    expect(before.touchStarts).toBe(0);
    expect(before.grabStarts).toBe(0);

    await session.gesture(primaryHand, "pointing");
    await session.reachTo(primaryHand, { tag: "grab-target" });
    await session.stepFrame(2);

    const touching = await grabState(session);
    expect(touching.touchStarts).toBe(1);
    expect(touching.grabStarts).toBe(0);
    expect(touching.grabbing).toBe(0);
    expect(touching.manipulationStarts).toBe(0);

    await session.reachTo(primaryHand, [0.8, 1.45, -0.7]);
    await session.stepFrame(2);

    const ended = await grabState(session);
    expect(ended.touchEnds).toBe(1);
    expect(ended.grabEnds).toBe(0);
    expectNoSessionErrors(session.diagnostics);
  },
);

it("keeps pinch-like controller selection without contact outside direct grab", async () => {
  const callbacks = new ScriptsManager(async () => {});
  const interaction = await createInteraction(callbacks);
  const target = new RayRecorder();
  const physical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  interaction.registerHitSurface(physical, target);
  await callbacks.initScript(target);
  const controller = createController(0);

  interaction.update(frame([], [ray(controller, false, hit(physical))]));
  interaction.update(frame([], [ray(controller, true, hit(physical))]));
  interaction.update(frame([], [ray(controller, false, hit(physical))]));

  expect(target.selectStarts).toHaveLength(1);
  expect(target.selectStarts[0].source.type).toBe("controller-ray");
  expect(target.selectEnds).toHaveLength(1);
  expect(target.selectEnds[0]).toMatchObject({
    completed: true,
    reason: "released",
    source: { type: "controller-ray" },
  });
  expect(target.grabStarts).toHaveLength(0);
});

function createController(id: number): Controller {
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { connected: true, id, selected: false };
  controller.inputSource = { handedness: "right" };
  return controller;
}

function frame(
  directTouches: TouchInput[],
  raySources: RaySourceInput[] = [],
): InteractionFrameInput {
  return { raySources, directTouches } as unknown as InteractionFrameInput;
}

function touch(
  controller: Controller,
  hand: THREE.Object3D,
  point: THREE.Vector3,
): TouchInput {
  return {
    controller,
    handIndex: 0,
    hand,
    point,
    selected: false,
  } as TouchInput;
}

function ray(
  controller: Controller,
  selected: boolean,
  intersection?: THREE.Intersection,
): RaySourceInput {
  controller.userData.selected = selected;
  return {
    controller,
    sourceType: "controller-ray",
    selected,
    ray: new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1)),
    position: new THREE.Vector3(),
    orientation: new THREE.Quaternion(),
    ...(intersection ? { intersections: [intersection] } : {}),
  };
}

function hit(object: THREE.Object3D): THREE.Intersection {
  return {
    distance: 1,
    object,
    point: new THREE.Vector3(0, 0, -1),
  };
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

async function grabState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{
  touchStarts: number;
  touchEnds: number;
  grabStarts: number;
  grabbing: number;
  grabEnds: number;
  manipulationStarts: number;
}> {
  const target = (await session.objects.inspect({
    tag: "grab-target",
  })) as { state?: unknown };
  expect(target?.state).toBeDefined();
  return target.state as {
    touchStarts: number;
    touchEnds: number;
    grabStarts: number;
    grabbing: number;
    grabEnds: number;
    manipulationStarts: number;
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
