import * as THREE from "three";
import { expect, it, it_session, vi } from "@xrblocks/devtools/test";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type { RaySourceInput } from "@xrblocks/source/interaction/InteractionTypes.ts";

it("keeps ordinary on-surface slider dragging and commit behavior", async () => {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [{ Interaction }, { UISlider }] = await Promise.all([
    import("@xrblocks/source/interaction/Interaction.ts"),
    import("@xrblocks/source/ui/components/UISlider.ts"),
  ]);
  const callbacks = new ScriptsManager(async () => {});
  const interaction: Interaction = new Interaction({ callbacks });
  const changes = vi.fn();
  const slider = new UISlider({
    ariaLabel: "Volume",
    min: 0,
    max: 100,
    step: 1,
    value: 25,
    onChange: changes,
  });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(surface, slider);
  await callbacks.initScript(slider);
  const source = new THREE.Object3D() as Controller;
  source.userData = { id: 0, connected: true, selected: false };
  source.inputSource = { handedness: "right" };

  interaction.update(frame(input(source, true, surface, 0.25)));
  interaction.update(frame(input(source, true, surface, 0.75)));
  interaction.update(frame(input(source, false, surface, 0.75)));

  expect(slider.value).toBe(75);
  expect(changes).toHaveBeenCalledExactlyOnceWith(75);
});

it("cancels a held drag and ignores later pointer movement", async () => {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [{ Interaction }, { UISlider }] = await Promise.all([
    import("@xrblocks/source/interaction/Interaction.ts"),
    import("@xrblocks/source/ui/components/UISlider.ts"),
  ]);
  const callbacks = new ScriptsManager(async () => {});
  const interaction: Interaction = new Interaction({ callbacks });
  const changes = vi.fn();
  const slider = new UISlider({
    ariaLabel: "Volume",
    min: 0,
    max: 100,
    step: 1,
    value: 25,
    onChange: changes,
  });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(surface, slider);
  await callbacks.initScript(slider);
  const source = new THREE.Object3D() as Controller;
  source.userData = { id: 0, connected: true, selected: false };
  source.inputSource = { handedness: "right" };

  interaction.update(frame(input(source, true, surface, 0.25)));
  interaction.update(frame(input(source, true, surface, 0.75)));
  expect(slider.value).toBe(75);

  interaction.update({ raySources: [], directTouches: [] });
  expect(slider.value).toBe(25);
  expect(changes).not.toHaveBeenCalled();

  interaction.update({
    raySources: [
      {
        controller: source,
        sourceType: "controller-ray",
        selected: false,
        ray: new THREE.Ray(
          new THREE.Vector3(1, 0, 1),
          new THREE.Vector3(0, 0, -1),
        ),
        position: new THREE.Vector3(1, 0, 1),
        orientation: new THREE.Quaternion(),
      },
    ],
    directTouches: [],
  });
  expect(slider.value).toBe(25);
  expect(changes).not.toHaveBeenCalled();
});

it("keeps ordinary ray buttons actionable", async () => {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [{ Interaction }, { UIButton }] = await Promise.all([
    import("@xrblocks/source/interaction/Interaction.ts"),
    import("@xrblocks/source/ui/components/UIButton.ts"),
  ]);
  const callbacks = new ScriptsManager(async () => {});
  const interaction: Interaction = new Interaction({ callbacks });
  const onClick = vi.fn();
  const button = new UIButton({ label: "Apply", onClick });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(surface, button);
  await callbacks.initScript(button);
  const source = new THREE.Object3D() as Controller;
  source.userData = { id: 0, connected: true, selected: false };
  source.inputSource = { handedness: "right" };

  interaction.update(frame(input(source, true, surface, 0.5)));
  interaction.update(frame(input(source, false, surface, 0.5)));

  expect(onClick).toHaveBeenCalledOnce();
});

it_session(
  "keeps a mounted slider usable through a real controller select and release",
  async (session, { primaryHand }) => {
    await session.stepFrame(2);
    expect(await session.objects.findByTag("volume-slider")).toHaveLength(1);

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
    expectNoSessionErrors(session.diagnostics);
  },
);

function input(
  controller: Controller,
  selected: boolean,
  object: THREE.Object3D,
  u: number,
): RaySourceInput {
  controller.userData.selected = selected;
  const sourceRay = new THREE.Ray(
    new THREE.Vector3(u - 0.5, 0, 1),
    new THREE.Vector3(0, 0, -1),
  );
  return {
    controller,
    sourceType: "controller-ray",
    selected,
    ray: sourceRay,
    position: sourceRay.origin.clone(),
    orientation: new THREE.Quaternion(),
    intersections: [
      {
        distance: 1,
        object,
        point: new THREE.Vector3(0, 0, -1),
        uv: new THREE.Vector2(u, 0.5),
      },
    ],
  };
}

function frame(source: RaySourceInput) {
  return { raySources: [source], directTouches: [] };
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
