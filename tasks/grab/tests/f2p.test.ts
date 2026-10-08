import * as THREE from "three";
import { expect, it, it_session, vi } from "@xrblocks/devtools/test";
import {
  type ObjectGrabEvent,
  Script,
  type SelectEndEvent,
} from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type {
  InteractionFrameInput,
  RaySourceInput,
} from "@xrblocks/source/interaction/InteractionTypes.ts";
import type { ManipulationEvent } from "@xrblocks/source/interaction/manipulation/ManipulationTypes.ts";

type TouchInput = {
  controller: Controller;
  handIndex: number;
  hand?: THREE.Object3D;
  point: THREE.Vector3;
  selected: boolean;
};

type GrabRecord = {
  sourceType: string;
  target: THREE.Object3D;
  surface: THREE.Object3D;
  handIndex: number;
  hand: THREE.Object3D;
  position: number[];
};

class GrabRecorder extends Script {
  readonly grabStarts: GrabRecord[] = [];
  readonly grabbing: GrabRecord[] = [];
  readonly grabEnds: GrabRecord[] = [];
  readonly selectEnds: SelectEndEvent[] = [];
  readonly manipulationPhases: string[] = [];

  override onObjectGrabStart(event: ObjectGrabEvent): void {
    this.grabStarts.push(recordGrab(event));
  }

  override onObjectGrabbing(event: ObjectGrabEvent): void {
    this.grabbing.push(recordGrab(event));
  }

  override onObjectGrabEnd(event: ObjectGrabEvent): void {
    this.grabEnds.push(recordGrab(event));
  }

  override onObjectSelectEnd(event: SelectEndEvent): void {
    this.selectEnds.push(event);
  }

  override onObjectManipulate(event: ManipulationEvent): void {
    this.manipulationPhases.push(event.phase);
  }
}

it("starts, streams, and ends grab only while a touching hand pinches", async () => {
  const { callbacks, interaction } = await createInteraction();
  const target = new GrabRecorder();
  const physical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  interaction.registerHitSurface(physical, target);
  await initialize(callbacks, target);
  const controller = createController(0);
  const wrist = new THREE.Object3D();

  interaction.update(
    touchFrame([touch(controller, new THREE.Vector3(), { hand: wrist })]),
  );
  interaction.update(
    touchFrame([
      touch(controller, new THREE.Vector3(0.1, 0, 0), {
        hand: wrist,
      }),
    ]),
  );
  expect(target.grabStarts).toHaveLength(0);

  interaction.update(
    touchFrame([
      touch(controller, new THREE.Vector3(0.2, 0, 0), {
        hand: wrist,
        selected: true,
      }),
    ]),
  );
  interaction.update(
    touchFrame([
      touch(controller, new THREE.Vector3(0.3, 0, 0), {
        hand: wrist,
        selected: true,
      }),
    ]),
  );

  expect(target.grabStarts).toHaveLength(1);
  expect(target.grabbing).toHaveLength(1);
  expect(target.grabStarts[0]).toEqual({
    sourceType: "direct-touch",
    target,
    surface: target,
    handIndex: 0,
    hand: wrist,
    position: [0.2, 0, 0],
  });
  expect(target.grabbing[0].position).toEqual([0.3, 0, 0]);

  interaction.update(
    touchFrame([
      touch(controller, new THREE.Vector3(0.35, 0, 0), { hand: wrist }),
    ]),
  );
  interaction.update(
    touchFrame([
      touch(controller, new THREE.Vector3(0.4, 0, 0), { hand: wrist }),
    ]),
  );

  expect(target.grabEnds).toHaveLength(1);
  expect(target.grabEnds[0].position).toEqual([0.35, 0, 0]);
});

it("starts direct manipulation on grab and keeps contact after pinch release", async () => {
  const { callbacks, interaction } = await createInteraction();
  const target = new GrabRecorder();
  target.xb = { manipulation: true };
  const physical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  target.add(physical);
  target.updateMatrixWorld(true);
  interaction.registerHitSurface(physical, target);
  await initialize(callbacks, target);
  const controller = createController(0);
  const wrist = new THREE.Object3D();

  interaction.update(
    touchFrame([
      touch(controller, new THREE.Vector3(), { hand: wrist, selected: true }),
    ]),
  );
  expect(interaction.isManipulating(target)).toBe(true);
  expect(target.manipulationPhases).toContain("start");

  interaction.update(
    touchFrame([
      touch(controller, new THREE.Vector3(0.25, 0, 0), {
        hand: wrist,
        selected: true,
      }),
    ]),
  );
  expect(target.position.x).toBeCloseTo(0.25);
  expect(target.manipulationPhases).toContain("update");

  interaction.update(
    touchFrame([
      touch(controller, new THREE.Vector3(0.25, 0, 0), { hand: wrist }),
    ]),
  );
  expect(target.grabEnds).toHaveLength(1);
  expect(target.manipulationPhases).toContain("end");
  expect(interaction.isManipulating(target)).toBe(false);
  expect(interaction.isSelectingAt(target)).toBe(true);
});

it("ends an active grab and cancels manipulation when the touch source is lost", async () => {
  const { callbacks, interaction } = await createInteraction();
  const target = new GrabRecorder();
  target.xb = { manipulation: true };
  const physical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  target.add(physical);
  target.updateMatrixWorld(true);
  interaction.registerHitSurface(physical, target);
  await initialize(callbacks, target);
  const controller = createController(0);
  const wrist = new THREE.Object3D();

  interaction.update(
    touchFrame([
      touch(controller, new THREE.Vector3(), { hand: wrist, selected: true }),
    ]),
  );
  interaction.update(touchFrame([]));
  interaction.update(touchFrame([]));

  expect(target.grabStarts).toHaveLength(1);
  expect(target.grabEnds).toHaveLength(1);
  expect(target.manipulationPhases).toContain("cancel");
  expect(interaction.isManipulating(target)).toBe(false);
  expect(target.selectEnds).toHaveLength(1);
  expect(target.selectEnds[0]).toMatchObject({
    completed: false,
    reason: "source-lost",
    source: { type: "direct-touch" },
  });
});

it("keeps the first hand as manipulation owner when another hand also pinches", async () => {
  const { callbacks, interaction } = await createInteraction();
  const target = new GrabRecorder();
  target.xb = { manipulation: true };
  const physical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  target.add(physical);
  target.updateMatrixWorld(true);
  interaction.registerHitSurface(physical, target);
  await initialize(callbacks, target);
  const first = createController(0);
  const second = createController(1);
  const firstWrist = new THREE.Object3D();
  const secondWrist = new THREE.Object3D();

  interaction.update(
    touchFrame([
      touch(first, new THREE.Vector3(), {
        hand: firstWrist,
        selected: true,
      }),
    ]),
  );
  expect(interaction.isManipulating(target)).toBe(true);

  interaction.update(
    touchFrame([
      touch(first, new THREE.Vector3(), {
        hand: firstWrist,
        selected: true,
      }),
      touch(second, new THREE.Vector3(0.1, 0, 0), {
        hand: secondWrist,
        selected: true,
      }),
    ]),
  );
  expect(target.grabStarts).toHaveLength(2);
  expect(interaction.isManipulating(target)).toBe(true);

  interaction.update(
    touchFrame([
      touch(first, new THREE.Vector3(0.2, 0, 0), {
        hand: firstWrist,
        selected: true,
      }),
    ]),
  );
  expect(interaction.isManipulating(target)).toBe(true);
  expect(target.position.x).toBeCloseTo(0.2);
});

it_session(
  "routes simulator reach, pinch, move, and release through grab",
  { switchHands: true },
  async (session, { primaryHand }) => {
    const before = await grabState(session);
    expect(before.grabStarts).toBe(0);
    expect(before.position).toEqual([0, 1.45, -0.7]);

    await session.gesture(primaryHand, "pinching");
    await session.reachTo(primaryHand, before.position);
    await session.startSelect(primaryHand);
    await session.stepFrame(2);

    const active = await grabState(session);
    expect(active.touchStarts).toBe(1);
    expect(active.grabStarts).toBe(1);
    expect(active.grabbing).toBeGreaterThan(0);
    expect(active.lastSource).toBe("direct-touch");
    expect(active.manipulationStarts).toBe(1);

    await session.moveHand(primaryHand, { rightMeters: 0.08 });
    await session.stepFrame(2);

    const moved = await grabState(session);
    expect(moved.manipulationUpdates).toBeGreaterThan(0);
    expect(moved.position[0]).not.toBeCloseTo(before.position[0]);

    await session.endSelect(primaryHand);
    await session.stepFrame(2);

    const released = await grabState(session);
    expect(released.grabEnds).toBe(1);
    expect(released.manipulationEnds).toBe(1);
    expect(released.touchEnds).toBe(0);
    expectNoSessionErrors(session.diagnostics);
  },
);

async function createInteraction(): Promise<{
  callbacks: ScriptsManager;
  interaction: Interaction;
}> {
  installWindowBoundary();
  const { Interaction } = await import(
    "@xrblocks/source/interaction/Interaction.ts"
  );
  const callbacks = new ScriptsManager(async () => {});
  return { callbacks, interaction: new Interaction({ callbacks }) };
}

async function initialize(
  callbacks: ScriptsManager,
  ...scripts: Script[]
): Promise<void> {
  await Promise.all(scripts.map((script) => callbacks.initScript(script)));
}

function createController(id: number): Controller {
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { connected: true, id, selected: false };
  controller.inputSource = { handedness: "right" };
  return controller;
}

function touch(
  controller: Controller,
  point: THREE.Vector3,
  values: Partial<TouchInput> = {},
): TouchInput {
  return {
    controller,
    handIndex: 0,
    point,
    selected: false,
    ...values,
  };
}

function touchFrame(
  directTouches: TouchInput[],
  raySources: RaySourceInput[] = [],
): InteractionFrameInput {
  return { raySources, directTouches } as unknown as InteractionFrameInput;
}

function recordGrab(event: ObjectGrabEvent): GrabRecord {
  return {
    sourceType: event.source.type,
    target: event.target,
    surface: event.surface,
    handIndex: event.handIndex,
    hand: event.hand,
    position: event.touchPosition.toArray(),
  };
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
  manipulationUpdates: number;
  manipulationEnds: number;
  lastSource: string | null;
  position: number[];
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
    manipulationUpdates: number;
    manipulationEnds: number;
    lastSource: string | null;
    position: number[];
  };
}

function installWindowBoundary(): void {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
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
