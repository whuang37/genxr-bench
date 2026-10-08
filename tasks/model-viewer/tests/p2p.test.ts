import * as THREE from "three";
import { expect, it, it_session, vi } from "@xrblocks/devtools/test";
import type { ScriptsManager } from "@xrblocks/source/core/components/ScriptsManager.ts";
import type { Controller } from "@xrblocks/source/input/Controller.ts";
import type { Interaction } from "@xrblocks/source/interaction/Interaction.ts";
import type { RaySourceInput } from "@xrblocks/source/interaction/InteractionTypes.ts";

it("keeps an ordinary UIButton selectable through the shared ray interaction system", async () => {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [{ ScriptsManager }, { Interaction }, { UIButton }] = await Promise.all(
    [
      import("@xrblocks/source/core/components/ScriptsManager.ts"),
      import("@xrblocks/source/interaction/Interaction.ts"),
      import("@xrblocks/source/ui/components/UIButton.ts"),
    ],
  );
  const clicked = vi.fn();
  const button = new UIButton({ label: "Keep ray behavior", onClick: clicked });
  const callbacks = new ScriptsManager(async () => {});
  const interaction: Interaction = new Interaction({
    callbacks,
  });
  const source = controller(0);
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
  interaction.registerHitSurface(surface, button);
  await callbacks.initScript(button);

  update(interaction, source, false, surface);
  update(interaction, source, true, surface);
  update(interaction, source, false, surface);

  expect(clicked).toHaveBeenCalledOnce();
});

it("keeps nested button selection inside an ordinary manipulable UI card", async () => {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [{ ScriptsManager }, { Interaction }, { UIButton }, { UICard }] =
    await Promise.all([
      import("@xrblocks/source/core/components/ScriptsManager.ts"),
      import("@xrblocks/source/interaction/Interaction.ts"),
      import("@xrblocks/source/ui/components/UIButton.ts"),
      import("@xrblocks/source/ui/components/UICard.ts"),
    ]);
  const clicked = vi.fn();
  const button = new UIButton({ label: "Nested", onClick: clicked });
  const card = new UICard({
    children: [button],
    manipulation: true,
    size: { height: 0.3, width: 0.5 },
  });
  const callbacks = new ScriptsManager(async () => {});
  const interaction: Interaction = new Interaction({ callbacks });
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.1));
  interaction.registerHitSurface(surface, button);
  await Promise.all([callbacks.initScript(card), callbacks.initScript(button)]);
  const source = controller(1);

  update(interaction, source, false, surface);
  update(interaction, source, true, surface);
  update(interaction, source, false, surface);

  expect(clicked).toHaveBeenCalledOnce();
  expect(card.children).toContain(button);
});

it("keeps UI card translation handles independent from model presentation", async () => {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [{ ScriptsManager }, { Interaction }, { UICard }] = await Promise.all([
    import("@xrblocks/source/core/components/ScriptsManager.ts"),
    import("@xrblocks/source/interaction/Interaction.ts"),
    import("@xrblocks/source/ui/components/UICard.ts"),
  ]);
  const callbacks = new ScriptsManager(async () => {});
  const interaction: Interaction = new Interaction({ callbacks });
  const card = new UICard({
    edge: true,
    manipulation: true,
    size: { height: 0.3, width: 0.5 },
  });
  const edge = new THREE.Object3D();
  edge.xb = { manipulationHandle: { action: "translate" } };
  interaction.registerHitSurface(edge, card);
  await callbacks.initScript(card);
  const source = controller(2);

  updateAt(interaction, source, true, edge, new THREE.Vector3(0, 0, 0));
  updateAt(interaction, source, true, edge, new THREE.Vector3(0.35, 0, 0));
  updateAt(interaction, source, false, edge, new THREE.Vector3(0.35, 0, 0));

  expect(card.position.x).toBeGreaterThan(0.3);
});

it("keeps ordinary UI primitives and custom object events available", async () => {
  const [{ UICard }, { UIImage }, { UIText }] = await Promise.all([
    import("@xrblocks/source/ui/components/UICard.ts"),
    import("@xrblocks/source/ui/components/UIImage.ts"),
    import("@xrblocks/source/ui/components/UIText.ts"),
  ]);
  interface CardEvents extends THREE.Object3DEventMap {
    cardResized: { height: number; width: number };
  }
  const text = new UIText({ text: "Details" });
  const image = new UIImage({ src: "model-thumbnail.png" });
  const card = new UICard<CardEvents>({
    children: [text, image],
    size: { height: 0.3, width: 0.5 },
  });
  const resized = vi.fn();
  card.addEventListener("cardResized", (event) =>
    resized(event.width, event.height),
  );

  card.dispatchEvent({ type: "cardResized", height: 3, width: 5 });

  expect(resized).toHaveBeenCalledExactlyOnceWith(5, 3);
  expect(text.text).toBe("Details");
  expect(image.src).toBe("model-thumbnail.png");
  expect(card.children).toEqual(expect.arrayContaining([text, image]));
});

it("keeps the standard glTF loader able to parse an ordinary scene", async () => {
  vi.stubGlobal(
    "ProgressEvent",
    class ProgressEvent {
      constructor(
        public type: string,
        init: Record<string, unknown> = {},
      ) {
        Object.assign(this, init);
      }
    },
  );
  const { ModelLoader } = await import("@xrblocks/source/utils/ModelLoader.ts");
  const document = JSON.stringify({
    asset: { version: "2.0" },
    nodes: [{ name: "Plain glTF node" }],
    scene: 0,
    scenes: [{ nodes: [0] }],
  });
  const result = await new ModelLoader().loadGLTF({
    url: `data:application/json,${encodeURIComponent(document)}`,
  });

  expect(result.scene).toBeInstanceOf(THREE.Group);
  expect(result.scene.children).toHaveLength(1);
  expect(result.scene.children[0].name).toBe("Plain_glTF_node");
  vi.unstubAllGlobals();
});

it_session(
  "keeps an unrelated generic ray target selectable beside model viewers",
  async (session, { primaryHand }) => {
    await session.stepFrame(2);
    expect(await rayTargetState(session)).toEqual({ starts: 0, ends: 0 });

    await session.gesture(primaryHand, "neutral");
    await session.pointTo(primaryHand, { tag: "ordinary-ray-target" });
    await session.click(primaryHand);
    await session.stepFrame(2);

    expect(await rayTargetState(session)).toEqual({ starts: 1, ends: 1 });
    expectNoSessionErrors(session.diagnostics);
  },
);

function controller(id: number): Controller {
  const controller = new THREE.Object3D() as Controller;
  controller.userData = { id, connected: true, selected: false };
  controller.inputSource = { handedness: "right" };
  return controller;
}

function update(
  interaction: Interaction,
  controller: Controller,
  selected: boolean,
  object: THREE.Object3D,
): void {
  controller.userData.selected = selected;
  const ray: RaySourceInput = {
    controller,
    sourceType: "controller-ray",
    selected,
    ray: new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1)),
    position: new THREE.Vector3(),
    orientation: new THREE.Quaternion(),
    intersections: [
      {
        distance: 1,
        object,
        point: new THREE.Vector3(0, 0, -1),
      },
    ],
  };
  interaction.update({ raySources: [ray], directTouches: [] });
}

function updateAt(
  interaction: Interaction,
  controller: Controller,
  selected: boolean,
  object: THREE.Object3D,
  position: THREE.Vector3,
): void {
  controller.userData.selected = selected;
  const ray: RaySourceInput = {
    controller,
    sourceType: "controller-ray",
    selected,
    ray: new THREE.Ray(position.clone(), new THREE.Vector3(0, 0, -1)),
    position: position.clone(),
    orientation: new THREE.Quaternion(),
    intersections: [
      {
        distance: 1,
        object,
        point: position.clone(),
      },
    ],
  };
  interaction.update({ raySources: [ray], directTouches: [] });
}

async function rayTargetState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{ starts: number; ends: number }> {
  const inspection = (await session.objects.inspect({
    tag: "ordinary-ray-target",
  })) as { state?: unknown };
  expect(inspection.state).toBeDefined();
  return inspection.state as { starts: number; ends: number };
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
