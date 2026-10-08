import * as THREE from "three";
import { expect, it, it_session, vi } from "@xrblocks/devtools/test";
import {
  Script,
  type ObjectTouchEvent,
  type ObjectTouchStartEvent,
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
  hand?: THREE.Object3D;
  point: THREE.Vector3;
  selected: boolean;
  orientation?: THREE.Quaternion;
};

type TouchEventRecord = {
  sourceType: string;
  target: THREE.Object3D;
  surface: THREE.Object3D;
  handIndex: number;
  hand?: THREE.Object3D;
  position: number[];
};

class TouchRecorder extends Script {
  readonly touchStarts: TouchEventRecord[] = [];
  readonly touching: TouchEventRecord[] = [];
  readonly touchEnds: TouchEventRecord[] = [];
  readonly selectStarts: SelectEvent[] = [];
  readonly selecting: SelectEvent[] = [];
  readonly selectEnds: SelectEndEvent[] = [];
  preventTouchSelection = false;

  override onObjectTouchStart(event: ObjectTouchStartEvent): void {
    if (this.preventTouchSelection) event.preventDefault();
    this.touchStarts.push(recordTouch(event));
  }

  override onObjectTouching(event: ObjectTouchEvent): void {
    this.touching.push(recordTouch(event));
  }

  override onObjectTouchEnd(event: ObjectTouchEvent): void {
    this.touchEnds.push(recordTouch(event));
  }

  override onObjectSelectStart(event: SelectEvent): void {
    this.selectStarts.push(event);
  }

  override onSelecting(event: SelectEvent): void {
    this.selecting.push(event);
  }

  override onObjectSelectEnd(event: SelectEndEvent): void {
    this.selectEnds.push(event);
  }
}

it("samples each tracked index fingertip in world space for direct touch", async () => {
  installWindowBoundary();
  const { Input } = await import("@xrblocks/source/input/Input.ts");
  const input = new Input();
  const controller = createController(0);
  controller.userData.selected = true;
  const trackingSpace = new THREE.Group();
  trackingSpace.position.set(1, 2, -3);
  const indexTip = new THREE.Object3D();
  indexTip.position.set(0.1, -0.2, 0.3);
  const wrist = new THREE.Object3D();
  trackingSpace.add(indexTip, wrist);
  trackingSpace.updateMatrixWorld(true);

  input.controllers = [controller];
  input.hands = [
    {
      joints: { "index-finger-tip": indexTip, wrist },
    } as unknown as THREE.XRHandSpace,
  ];
  input.controllersEnabled = false;

  input.sampleSources();

  const frame = input.getFrame() as unknown as {
    directTouches?: readonly TouchInput[];
  };
  expect(frame.directTouches).toHaveLength(1);
  expect(frame.directTouches?.[0]).toMatchObject({
    controller,
    handIndex: 0,
    hand: wrist,
    selected: true,
  });
  expect(frame.directTouches?.[0].point.toArray()).toEqual([1.1, 1.8, -2.7]);
  expect(frame.directTouches?.[0]).not.toHaveProperty("intersections");
});

it("dispatches a stable direct-touch lifecycle with public contact data", async () => {
  const { callbacks, interaction } = await createInteraction();
  const target = new TouchRecorder();
  const physical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  interaction.registerHitSurface(physical, target);
  await initialize(callbacks, target);
  const controller = createController(0, "left");
  const wrist = new THREE.Object3D();

  interaction.update(
    touchFrame([touch(controller, new THREE.Vector3(), { hand: wrist })]),
  );
  interaction.update(
    touchFrame([
      touch(controller, new THREE.Vector3(0.2, 0, 0), { hand: wrist }),
    ]),
  );
  interaction.update(
    touchFrame([
      touch(controller, new THREE.Vector3(2, 0, 0), { hand: wrist }),
    ]),
  );

  expect(target.touchStarts).toHaveLength(1);
  expect(target.touching).toHaveLength(1);
  expect(target.touchEnds).toHaveLength(1);
  expect(target.touchStarts[0]).toEqual({
    sourceType: "direct-touch",
    target,
    surface: target,
    handIndex: 0,
    hand: wrist,
    position: [0, 0, 0],
  });
  expect(target.touching[0].position).toEqual([0.2, 0, 0]);
  expect(target.touchEnds[0].position).toEqual([2, 0, 0]);
});

it("starts touch selection by default and lets touch start suppress only that default", async () => {
  const { callbacks, interaction } = await createInteraction();
  const selectedTarget = new TouchRecorder();
  const preventedTarget = new TouchRecorder();
  preventedTarget.preventTouchSelection = true;
  const selectedPhysical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  const preventedPhysical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  preventedPhysical.position.x = 3;
  interaction.registerHitSurface(selectedPhysical, selectedTarget);
  interaction.registerHitSurface(preventedPhysical, preventedTarget);
  await initialize(callbacks, selectedTarget, preventedTarget);
  const controller = createController(0);

  interaction.update(touchFrame([touch(controller, new THREE.Vector3())]));
  expect(selectedTarget.selectStarts).toHaveLength(1);
  expect(selectedTarget.selecting).toHaveLength(1);
  expect(selectedTarget.selectStarts[0].source.type).toBe("direct-touch");
  expect(interaction.isSelectingAt(selectedTarget)).toBe(true);

  interaction.update(
    touchFrame([touch(controller, new THREE.Vector3(0.1, 0, 0))]),
  );
  expect(selectedTarget.selectStarts).toHaveLength(1);
  expect(selectedTarget.selecting).toHaveLength(2);
  expect(selectedTarget.selectEnds).toHaveLength(0);
  expect(interaction.isSelectingAt(selectedTarget)).toBe(true);

  interaction.update(
    touchFrame([touch(controller, new THREE.Vector3(2, 0, 0))]),
  );
  expect(selectedTarget.selectEnds).toHaveLength(1);
  expect(selectedTarget.selectEnds[0]).toMatchObject({
    completed: true,
    reason: "released",
    source: { type: "direct-touch" },
  });

  interaction.update(
    touchFrame([touch(controller, new THREE.Vector3(3, 0, 0))]),
  );
  interaction.update(
    touchFrame([touch(controller, new THREE.Vector3(3.1, 0, 0))]),
  );
  expect(preventedTarget.touchStarts).toHaveLength(1);
  expect(preventedTarget.touching).toHaveLength(1);
  expect(preventedTarget.selectStarts).toHaveLength(0);
  expect(interaction.isSelectingAt(preventedTarget)).toBe(false);
});

it("keeps a contact through small boundary jitter before ending it once", async () => {
  const { callbacks, interaction } = await createInteraction();
  const target = new TouchRecorder();
  interaction.registerHitSurface(
    new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)),
    target,
  );
  await initialize(callbacks, target);
  const controller = createController(0);

  interaction.update(
    touchFrame([touch(controller, new THREE.Vector3(0.49, 0, 0))]),
  );
  interaction.update(
    touchFrame([touch(controller, new THREE.Vector3(0.501, 0, 0))]),
  );
  expect(target.touchStarts).toHaveLength(1);
  expect(target.touching).toHaveLength(1);
  expect(target.touchEnds).toHaveLength(0);

  interaction.update(
    touchFrame([touch(controller, new THREE.Vector3(0.7, 0, 0))]),
  );
  expect(target.touchEnds).toHaveLength(1);
  expect(target.selectEnds).toHaveLength(1);
  expect(target.selectEnds[0]).toMatchObject({
    completed: true,
    reason: "released",
  });
});

it("does not transfer an owned contact to an overlapping target until it exits", async () => {
  const { callbacks, interaction } = await createInteraction();
  const first = new TouchRecorder();
  const second = new TouchRecorder();
  const firstPhysical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  const secondPhysical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  secondPhysical.position.x = 0.7;
  firstPhysical.updateMatrixWorld();
  secondPhysical.updateMatrixWorld();
  interaction.registerHitSurface(firstPhysical, first);
  interaction.registerHitSurface(secondPhysical, second);
  await initialize(callbacks, first, second);
  const controller = createController(0);

  interaction.update(touchFrame([touch(controller, new THREE.Vector3())]));
  interaction.update(
    touchFrame([touch(controller, new THREE.Vector3(0.5, 0, 0))]),
  );

  expect(first.touchStarts, "the first target starts").toHaveLength(1);
  expect(first.touching, "the first target owns the overlap").toHaveLength(1);
  expect(first.touchEnds, "the first target remains in contact").toHaveLength(
    0,
  );
  expect(second.touchStarts, "the second target waits").toHaveLength(0);

  interaction.update(
    touchFrame([touch(controller, new THREE.Vector3(0.8, 0, 0))]),
  );

  expect(
    first.touchEnds,
    "the first target ends after leaving it",
  ).toHaveLength(1);
  expect(first.selectEnds[0]).toMatchObject({
    completed: false,
    reason: "released-outside",
  });
  expect(second.touchStarts, "the second target still waits").toHaveLength(0);

  interaction.update(
    touchFrame([touch(controller, new THREE.Vector3(2, 0, 0))]),
  );
  interaction.update(
    touchFrame([touch(controller, new THREE.Vector3(0.8, 0, 0))]),
  );
  expect(
    second.touchStarts,
    "the second target starts after exit",
  ).toHaveLength(1);
});

it("cancels an active touch selection once when its input source is lost", async () => {
  const { callbacks, interaction } = await createInteraction();
  const target = new TouchRecorder();
  interaction.registerHitSurface(
    new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)),
    target,
  );
  await initialize(callbacks, target);
  const controller = createController(0);

  interaction.update(touchFrame([touch(controller, new THREE.Vector3())]));
  interaction.update(touchFrame([]));
  interaction.update(touchFrame([]));

  expect(target.touchEnds).toHaveLength(1);
  expect(target.selectEnds).toHaveLength(1);
  expect(target.selectEnds[0]).toMatchObject({
    completed: false,
    reason: "source-lost",
  });
  expect(interaction.isSelectingAt(target)).toBe(false);
  expect(interaction.getResolvedRay(controller)).toBeUndefined();
});

it("gives direct contact precedence over a simultaneous ray from the same hand", async () => {
  const { callbacks, interaction } = await createInteraction();
  const touchTarget = new TouchRecorder();
  const rayTarget = new TouchRecorder();
  const touchPhysical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  const rayPhysical = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  rayPhysical.position.x = 3;
  interaction.registerHitSurface(touchPhysical, touchTarget);
  interaction.registerHitSurface(rayPhysical, rayTarget);
  await initialize(callbacks, touchTarget, rayTarget);
  const controller = createController(0);

  interaction.update(
    touchFrame(
      [touch(controller, new THREE.Vector3())],
      [ray(controller, true, hit(rayPhysical))],
    ),
  );

  expect(touchTarget.touchStarts).toHaveLength(1);
  expect(touchTarget.selectStarts).toHaveLength(1);
  expect(rayTarget.selectStarts).toHaveLength(0);
  expect(interaction.getResolvedRay(controller)).toBeUndefined();
});

it_session(
  "routes simulator fingertip contact through the running application",
  { switchHands: true },
  async (session, { primaryHand }) => {
    const before = await directTouchState(session);
    expect(before.touchStarts).toBe(0);
    expect(before.selectStarts).toBe(0);

    await session.gesture(primaryHand, "pointing");
    await session.reachTo(primaryHand, { tag: "direct-touch-target" });
    await session.stepFrame(2);

    const active = await directTouchState(session);
    expect(active.touchStarts).toBe(1);
    expect(active.touching).toBeGreaterThan(0);
    expect(active.selectStarts).toBe(1);
    expect(active.selecting).toBeGreaterThan(0);
    expect(active.lastSource).toBe("direct-touch");

    await session.reachTo(primaryHand, [0.7, 1.45, -0.7]);
    await session.stepFrame(2);

    const ended = await directTouchState(session);
    expect(ended.touchEnds).toBe(1);
    expect(ended.selectEnds).toBe(1);
    expect(ended.lastEndReason).toBe("released");
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

function createController(
  id: number,
  handedness: "left" | "right" = "right",
): Controller {
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { connected: true, id, selected: false };
  controller.inputSource = { handedness };
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

function ray(
  controller: Controller,
  selected: boolean,
  intersection?: THREE.Intersection,
): RaySourceInput {
  controller.userData.selected = selected;
  return {
    controller,
    sourceType: "hand-ray",
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

function recordTouch(event: ObjectTouchEvent): TouchEventRecord {
  return {
    sourceType: event.source.type,
    target: event.target,
    surface: event.surface,
    handIndex: event.handIndex,
    hand: event.hand,
    position: event.touchPosition.toArray(),
  };
}

async function directTouchState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{
  touchStarts: number;
  touching: number;
  touchEnds: number;
  selectStarts: number;
  selecting: number;
  selectEnds: number;
  lastSource: string | null;
  lastEndReason: string | null;
}> {
  const target = (await session.objects.inspect({
    tag: "direct-touch-target",
  })) as { state?: unknown };
  expect(target?.state).toBeDefined();
  return target.state as {
    touchStarts: number;
    touching: number;
    touchEnds: number;
    selectStarts: number;
    selecting: number;
    selectEnds: number;
    lastSource: string | null;
    lastEndReason: string | null;
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

function installWindowBoundary(): void {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
}
