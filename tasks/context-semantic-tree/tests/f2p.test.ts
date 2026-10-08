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
const { UIButton } = await import("@xrblocks/source/ui/components/UIButton.ts");
const { UICard } = await import("@xrblocks/source/ui/components/UICard.ts");
const { UIImage } = await import("@xrblocks/source/ui/components/UIImage.ts");
const { UIPanel } = await import("@xrblocks/source/ui/components/UIPanel.ts");
const { UISlider } = await import("@xrblocks/source/ui/components/UISlider.ts");
const { UIText } = await import("@xrblocks/source/ui/components/UIText.ts");

function nodeByName(
  tree: { nodes: Record<string, { name: string }> },
  name: string,
) {
  return Object.values(tree.nodes).find((node) => node.name === name)!;
}

function semanticDetector(scene: THREE.Scene, capturedAt: number) {
  const detector = new SceneDetector();
  detector.init({
    options: new ContextOptions().enableScene(),
    scene,
    camera: new THREE.PerspectiveCamera(),
    screenshotSynthesizer: {
      getScreenshot: vi.fn(async () => "data:image/png;base64,unused"),
    } as never,
    simulationTimer: { getElapsedMs: () => capturedAt } as never,
  });
  return detector;
}

it("builds a rounded nested tree for transformed torus, sphere, and cylinder geometry", async () => {
  const scene = new THREE.Scene();
  const gallery = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 16));
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8));
  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.2, 0.5, 12),
  );
  gallery.userData.semantic = { role: "group", name: "Gallery" };
  gallery.position.set(1.11116, -0.22224, -3.33336);
  gallery.scale.set(2, 0.5, 1);
  torus.userData.semantic = { role: "object", name: "Donut" };
  torus.position.set(0.12345, 0.4, -0.7);
  sphere.userData.semantic = { role: "object", name: "Sphere" };
  sphere.position.set(-0.25, -0.5, 0.3);
  cylinder.userData.semantic = { role: "object", name: "Cylinder" };
  cylinder.position.set(0.5, 0.6, 0.2);
  cylinder.rotation.z = Math.PI / 2;
  gallery.add(torus, sphere, cylinder);
  scene.add(gallery);
  const detector = semanticDetector(scene, 12.34567);

  try {
    const semantic = await detector.runDetection();
    const galleryNode = nodeByName(semantic, "Gallery");
    const torusNode = nodeByName(semantic, "Donut");
    const sphereNode = nodeByName(semantic, "Sphere");
    const cylinderNode = nodeByName(semantic, "Cylinder");

    expect(semantic.capturedAt).toBe(12.3457);
    expect(galleryNode).toMatchObject({
      role: "group",
      source: "three",
      position: [1.1112, -0.2222, -3.3334],
      children: [torusNode.id, sphereNode.id, cylinderNode.id],
    });
    expect(torusNode).toMatchObject({
      role: "object",
      parentId: galleryNode.id,
      source: "three",
      type: "Mesh",
      position: [1.3581, -0.0222, -4.0334],
      bounds: {
        center: [1.3581, -0.0222, -4.0334],
        size: [1, 0.25, 0.1],
      },
    });
    expect(sphereNode).toMatchObject({
      role: "object",
      parentId: galleryNode.id,
      position: [0.6112, -0.4722, -3.0334],
    });
    expect(cylinderNode).toMatchObject({
      role: "object",
      parentId: galleryNode.id,
      position: [2.1112, 0.0778, -3.1334],
    });
    expect(detector.resolveNodeObject(torusNode.id)).toBe(torus);
  } finally {
    detector.dispose();
  }
});

it("keeps live semantic IDs through movement and reparenting, then removes detached objects", async () => {
  const scene = new THREE.Scene();
  const left = new THREE.Group();
  const right = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 16));
  left.userData.semantic = { role: "group", name: "Left zone" };
  right.userData.semantic = { role: "group", name: "Right zone" };
  torus.userData.semantic = { role: "object", name: "Movable donut" };
  left.position.set(-1, 0, -2);
  right.position.set(2, 1, -4);
  torus.position.set(0.25, 0.5, -0.75);
  left.add(torus);
  scene.add(left, right);
  const detector = semanticDetector(scene, 1);

  try {
    const first = await detector.runDetection();
    const firstTorus = nodeByName(first, "Movable donut");

    right.add(torus);
    torus.position.set(-0.125, 0.25, 0.5);
    const second = await detector.runDetection();
    const secondTorus = nodeByName(second, "Movable donut");
    const secondLeft = nodeByName(second, "Left zone");
    const secondRight = nodeByName(second, "Right zone");

    expect(second.snapshotId).not.toBe(first.snapshotId);
    expect(secondTorus).toMatchObject({
      id: firstTorus.id,
      parentId: secondRight.id,
      position: [1.875, 1.25, -3.5],
    });
    expect(secondLeft.children).toEqual([]);
    expect(secondRight.children).toEqual([secondTorus.id]);

    right.remove(torus);
    const third = await detector.runDetection();

    expect(third.nodes[firstTorus.id]).toBeUndefined();
    expect(detector.resolveNodeObject(firstTorus.id)).toBeUndefined();
  } finally {
    detector.dispose();
  }
});

it("describes semantic UI state and filters private and semantic-hidden scene content", async () => {
  const scene = new THREE.Scene();
  const texture = new THREE.DataTexture(
    new Uint8Array([34, 197, 94, 255]),
    1,
    1,
  );
  const text = new UIText({ text: "Save changes" });
  const slider = new UISlider({
    ariaLabel: "Volume",
    min: -1,
    max: 1,
    step: 0.25,
    value: 0.62,
  });
  const panel = new UIPanel({ children: [text, slider] });
  const button = new UIButton({ label: "Save", disabled: true });
  const image = new UIImage({ src: texture, ariaLabel: "Status image" });
  const card = new UICard({
    size: { width: 1.2, height: 0.6 },
    manipulation: true,
    children: [button, image, panel],
  });
  const hiddenParent = new THREE.Group();
  const hiddenSphere = new THREE.Mesh(new THREE.SphereGeometry(0.15));
  const semanticHidden = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1));
  const privateRoot = new THREE.Group();
  const privateCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.3),
  );
  card.name = "Settings card";
  card.position.set(0.33335, -0.25, -2);
  button.position.x = -0.3;
  image.position.x = 0.3;
  hiddenParent.userData.semantic = { role: "group", name: "Hidden shelf" };
  hiddenParent.visible = false;
  hiddenSphere.userData.semantic = {
    role: "object",
    name: "Hidden sphere",
  };
  hiddenParent.add(hiddenSphere);
  semanticHidden.userData.semantic = {
    role: "object",
    name: "Excluded semantic object",
    hidden: true,
  };
  privateRoot.userData.xrblocksPrivate = true;
  privateCylinder.userData.semantic = {
    role: "object",
    name: "Private cylinder",
  };
  privateRoot.add(privateCylinder);
  card.xb = {
    ...card.xb,
    pointerEvents: "none",
    interactionEnabled: false,
  };
  scene.add(card, hiddenParent, semanticHidden, privateRoot);
  const detector = semanticDetector(scene, 9);

  try {
    const semantic = await detector.runDetection();
    const cardNode = nodeByName(semantic, "Settings card");
    const buttonNode = nodeByName(semantic, "Save");
    const imageNode = nodeByName(semantic, "Status image");
    const panelNode = nodeByName(semantic, "UIPanel");
    const textNode = nodeByName(semantic, "Save changes");
    const sliderNode = nodeByName(semantic, "Volume");
    const hiddenParentNode = nodeByName(semantic, "Hidden shelf");
    const hiddenSphereNode = nodeByName(semantic, "Hidden sphere");

    expect(cardNode).toMatchObject({
      objectId: card.id,
      pointerEvents: "none",
      interactionEnabled: false,
      role: "group",
      source: "xrblocks",
      traits: ["manipulable"],
    });
    expect(cardNode.bounds).toBeDefined();
    expect(buttonNode).toMatchObject({
      objectId: button.id,
      pointerEvents: "auto",
      role: "button",
      source: "xrblocks",
      disabled: true,
      interactionEnabled: true,
    });
    expect(buttonNode.traits).toBeUndefined();
    expect(imageNode).toMatchObject({ role: "image", source: "xrblocks" });
    expect(panelNode).toMatchObject({
      role: "group",
      parentId: cardNode.id,
    });
    expect(textNode).toMatchObject({
      role: "text",
      text: "Save changes",
      parentId: panelNode.id,
    });
    expect(sliderNode).toMatchObject({
      role: "slider",
      value: 0.5,
      min: -1,
      max: 1,
      traits: ["selectable"],
      parentId: panelNode.id,
    });
    expect(hiddenParentNode.visible).toBe(false);
    expect(hiddenSphereNode).toMatchObject({
      visible: false,
      parentId: hiddenParentNode.id,
    });
    expect(Object.values(semantic.nodes).map((node) => node.name)).not.toEqual(
      expect.arrayContaining(["Excluded semantic object", "Private cylinder"]),
    );
  } finally {
    detector.dispose();
  }
});

it("omits scene helpers, layout wrappers, and implementation meshes from the public tree", async () => {
  const scene = new THREE.Scene();
  const semanticRoot = new THREE.Group();
  const layoutWrapper = new THREE.Group();
  const product = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1));
  const implementationMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3));
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12));
  const camera = new THREE.PerspectiveCamera();
  const light = new THREE.DirectionalLight();
  const axes = new THREE.AxesHelper();
  const grid = new THREE.GridHelper();

  semanticRoot.userData.semantic = { role: "group", name: "Product card" };
  product.userData.semantic = { role: "object", name: "Product image" };
  implementationMesh.name = "Card backing mesh";
  badge.userData.semantic = { role: "object", name: "Status badge" };
  camera.name = "Internal render camera";
  light.name = "Internal key light";
  axes.name = "Internal axes helper";
  grid.name = "Internal grid helper";

  layoutWrapper.add(product);
  implementationMesh.add(badge);
  semanticRoot.add(layoutWrapper, implementationMesh);
  scene.add(semanticRoot, camera, light, axes, grid);
  const detector = semanticDetector(scene, 15);

  try {
    const semantic = await detector.runDetection();
    const rootNode = nodeByName(semantic, "Product card");
    const productNode = nodeByName(semantic, "Product image");
    const badgeNode = nodeByName(semantic, "Status badge");

    expect(Object.keys(semantic.nodes)).toHaveLength(3);
    expect(semantic.rootIds).toEqual([rootNode.id]);
    expect(rootNode.children).toEqual([productNode.id, badgeNode.id]);
    expect(productNode.parentId).toBe(rootNode.id);
    expect(badgeNode.parentId).toBe(rootNode.id);
    expect(
      Object.values(semantic.nodes).map((node) => node.objectId),
    ).not.toEqual(
      expect.arrayContaining([
        layoutWrapper.id,
        implementationMesh.id,
        camera.id,
        light.id,
        axes.id,
        grid.id,
      ]),
    );
  } finally {
    detector.dispose();
  }
});

it("prunes private and semantic-hidden subtrees while promoting children of self-private wrappers", async () => {
  const scene = new THREE.Scene();
  const semanticRoot = new THREE.Group();
  semanticRoot.userData.semantic = { role: "group", name: "Public scene" };

  const privateRoot = new THREE.Group();
  const privateChild = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1));
  privateRoot.userData.xrblocksPrivate = true;
  privateRoot.userData.semantic = {
    role: "group",
    name: "Private engine root",
  };
  privateChild.userData.semantic = { role: "object", name: "Private child" };
  privateRoot.add(privateChild);

  const selfPrivateWrapper = new THREE.Group();
  const publicChild = new THREE.Mesh(new THREE.SphereGeometry(0.1));
  selfPrivateWrapper.userData.xrblocksPrivateSelf = true;
  selfPrivateWrapper.userData.semantic = {
    role: "group",
    name: "Rendering wrapper",
  };
  publicChild.userData.semantic = { role: "object", name: "Public control" };
  selfPrivateWrapper.add(publicChild);

  const hiddenRoot = new THREE.Group();
  const hiddenChild = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1));
  hiddenRoot.userData.semantic = {
    role: "group",
    name: "Semantic hidden root",
    hidden: true,
  };
  hiddenChild.userData.semantic = { role: "object", name: "Hidden child" };
  hiddenRoot.add(hiddenChild);

  semanticRoot.add(privateRoot, selfPrivateWrapper, hiddenRoot);
  scene.add(semanticRoot);
  const detector = semanticDetector(scene, 16);

  try {
    const semantic = await detector.runDetection();
    const rootNode = nodeByName(semantic, "Public scene");
    const childNode = nodeByName(semantic, "Public control");

    expect(Object.keys(semantic.nodes)).toHaveLength(2);
    expect(rootNode.children).toEqual([childNode.id]);
    expect(childNode.parentId).toBe(rootNode.id);
    expect(Object.values(semantic.nodes).map((node) => node.name)).toEqual([
      "Public scene",
      "Public control",
    ]);
  } finally {
    detector.dispose();
  }
});

it("publishes semantic snapshots through SceneDetector with stable lookup and capture time", async () => {
  const scene = new THREE.Scene();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 16));
  torus.name = "Detected donut";
  torus.position.set(0.125, 0, -2);
  scene.add(torus);
  const screenshotSynthesizer = {
    getScreenshot: vi.fn(async () => "data:image/png;base64,unused"),
  };
  const detector = new SceneDetector();
  detector.init({
    options: new ContextOptions().enableScene(),
    scene,
    camera: new THREE.PerspectiveCamera(),
    screenshotSynthesizer: screenshotSynthesizer as never,
    simulationTimer: { getElapsedMs: () => 42.12567 } as never,
  });

  try {
    const first = await detector.runDetection();
    const firstNode = nodeByName(first, "Detected donut");
    torus.position.x = 0.875;
    const second = await detector.runDetection();
    const secondNode = nodeByName(second, "Detected donut");

    expect(first.capturedAt).toBe(42.1257);
    expect(detector.tree).toBe(second);
    expect(secondNode).toMatchObject({
      id: firstNode.id,
      position: [0.875, 0, -2],
    });
    expect(detector.resolveNodeObject(secondNode.id)).toBe(torus);
    expect(screenshotSynthesizer.getScreenshot).not.toHaveBeenCalled();
  } finally {
    detector.dispose();
  }
});

it_session(
  "captures live mesh and spatial UI semantics through the public Context facade",
  async (session) => {
    await session.stepFrame(2);
    const result = await session.getSceneContext({ semanticTree: true });
    const tree = result.semanticTree as {
      nodes: Record<
        string,
        {
          id: string;
          name: string;
          role: string;
          visible: boolean;
          position: [number, number, number];
          parentId?: string;
          children: string[];
          value?: number;
          min?: number;
          max?: number;
          traits?: string[];
        }
      >;
    };
    const node = (name: string) => nodeByName(tree, name);
    const exhibit = node("Session exhibit");
    const torus = node("Session torus");
    const button = node("Session button");
    const image = node("Session image");
    const panel = node("UIPanel");
    const text = node("Session status");
    const slider = node("Session volume");
    const hidden = node("Session hidden cylinder");

    expect(exhibit).toMatchObject({
      role: "group",
      children: [torus.id],
    });
    expect(torus).toMatchObject({
      role: "object",
      parentId: exhibit.id,
    });
    expect(button).toMatchObject({ role: "button", traits: ["selectable"] });
    expect(image).toMatchObject({ role: "image" });
    expect(panel).toMatchObject({ role: "group" });
    expect(text).toMatchObject({ role: "text" });
    expect(slider).toMatchObject({
      role: "slider",
      value: 0.75,
      min: 0,
      max: 1,
      traits: ["selectable"],
    });
    expect(hidden.visible).toBe(false);
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
