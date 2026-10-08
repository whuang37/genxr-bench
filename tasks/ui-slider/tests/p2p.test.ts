import * as THREE from "three";
import { expect, it, it_session, vi } from "@xrblocks/devtools/test";
import type {
  LongSelectEvent,
  SelectEndEvent,
} from "@xrblocks/source/core/Script.ts";
import { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type {
  InteractionFrameInput,
  RaySourceInput,
} from "@xrblocks/source/interaction/InteractionTypes.ts";
import { UIButton } from "@xrblocks/source/ui/components/UIButton.ts";

class RecordingButton extends UIButton {
  ends: SelectEndEvent[] = [];
  longSelects: LongSelectEvent[] = [];

  override onObjectSelectEnd(event: SelectEndEvent): void {
    this.ends.push(event);
    super.onObjectSelectEnd(event);
  }

  override onObjectLongSelect(event: LongSelectEvent): void {
    this.longSelects.push(event);
    super.onObjectLongSelect(event);
  }
}

it("keeps UISlider custom object events available to typed applications", async () => {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const { UISlider } = await import(
    "@xrblocks/source/ui/components/UISlider.ts"
  );
  interface SliderEvents extends THREE.Object3DEventMap {
    valuePreview: { value: number };
  }

  const slider = new UISlider<SliderEvents>({ ariaLabel: "Volume" });
  const received = vi.fn();
  slider.addEventListener("valuePreview", (event) => received(event.value));
  slider.dispatchEvent({ type: "valuePreview", value: 0.5 });

  expect(received).toHaveBeenCalledExactlyOnceWith(0.5);
});

it("keeps ordinary ray button selection independent from slider capture", async () => {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const { Interaction } = await import(
    "@xrblocks/source/interaction/Interaction.ts"
  );
  const callbacks = new ScriptsManager(async () => {});
  const interaction: Interaction = new Interaction({ callbacks });
  const clicked = vi.fn();
  const button = new UIButton({ label: "Save", onClick: clicked });
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(physical, button);
  await callbacks.initScript(button);
  const source = controller(0);

  update(interaction, [ray(source, false, physical)]);
  update(interaction, [ray(source, true, physical)]);
  update(interaction, [ray(source, false, physical)]);

  expect(clicked).toHaveBeenCalledOnce();
});

it("keeps button cancellation on release outside and source loss", async () => {
  installWindow();
  const { Interaction } = await import(
    "@xrblocks/source/interaction/Interaction.ts"
  );
  const callbacks = new ScriptsManager(async () => {});
  const interaction: Interaction = new Interaction({ callbacks });
  const clicked = vi.fn();
  const button = new RecordingButton({ label: "Cancel", onClick: clicked });
  const physical = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(physical, button);
  await callbacks.initScript(button);
  const source = controller(0);

  update(interaction, [ray(source, true, physical)]);
  update(interaction, [ray(source, false)]);
  update(interaction, [ray(source, true, physical)]);
  update(interaction, []);

  expect(clicked).not.toHaveBeenCalled();
  expect(
    button.ends.map(({ completed, reason }) => ({ completed, reason })),
  ).toEqual([
    { completed: false, reason: "released-outside" },
    { completed: false, reason: "source-lost" },
  ]);
});

it("keeps gaze dwell and long-select behavior for ordinary buttons", async () => {
  installWindow();
  const { Interaction } = await import(
    "@xrblocks/source/interaction/Interaction.ts"
  );
  const callbacks = new ScriptsManager(async () => {});
  const interaction: Interaction = new Interaction({ callbacks });
  const gazeClick = vi.fn();
  const gazeButton = new RecordingButton({ label: "Gaze", onClick: gazeClick });
  const gazeSurface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(gazeSurface, gazeButton);
  const holdClick = vi.fn();
  const holdButton = new RecordingButton({ label: "Hold", onClick: holdClick });
  const holdSurface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(holdSurface, holdButton);
  await Promise.all([
    callbacks.initScript(gazeButton),
    callbacks.initScript(holdButton),
  ]);
  const gaze = controller(2);
  const pointer = controller(0);

  update(interaction, [ray(gaze, false, gazeSurface, undefined, "gaze")], 0);
  update(interaction, [ray(gaze, false, gazeSurface, undefined, "gaze")], 2);
  update(interaction, [ray(pointer, true, holdSurface)], 0);
  update(interaction, [ray(pointer, true, holdSurface)], 0.8);
  update(interaction, [ray(pointer, false, holdSurface)]);

  expect(gazeClick).toHaveBeenCalledOnce();
  expect(holdButton.longSelects).toHaveLength(1);
  expect(holdClick).not.toHaveBeenCalled();
});

it("keeps disabled buttons inert while enabled siblings remain selectable", async () => {
  installWindow();
  const { Interaction } = await import(
    "@xrblocks/source/interaction/Interaction.ts"
  );
  const callbacks = new ScriptsManager(async () => {});
  const interaction: Interaction = new Interaction({ callbacks });
  const disabledClick = vi.fn();
  const enabledClick = vi.fn();
  const disabled = new UIButton({
    label: "Disabled",
    disabled: true,
    onClick: disabledClick,
  });
  const enabled = new UIButton({ label: "Enabled", onClick: enabledClick });
  const disabledSurface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  const enabledSurface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(disabledSurface, disabled);
  interaction.registerHitSurface(enabledSurface, enabled);
  await Promise.all([
    callbacks.initScript(disabled),
    callbacks.initScript(enabled),
  ]);
  const source = controller(0);

  update(interaction, [ray(source, true, disabledSurface)]);
  update(interaction, [ray(source, false, disabledSurface)]);
  update(interaction, [ray(source, true, enabledSurface)]);
  update(interaction, [ray(source, false, enabledSurface)]);

  expect(disabledClick).not.toHaveBeenCalled();
  expect(enabledClick).toHaveBeenCalledOnce();
});

it("keeps card edge translation and two-source scaling independent from sliders", async () => {
  installWindow();
  const [{ Interaction }, { UICard }] = await Promise.all([
    import("@xrblocks/source/interaction/Interaction.ts"),
    import("@xrblocks/source/ui/components/UICard.ts"),
  ]);
  const callbacks = new ScriptsManager(async () => {});
  const interaction: Interaction = new Interaction({ callbacks });
  const card = new UICard({
    size: { width: 0.5, height: 0.3 },
    manipulation: true,
    edge: true,
  });
  new THREE.Scene().add(card);
  const edge = new THREE.Object3D();
  edge.xb = { manipulationHandle: { action: "translate" } };
  interaction.registerHitSurface(edge, card);
  await callbacks.initScript(card);
  const first = controller(0);
  const second = controller(1);

  update(interaction, [ray(first, true, edge, new THREE.Vector3())]);
  update(interaction, [ray(first, true, edge, new THREE.Vector3(0.5, 0, 0))]);
  expect(card.position.x).not.toBe(0);

  update(interaction, [
    ray(first, true, edge, new THREE.Vector3()),
    ray(second, true, edge, new THREE.Vector3()),
  ]);
  update(interaction, [
    ray(first, true, edge, new THREE.Vector3()),
    ray(second, true, edge, new THREE.Vector3(1, 0, 0)),
  ]);
  expect(card.scale.x).not.toBe(1);
});

it("keeps cards, panels, images, text, and custom UI events available", async () => {
  installWindow();
  const [{ UICard }, { UIPanel }, { UIImage }, { UIText }] = await Promise.all([
    import("@xrblocks/source/ui/components/UICard.ts"),
    import("@xrblocks/source/ui/components/UIPanel.ts"),
    import("@xrblocks/source/ui/components/UIImage.ts"),
    import("@xrblocks/source/ui/components/UIText.ts"),
  ]);
  interface CardEvents extends THREE.Object3DEventMap {
    moved: { x: number };
  }
  const card = new UICard<CardEvents>({ size: { width: 1, height: 0.5 } });
  const panel = new UIPanel();
  const image = new UIImage({ src: "status.png" });
  const text = new UIText({ text: "Ready" });
  const moved = vi.fn();
  card.addEventListener("moved", (event) => moved(event.x));
  card.dispatchEvent({ type: "moved", x: 2 });
  panel.add(image, text);
  card.add(panel);

  expect(moved).toHaveBeenCalledExactlyOnceWith(2);
  expect(panel.isUI).toBe(true);
  expect(image.src).toBe("status.png");
  expect(text.text).toBe("Ready");
  expect(card.children).toContain(panel);
});

it_session(
  "keeps an unrelated mounted button available to the browser session",
  async (session, { primaryHand }) => {
    await session.stepFrame(2);
    expect(await buttonState(session)).toEqual({ clicks: 0 });

    await session.gesture(primaryHand, "neutral");
    await session.pointTo(primaryHand, { tag: "unrelated-button" });
    await session.click(primaryHand);
    await session.stepFrame(2);

    expect(await buttonState(session)).toEqual({ clicks: 1 });
    expectNoSessionErrors(session.diagnostics);
  },
);

function controller(id: number): Controller {
  const source = new THREE.Object3D() as Controller;
  source.userData = { id, connected: true, selected: false };
  source.inputSource = { handedness: "right" };
  return source;
}

function ray(
  controller: Controller,
  selected: boolean,
  object?: THREE.Object3D,
  position = new THREE.Vector3(),
  sourceType: RaySourceInput["sourceType"] = "controller-ray",
): RaySourceInput {
  controller.userData.selected = selected;
  return {
    controller,
    sourceType,
    selected,
    ray: new THREE.Ray(position, new THREE.Vector3(0, 0, -1)),
    position,
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

function update(
  interaction: Interaction,
  raySources: RaySourceInput[],
  delta = 0,
): void {
  const frame: InteractionFrameInput = { raySources, directTouches: [] };
  interaction.update(frame, delta);
}

function installWindow(): void {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
}

async function buttonState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{ clicks: number }> {
  const inspection = (await session.objects.inspect({
    tag: "unrelated-button",
  })) as { state?: unknown };
  expect(inspection.state).toBeDefined();
  return inspection.state as { clicks: number };
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
