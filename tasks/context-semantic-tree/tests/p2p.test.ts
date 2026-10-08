import * as THREE from "three";

import { expect, it, vi } from "@xrblocks/devtools/test";

Object.defineProperty(globalThis, "window", {
  value: { location: { search: "" } },
  configurable: true,
});

const { Context } = await import("@xrblocks/source/context/Context.ts");
const { ContextOptions } = await import(
  "@xrblocks/source/context/ContextOptions.ts"
);
const { SceneDetector } = await import(
  "@xrblocks/source/context/scene/SceneDetector.ts"
);

it("keeps each public context enablement method scoped to its requested products", () => {
  const sceneOnly = new ContextOptions().enableScene();
  const visibleOnly = new ContextOptions().enableVisibleObjects();
  const marksOnly = new ContextOptions().enableSetOfMark();
  const all = new ContextOptions().enable();

  expect(sceneOnly.scene).toMatchObject({
    enabled: true,
    visibleObjects: { enabled: false },
    som: { enabled: false },
  });
  expect(visibleOnly.scene).toMatchObject({
    enabled: true,
    visibleObjects: { enabled: true },
    som: { enabled: false },
  });
  expect(marksOnly.scene).toMatchObject({
    enabled: true,
    visibleObjects: { enabled: false },
    som: { enabled: true },
  });
  expect(all.scene).toMatchObject({
    enabled: true,
    visibleObjects: { enabled: true },
    som: { enabled: true },
  });
});

it("keeps Core Options scene-context enablement independent from unrelated features", async () => {
  const { Options } = await import("@xrblocks/source/core/Options.ts");
  const options = new Options();
  options.world.enabled = false;
  options.depth.enabled = false;

  expect(options.enableSceneContext()).toBe(options);
  expect(options.context.enabled).toBe(true);
  expect(options.context.scene.enabled).toBe(true);
  expect(options.context.scene.visibleObjects.enabled).toBe(false);
  expect(options.context.scene.som.enabled).toBe(false);
  expect(options.world.enabled).toBe(false);
  expect(options.depth.enabled).toBe(false);
});

it("keeps disabled scene clients inert without requesting capture", () => {
  const detector = new SceneDetector();
  const screenshotSynthesizer = {
    getScreenshot: vi.fn(async () => "data:image/png;base64,unused"),
  };
  detector.init({
    options: new ContextOptions(),
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    screenshotSynthesizer: screenshotSynthesizer as never,
  });
  const client = {};

  detector.start(client);
  detector.update();
  detector.stop(client);

  expect(screenshotSynthesizer.getScreenshot).not.toHaveBeenCalled();
  expect(detector.tree).toBeNull();
  detector.dispose();
});

it("keeps ordinary spatial UI composition and custom events usable beside context", async () => {
  const [{ UICard }, { UIButton }, { UIPanel }, { UIImage }, { UIText }] =
    await Promise.all([
      import("@xrblocks/source/ui/components/UICard.ts"),
      import("@xrblocks/source/ui/components/UIButton.ts"),
      import("@xrblocks/source/ui/components/UIPanel.ts"),
      import("@xrblocks/source/ui/components/UIImage.ts"),
      import("@xrblocks/source/ui/components/UIText.ts"),
    ]);
  interface CardEvents extends THREE.Object3DEventMap {
    opened: { source: string };
  }
  const card = new UICard<CardEvents>({ size: { width: 1, height: 0.5 } });
  const panel = new UIPanel();
  const button = new UIButton({ label: "Open" });
  const image = new UIImage({ src: "preview.png" });
  const text = new UIText({ text: "Ready" });
  const opened = vi.fn();
  card.addEventListener("opened", (event) => opened(event.source));
  card.dispatchEvent({ type: "opened", source: "user" });
  panel.add(button, image, text);
  card.add(panel);

  expect(opened).toHaveBeenCalledExactlyOnceWith("user");
  expect(button.label).toBe("Open");
  expect(image.src).toBe("preview.png");
  expect(text.text).toBe("Ready");
  expect(card.children).toContain(panel);
});

it("keeps semantic-only context enablement separate from visual stream options", () => {
  const options = new ContextOptions().enableScene();

  expect(options).toMatchObject({
    enabled: true,
    scene: {
      enabled: true,
      visibleObjects: { enabled: false },
      som: { enabled: false },
    },
  });
});

it("creates, replaces, and disposes the SceneDetector through the public Context lifecycle", () => {
  const context = new Context();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const screenshotSynthesizer = {
    getScreenshot: vi.fn(async () => "data:image/png;base64,unused"),
  };

  context.init({
    options: new ContextOptions(),
    scene,
    camera,
    screenshotSynthesizer: screenshotSynthesizer as never,
  });
  expect(context.scene).toBeUndefined();

  context.init({
    options: new ContextOptions().enableScene(),
    scene,
    camera,
    screenshotSynthesizer: screenshotSynthesizer as never,
  });
  const detector = context.scene;
  expect(detector).toBeInstanceOf(SceneDetector);
  expect(context.children).toContain(detector!);

  context.init({
    options: new ContextOptions(),
    scene,
    camera,
    screenshotSynthesizer: screenshotSynthesizer as never,
  });
  expect(context.scene).toBeUndefined();
  expect(context.children).not.toContain(detector!);

  context.dispose();
  expect(context.scene).toBeUndefined();
});

it("keeps disposed detectors inert and clears their public latest-result state", async () => {
  const detector = new SceneDetector();
  detector.init({
    options: new ContextOptions().enableScene(),
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    screenshotSynthesizer: {
      getScreenshot: vi.fn(async () => "data:image/png;base64,unused"),
    } as never,
  });
  detector.dispose();

  await expect(
    detector.runContextDetection({ semanticTree: true }),
  ).resolves.toEqual({});
  expect(detector.tree).toBeNull();
  expect(detector.visibleObjects).toBeNull();
  expect(detector.setOfMark).toBeNull();
  expect(detector.resolveNodeObject("ctx_1")).toBeUndefined();
});
