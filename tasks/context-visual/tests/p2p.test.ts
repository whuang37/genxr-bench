import * as THREE from "three";

import { expect, it, it_session, vi } from "@xrblocks/devtools/test";

Object.defineProperty(globalThis, "window", {
  value: { location: { search: "" } },
  configurable: true,
});

const { ContextOptions } = await import(
  "@xrblocks/source/context/ContextOptions.ts"
);
const { SceneDetector } = await import(
  "@xrblocks/source/context/scene/SceneDetector.ts"
);

function semanticDetector(scene: THREE.Scene, capturedAt: number) {
  const screenshotSynthesizer = {
    getScreenshot: vi.fn(async () => "data:image/png;base64,unused"),
  };
  const detector = new SceneDetector();
  detector.init({
    options: new ContextOptions().enableScene(),
    scene,
    camera: new THREE.PerspectiveCamera(90, 1, 0.1, 10),
    screenshotSynthesizer: screenshotSynthesizer as never,
    simulationTimer: { getElapsedMs: () => capturedAt } as never,
  });
  return { detector, screenshotSynthesizer };
}

it("keeps visual-product options explicit without enabling unrelated context products", () => {
  const visible = new ContextOptions().enableVisibleObjects();
  const marks = new ContextOptions().enableSetOfMark();

  expect(visible).toMatchObject({
    enabled: true,
    scene: {
      enabled: true,
      visibleObjects: { enabled: true },
      som: { enabled: false },
    },
  });
  expect(marks).toMatchObject({
    enabled: true,
    scene: {
      enabled: true,
      visibleObjects: { enabled: false },
      som: { enabled: true },
    },
  });
});

it("keeps semantic identity stable across movement and reparenting", async () => {
  const scene = new THREE.Scene();
  const firstParent = new THREE.Group();
  const secondParent = new THREE.Group();
  firstParent.name = "First parent";
  secondParent.name = "Second parent";
  firstParent.userData.semantic = { role: "group", name: "First parent" };
  secondParent.userData.semantic = { role: "group", name: "Second parent" };
  secondParent.position.x = 2;
  const object = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 16));
  object.name = "Movable torus";
  object.userData.semantic = { role: "object", name: "Movable torus" };
  firstParent.add(object);
  scene.add(firstParent, secondParent);
  const { detector } = semanticDetector(scene, 1);
  const first = await detector.runDetection();
  const firstObject = Object.values(first.nodes).find(
    (node) => node.name === "Movable torus",
  )!;
  secondParent.add(object);
  object.position.x = 0.5;
  const second = await detector.runDetection();
  const secondObject = second.nodes[firstObject.id];
  const secondParentNode = Object.values(second.nodes).find(
    (node) => node.name === "Second parent",
  )!;

  expect(secondObject.id).toBe(firstObject.id);
  expect(secondObject.parentId).toBe(secondParentNode.id);
  expect(secondObject.position).toEqual([2.5, 0, 0]);

  secondParent.remove(object);
  const third = await detector.runDetection();
  expect(third.nodes[firstObject.id]).toBeUndefined();
  detector.dispose();
});

it("keeps semantic UI roles and public state available before visual annotation", async () => {
  const [{ UICard }, { UIButton }, { UIImage }, { UIText }, { UISlider }] =
    await Promise.all([
      import("@xrblocks/source/ui/components/UICard.ts"),
      import("@xrblocks/source/ui/components/UIButton.ts"),
      import("@xrblocks/source/ui/components/UIImage.ts"),
      import("@xrblocks/source/ui/components/UIText.ts"),
      import("@xrblocks/source/ui/components/UISlider.ts"),
    ]);
  const scene = new THREE.Scene();
  const card = new UICard({ size: { width: 1, height: 0.5 } });
  const button = new UIButton({ label: "Apply", disabled: true });
  const image = new UIImage({ src: "preview.png" });
  const text = new UIText({ text: "Ready" });
  const slider = new UISlider({
    ariaLabel: "Opacity",
    min: 0,
    max: 10,
    step: 2,
    value: 4,
  });
  card.add(button, image, text, slider);
  scene.add(card);

  const { detector } = semanticDetector(scene, 4);
  const output = await detector.runDetection();
  const nodes = Object.values(output.nodes);

  expect(nodes.find((node) => node.role === "button")).toMatchObject({
    name: "Apply",
    disabled: true,
  });
  expect(nodes.find((node) => node.role === "image")).toMatchObject({
    role: "image",
    source: "xrblocks",
  });
  expect(nodes.find((node) => node.role === "text")).toMatchObject({
    text: "Ready",
  });
  expect(nodes.find((node) => node.role === "slider")).toMatchObject({
    name: "Opacity",
    value: 4,
    min: 0,
    max: 10,
  });
  detector.dispose();
});

it("keeps semantic-only detection independent from image capture", async () => {
  const scene = new THREE.Scene();
  const activeCamera = new THREE.PerspectiveCamera(90, 1, 0.1, 10);
  const object = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2));
  object.name = "Semantic-only object";
  object.position.z = -2;
  scene.add(object);
  const screenshotSynthesizer = {
    getScreenshot: vi.fn(async () => "data:image/png;base64,unused"),
  };
  const detector = new SceneDetector();
  detector.init({
    options: new ContextOptions().enableScene(),
    scene,
    camera: activeCamera,
    screenshotSynthesizer: screenshotSynthesizer as never,
    simulationTimer: { getElapsedMs: () => 11 } as never,
  });

  try {
    const tree = await detector.runDetection();
    const node = tree.nodes[tree.rootIds[0]];

    expect(node).toMatchObject({
      role: "object",
      name: "Semantic-only object",
      position: [0, 0, -2],
    });
    expect(node.view).toBeUndefined();
    expect(tree.capturedAt).toBe(11);
    expect(detector.tree).toBe(tree);
    expect(screenshotSynthesizer.getScreenshot).not.toHaveBeenCalled();
  } finally {
    detector.dispose();
  }
});

it("keeps semantic hierarchy, effective visibility, and node IDs stable", async () => {
  const scene = new THREE.Scene();
  const hiddenShelf = new THREE.Group();
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2));
  hiddenShelf.name = "Hidden shelf";
  hiddenShelf.visible = false;
  hiddenShelf.position.set(2, 1, -3);
  hiddenShelf.userData.semantic = { role: "group", name: "Hidden shelf" };
  book.name = "Book";
  book.position.x = 0.5;
  book.userData.semantic = { role: "object", name: "Book" };
  hiddenShelf.add(book);
  scene.add(hiddenShelf);
  const { detector } = semanticDetector(scene, 1);
  const first = await detector.runDetection();
  const second = await detector.runDetection();
  const shelfId = first.rootIds[0];
  const bookId = first.nodes[shelfId].children[0];

  expect(first.nodes[shelfId]).toMatchObject({
    id: shelfId,
    role: "group",
    name: "Hidden shelf",
    visible: false,
    position: [2, 1, -3],
    children: [bookId],
  });
  expect(first.nodes[bookId]).toMatchObject({
    id: bookId,
    role: "object",
    name: "Book",
    visible: false,
    parentId: shelfId,
    position: [2.5, 1, -3],
  });
  expect(second.rootIds[0]).toBe(shelfId);
  expect(second.nodes[shelfId].children[0]).toBe(bookId);
  detector.dispose();
});

it("keeps public context-node lookup available to semantic consumers", async () => {
  const scene = new THREE.Scene();
  const activeCamera = new THREE.PerspectiveCamera(90, 1, 0.1, 10);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 16));
  torus.name = "Resolvable torus";
  torus.position.z = -2;
  scene.add(torus);
  const screenshotSynthesizer = {
    getScreenshot: vi.fn(async () => "data:image/png;base64,unused"),
  };
  const detector = new SceneDetector();
  detector.init({
    options: new ContextOptions().enableScene(),
    scene,
    camera: activeCamera,
    screenshotSynthesizer: screenshotSynthesizer as never,
    simulationTimer: { getElapsedMs: () => 19 } as never,
  });

  try {
    const tree = await detector.runDetection();
    const nodeId = tree.rootIds[0];

    expect(detector.resolveNodeObject(nodeId)).toBe(torus);
    expect(detector.resolveNodeObject("ctx_missing")).toBeUndefined();
    expect(screenshotSynthesizer.getScreenshot).not.toHaveBeenCalled();
  } finally {
    detector.dispose();
  }
});

it_session(
  "keeps semantic-only runtime context independent from visual products",
  async (session) => {
    await session.stepFrame(2);
    const result = await session.getSceneContext({ semanticTree: true });
    const semantic = result.semanticTree as {
      nodes: Record<
        string,
        { name: string; role: string; view?: unknown; children: string[] }
      >;
    };
    const nodeByName = (name: string) =>
      Object.values(semantic.nodes).find((node) => node.name === name)!;

    expect(result.visibleObjects).toBeUndefined();
    expect(result.setOfMark).toBeUndefined();
    expect(nodeByName("Session torus")).toMatchObject({ role: "object" });
    expect(nodeByName("Session button")).toMatchObject({ role: "button" });
    expect(nodeByName("Session image")).toMatchObject({ role: "image" });
    expect(nodeByName("Session status")).toMatchObject({ role: "text" });
    expect(nodeByName("Session torus").view).toBeUndefined();
    expectNoSessionErrors(session.diagnostics);
  },
);

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
