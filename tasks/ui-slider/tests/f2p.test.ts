import * as THREE from "three";
import { expect, it, it_session, vi } from "@xrblocks/devtools/test";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type {
  InteractionFrameInput,
  RaySourceInput,
} from "@xrblocks/source/interaction/InteractionTypes.ts";

it("validates slider configuration and keeps quantized values inside its range", async () => {
  const UISlider = await loadUISlider();
  expect(() => new UISlider({ ariaLabel: "" })).toThrow();
  expect(() => new UISlider({ ariaLabel: "Volume", min: 2, max: 1 })).toThrow();
  expect(
    () => new UISlider({ ariaLabel: "Volume", min: 0, max: 1, step: 0 }),
  ).toThrow();
  expect(
    () => new UISlider({ ariaLabel: "Volume", value: Number.NaN }),
  ).toThrow();
  expect(
    () => new UISlider({ ariaLabel: "Volume", disabled: "no" as never }),
  ).toThrow();

  const slider = new UISlider({
    ariaLabel: "Volume",
    min: -1,
    max: 1,
    step: 0.25,
    value: -0.88,
  });
  expect(slider.min).toBe(-1);
  expect(slider.max).toBe(1);
  expect(slider.step).toBe(0.25);
  expect(slider.value).toBe(-1);

  slider.value = 0.13;
  expect(slider.value).toBe(0.25);
  slider.value = 4;
  expect(slider.value).toBe(1);
  slider.min = 0;
  slider.max = 0.4;
  slider.step = 0.1;
  expect(slider.value).toBe(0.4);
  slider.value = 0.26;
  expect(slider.value).toBe(0.3);
  expect(() => (slider.step = Number.POSITIVE_INFINITY)).toThrow();
  expect(() => (slider.value = Number.NaN)).toThrow();
});

it("streams one exclusive slider capture and commits once on release", async () => {
  const { callbacks, interaction } = await createInteraction();
  const UISlider = await loadUISlider();
  const inputs = vi.fn();
  const changes = vi.fn();
  const slider = new UISlider({
    ariaLabel: "Volume",
    min: 0,
    max: 100,
    step: 25,
    onInput: inputs,
    onChange: changes,
  });
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(2, 1));
  interaction.registerHitSurface(physical, slider);
  await callbacks.initScript(slider);
  const first = controller(0);
  const second = controller(1);

  update(interaction, [
    ray(
      first,
      false,
      hit(physical, 0.25),
      rayThrough(physical, new THREE.Vector3(-0.5, 0, 0)),
    ),
  ]);
  update(interaction, [
    ray(
      first,
      true,
      hit(physical, 0.75),
      rayThrough(physical, new THREE.Vector3(0.5, 0, 0)),
    ),
  ]);
  update(interaction, [
    ray(
      first,
      true,
      hit(physical, 0.75),
      rayThrough(physical, new THREE.Vector3(0.5, 0, 0)),
    ),
    ray(
      second,
      true,
      hit(physical, 0.25),
      rayThrough(physical, new THREE.Vector3(-0.5, 0, 0)),
    ),
  ]);
  update(interaction, [
    ray(
      first,
      true,
      hit(physical, 1),
      rayThrough(physical, new THREE.Vector3(1, 0, 0)),
    ),
    ray(
      second,
      false,
      hit(physical, 0.25),
      rayThrough(physical, new THREE.Vector3(-0.5, 0, 0)),
    ),
  ]);
  update(interaction, [
    ray(
      first,
      false,
      hit(physical, 1),
      rayThrough(physical, new THREE.Vector3(1, 0, 0)),
    ),
  ]);

  expect(slider.value).toBe(100);
  expect(inputs.mock.calls.map(([value]) => value)).toEqual([75, 100]);
  expect(changes).toHaveBeenCalledExactlyOnceWith(100);
});

it("tracks small off-surface ray movements without jumping to a fallback value", async () => {
  const { callbacks, interaction } = await createInteraction();
  const UISlider = await loadUISlider();
  const inputs = vi.fn();
  const changes = vi.fn();
  const slider = new UISlider({
    ariaLabel: "Volume",
    min: 0,
    max: 100,
    step: 1,
    value: 10,
    onInput: inputs,
    onChange: changes,
  });
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(2, 1));
  interaction.registerHitSurface(physical, slider);
  await callbacks.initScript(slider);
  const source = controller(0);

  update(interaction, [
    ray(
      source,
      true,
      hit(physical, 0.1),
      rayThrough(physical, new THREE.Vector3(-0.8, 0, 0)),
    ),
  ]);
  for (const [x, expected] of [
    [-0.78, 11],
    [-0.76, 12],
    [-0.74, 13],
  ] as const) {
    update(interaction, [
      ray(
        source,
        true,
        undefined,
        rayThrough(physical, new THREE.Vector3(x, 0, 0)),
      ),
    ]);
    expect(slider.value).toBe(expected);
  }
  update(interaction, [
    ray(
      source,
      false,
      undefined,
      rayThrough(physical, new THREE.Vector3(-0.74, 0, 0)),
    ),
  ]);

  expect(inputs.mock.calls.map(([value]) => value)).toEqual([11, 12, 13]);
  expect(changes).toHaveBeenCalledExactlyOnceWith(13);
});

it("clamps a captured slider exactly at both ends when the ray leaves its bounds", async () => {
  const { callbacks, interaction } = await createInteraction();
  const UISlider = await loadUISlider();
  const inputs = vi.fn();
  const changes = vi.fn();
  const slider = new UISlider({
    ariaLabel: "Volume",
    min: -20,
    max: 80,
    step: 1,
    value: 30,
    onInput: inputs,
    onChange: changes,
  });
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(2, 1));
  interaction.registerHitSurface(physical, slider);
  await callbacks.initScript(slider);
  const source = controller(0);

  update(interaction, [
    ray(
      source,
      true,
      hit(physical, 0.5),
      rayThrough(physical, new THREE.Vector3(0, 0, 0)),
    ),
  ]);
  update(interaction, [
    ray(
      source,
      true,
      undefined,
      rayThrough(physical, new THREE.Vector3(-4, 0, 0)),
    ),
  ]);
  expect(slider.value).toBe(-20);
  update(interaction, [
    ray(
      source,
      true,
      undefined,
      rayThrough(physical, new THREE.Vector3(4, 0, 0)),
    ),
  ]);
  expect(slider.value).toBe(80);
  update(interaction, [
    ray(
      source,
      false,
      undefined,
      rayThrough(physical, new THREE.Vector3(4, 0, 0)),
    ),
  ]);

  expect(inputs.mock.calls.map(([value]) => value)).toEqual([-20, 80]);
  expect(changes).toHaveBeenCalledExactlyOnceWith(80);
});

it("does not start a capture or mutate an initially disabled slider", async () => {
  const { callbacks, interaction } = await createInteraction();
  const UISlider = await loadUISlider();
  const inputs = vi.fn();
  const changes = vi.fn();
  const slider = new UISlider({
    ariaLabel: "Volume",
    min: 0,
    max: 100,
    step: 25,
    value: 25,
    disabled: true,
    onInput: inputs,
    onChange: changes,
  });
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(2, 1));
  interaction.registerHitSurface(physical, slider);
  await callbacks.initScript(slider);
  const source = controller(0);

  update(interaction, [
    ray(
      source,
      false,
      hit(physical, 0.25),
      rayThrough(physical, new THREE.Vector3(-0.5, 0, 0)),
    ),
  ]);
  update(interaction, [
    ray(
      source,
      true,
      hit(physical, 1),
      rayThrough(physical, new THREE.Vector3(1, 0, 0)),
    ),
  ]);
  update(interaction, [
    ray(
      source,
      false,
      hit(physical, 1),
      rayThrough(physical, new THREE.Vector3(1, 0, 0)),
    ),
  ]);

  expect(slider.value).toBe(25);
  expect(inputs).not.toHaveBeenCalled();
  expect(changes).not.toHaveBeenCalled();
});

it("restores the start value when a slider source is lost or becomes disabled", async () => {
  const { callbacks, interaction } = await createInteraction();
  const UISlider = await loadUISlider();
  const inputs = vi.fn();
  const changes = vi.fn();
  const slider = new UISlider({
    ariaLabel: "Volume",
    min: 0,
    max: 100,
    step: 25,
    value: 25,
    onInput: inputs,
    onChange: changes,
  });
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(2, 1));
  interaction.registerHitSurface(physical, slider);
  await callbacks.initScript(slider);
  const source = controller(0);

  update(interaction, [
    ray(
      source,
      false,
      hit(physical, 0.25),
      rayThrough(physical, new THREE.Vector3(-0.5, 0, 0)),
    ),
  ]);
  update(interaction, [
    ray(
      source,
      true,
      hit(physical, 0.75),
      rayThrough(physical, new THREE.Vector3(0.5, 0, 0)),
    ),
  ]);
  update(interaction, []);
  expect(slider.value).toBe(25);
  expect(inputs.mock.calls.map(([value]) => value)).toEqual([75, 25]);
  expect(changes).not.toHaveBeenCalled();

  update(interaction, [
    ray(
      source,
      false,
      hit(physical, 0.25),
      rayThrough(physical, new THREE.Vector3(-0.5, 0, 0)),
    ),
  ]);
  update(interaction, [
    ray(
      source,
      true,
      hit(physical, 1),
      rayThrough(physical, new THREE.Vector3(1, 0, 0)),
    ),
  ]);
  expect(slider.value).toBe(100);
  slider.disabled = true;
  update(interaction, [
    ray(
      source,
      true,
      hit(physical, 1),
      rayThrough(physical, new THREE.Vector3(1, 0, 0)),
    ),
  ]);

  expect(slider.value).toBe(25);
  expect(inputs.mock.calls.map(([value]) => value)).toEqual([75, 25, 100, 25]);
  expect(changes).not.toHaveBeenCalled();
});

it("continues a captured slider along a transformed nested planar surface", async () => {
  const { callbacks, interaction } = await createInteraction();
  const UISlider = await loadUISlider();
  const inputs = vi.fn();
  const changes = vi.fn();
  const slider = new UISlider({
    ariaLabel: "Volume",
    min: 0,
    max: 100,
    step: 25,
    onInput: inputs,
    onChange: changes,
  });
  const outer = new THREE.Group();
  outer.position.set(0.4, 0.2, -2);
  outer.rotation.set(0.2, 0.35, -0.1);
  outer.scale.set(1.2, 0.8, 1);
  const inner = new THREE.Group();
  inner.position.set(-0.1, 0.15, 0.05);
  inner.rotation.set(-0.1, 0.2, 0.05);
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(2, 1));
  outer.add(inner);
  inner.add(physical);
  new THREE.Scene().add(outer).updateMatrixWorld(true);
  interaction.registerHitSurface(physical, slider);
  await callbacks.initScript(slider);
  const source = controller(0);

  update(interaction, [
    ray(
      source,
      false,
      hit(physical, 0.25),
      rayThrough(physical, new THREE.Vector3(-0.5, 0, 0)),
    ),
  ]);
  update(interaction, [
    ray(
      source,
      true,
      hit(physical, 0.25),
      rayThrough(physical, new THREE.Vector3(-0.5, 0, 0)),
    ),
  ]);
  update(interaction, [
    ray(
      source,
      true,
      undefined,
      rayThrough(physical, new THREE.Vector3(0.5, 0, 0)),
    ),
  ]);
  update(interaction, [
    ray(
      source,
      false,
      undefined,
      rayThrough(physical, new THREE.Vector3(0.5, 0, 0)),
    ),
  ]);

  expect(slider.value).toBe(75);
  expect(inputs.mock.calls.map(([value]) => value)).toEqual([25, 75]);
  expect(changes).toHaveBeenCalledExactlyOnceWith(75);
});

it_session(
  "drives a mounted slider through a real pointer capture and public rendered output",
  async (session, { primaryHand }) => {
    await session.stepFrame(2);
    await expectMountedSlider(session);
    expect(await sliderState(session)).toEqual({
      value: 0,
      inputs: [],
      changes: [],
    });
    const before = await setOfMarkImage(session);

    await session.gesture(primaryHand, "neutral");
    await session.pointTo(primaryHand, { tag: "volume-slider" });
    await session.startSelect(primaryHand);
    await session.stepFrame(2);

    expect(await sliderState(session)).toEqual({
      value: 50,
      inputs: [50],
      changes: [],
    });

    await session.endSelect(primaryHand);
    await session.stepFrame(2);

    expect(await sliderState(session)).toEqual({
      value: 50,
      inputs: [50],
      changes: [50],
    });
    expect(await setOfMarkImage(session)).not.toBe(before);

    const context = (await session.getSceneContext({
      semanticTree: true,
    })) as { semanticTree?: unknown };
    const tree = context.semanticTree as {
      nodes: Record<
        string,
        {
          name: string;
          role: string;
          value?: number;
          min?: number;
          max?: number;
          disabled?: boolean;
          traits?: string[];
        }
      >;
    };
    const node = Object.values(tree.nodes).find(
      (candidate) => candidate.name === "Volume",
    );
    expect(node).toMatchObject({
      role: "slider",
      value: 50,
      min: 0,
      max: 100,
      disabled: false,
      traits: ["selectable"],
    });
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

async function loadUISlider() {
  installWindowBoundary();
  return (await import("@xrblocks/source/ui/components/UISlider.ts")).UISlider;
}

function installWindowBoundary(): void {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
}

function controller(id: number): Controller {
  const source = new THREE.Object3D() as Controller;
  source.userData = { id, connected: true, selected: false };
  source.inputSource = { handedness: "right" };
  return source;
}

function hit(object: THREE.Object3D, u: number): THREE.Intersection {
  return {
    distance: 1,
    object,
    point: new THREE.Vector3(0, 0, -1),
    uv: new THREE.Vector2(u, 0.5),
  };
}

function ray(
  controller: Controller,
  selected: boolean,
  intersection?: THREE.Intersection,
  sourceRay = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1)),
): RaySourceInput {
  controller.userData.selected = selected;
  return {
    controller,
    sourceType: "controller-ray",
    selected,
    ray: sourceRay,
    position: sourceRay.origin.clone(),
    orientation: new THREE.Quaternion(),
    ...(intersection ? { intersections: [intersection] } : {}),
  };
}

function rayThrough(
  surface: THREE.Object3D,
  localPoint: THREE.Vector3,
): THREE.Ray {
  surface.updateWorldMatrix(true, false);
  const point = localPoint.clone().applyMatrix4(surface.matrixWorld);
  const normal = new THREE.Vector3(0, 0, 1)
    .transformDirection(surface.matrixWorld)
    .normalize();
  return new THREE.Ray(
    point.clone().addScaledVector(normal, 1),
    normal.negate(),
  );
}

function update(interaction: Interaction, raySources: RaySourceInput[]): void {
  const frame: InteractionFrameInput = { raySources, directTouches: [] };
  interaction.update(frame);
}

async function sliderState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{ value: number; inputs: number[]; changes: number[] }> {
  const inspection = (await session.objects.inspect({
    tag: "volume-slider",
  })) as { state?: unknown };
  expect(inspection.state).toBeDefined();
  return inspection.state as {
    value: number;
    inputs: number[];
    changes: number[];
  };
}

async function expectMountedSlider(session: {
  objects: { findByTag(tag: string): Promise<unknown[]> };
}): Promise<void> {
  expect(await session.objects.findByTag("volume-slider")).toHaveLength(1);
}

async function setOfMarkImage(session: {
  getSceneContext(options: { setOfMark: boolean }): Promise<unknown>;
}): Promise<string> {
  const context = (await session.getSceneContext({ setOfMark: true })) as {
    setOfMark?: { image?: unknown };
  };
  expect(context.setOfMark?.image).toMatch(/^data:image\/png;base64,/);
  return context.setOfMark!.image as string;
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
