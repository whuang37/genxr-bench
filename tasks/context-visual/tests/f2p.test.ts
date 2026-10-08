import * as THREE from "three";

import { expect, it, it_session, judge, vi } from "@xrblocks/devtools/test";

Object.defineProperty(globalThis, "window", {
  value: { location: { search: "" } },
  configurable: true,
});

const { ContextOptions } =
  await import("@xrblocks/source/context/ContextOptions.ts");
const { SceneDetector } =
  await import("@xrblocks/source/context/scene/SceneDetector.ts");
const { UIButton } = await import("@xrblocks/source/ui/components/UIButton.ts");
const { UICard } = await import("@xrblocks/source/ui/components/UICard.ts");
const { UIImage } = await import("@xrblocks/source/ui/components/UIImage.ts");
const { UIPanel } = await import("@xrblocks/source/ui/components/UIPanel.ts");
const { UIText } = await import("@xrblocks/source/ui/components/UIText.ts");

type VisualNode = {
  id: string;
  name: string;
  role: string;
  view?: {
    rendered: boolean;
    inFrame: boolean;
    inLineOfSight: boolean;
    x?: number;
    y?: number;
  };
};

function camera(): THREE.PerspectiveCamera {
  const result = new THREE.PerspectiveCamera(90, 1, 0.1, 10);
  result.updateProjectionMatrix();
  result.updateMatrixWorld(true);
  return result;
}

function contextOptions(opacityThreshold = 0): ContextOptions {
  const options = new ContextOptions().enable();
  options.scene.visibleObjects.occlusionOpacityThreshold = opacityThreshold;
  return options;
}

function createDetector({
  scene,
  activeCamera = camera(),
  opacityThreshold = 0,
  image = "",
  capturedAt = 12.5,
  deviceCamera,
}: {
  scene: THREE.Scene;
  activeCamera?: THREE.Camera;
  opacityThreshold?: number;
  image?: string;
  capturedAt?: number;
  deviceCamera?: { loaded: boolean };
}) {
  const screenshotSynthesizer = {
    getScreenshot: vi.fn(async () => image),
  };
  const detector = new SceneDetector();
  detector.init({
    options: contextOptions(opacityThreshold),
    scene,
    camera: activeCamera,
    screenshotSynthesizer: screenshotSynthesizer as never,
    simulationTimer: { getElapsedMs: () => capturedAt } as never,
    deviceCamera: deviceCamera as never,
  });
  return { detector, screenshotSynthesizer };
}

function nodeByName(
  tree: { nodes: Record<string, VisualNode> },
  name: string,
): VisualNode {
  const node = Object.values(tree.nodes).find(
    (candidate) => candidate.name === name,
  );
  expect(node, `missing semantic node: ${name}`).toBeDefined();
  return node!;
}

function expectCoordinate(actual: number | undefined, expected: number): void {
  expect(actual).toBeTypeOf("number");
  expect(actual!).toBeCloseTo(expected, 3);
}

it("annotates semantic nodes with effective visibility and active-camera projection", async () => {
  const scene = new THREE.Scene();
  const centered = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 8, 16));
  const offscreenParent = new THREE.Group();
  const offscreen = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.6));
  const hiddenParent = new THREE.Group();
  const ancestorHidden = new THREE.Mesh(new THREE.SphereGeometry(0.2));
  const nodeHidden = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.4));
  centered.name = "Centered donut";
  offscreen.name = "Offscreen box";
  ancestorHidden.name = "Ancestor-hidden sphere";
  nodeHidden.name = "Hidden cylinder";
  centered.position.z = -2;
  offscreenParent.position.x = 3;
  offscreen.geometry.translate(0.5, 0, 0);
  offscreen.rotation.y = Math.PI / 5;
  offscreen.scale.set(1.5, 0.75, 1);
  offscreen.position.z = -2;
  hiddenParent.visible = false;
  ancestorHidden.position.z = -2;
  nodeHidden.visible = false;
  nodeHidden.position.set(-3, 0, -2);
  offscreenParent.add(offscreen);
  hiddenParent.add(ancestorHidden);
  scene.add(centered, offscreenParent, hiddenParent, nodeHidden);
  const { detector } = createDetector({ scene });

  try {
    const result = await detector.runVisibleObjectsDetection();
    const centeredNode = nodeByName(result, "Centered donut");
    const offscreenNode = nodeByName(result, "Offscreen box");
    const ancestorHiddenNode = nodeByName(result, "Ancestor-hidden sphere");
    const nodeHiddenNode = nodeByName(result, "Hidden cylinder");

    expect(centeredNode.view).toMatchObject({
      rendered: true,
      inFrame: true,
      inLineOfSight: true,
    });
    expectCoordinate(centeredNode.view?.x, 0.5);
    expectCoordinate(centeredNode.view?.y, 0.5);
    expect(offscreenNode.view).toMatchObject({
      rendered: true,
      inFrame: false,
      inLineOfSight: false,
    });
    expectCoordinate(offscreenNode.view?.x, 1.2388);
    expectCoordinate(offscreenNode.view?.y, 0.5);
    expect(ancestorHiddenNode.view).toEqual({
      rendered: false,
      inFrame: false,
      inLineOfSight: false,
    });
    expect(nodeHiddenNode.view).toEqual({
      rendered: false,
      inFrame: false,
      inLineOfSight: false,
    });
  } finally {
    detector.dispose();
  }
});

it("keeps noninteractive geometry as occlusion and honors opacity thresholds", async () => {
  const scene = new THREE.Scene();
  const target = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2));
  const occluderRoot = new THREE.Group();
  const occluder = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.25 }),
  );
  target.name = "Occluded target";
  target.position.z = -2;
  occluder.position.z = -1;
  occluderRoot.xb = { pointerEvents: "none" };
  occluderRoot.add(occluder);
  scene.add(target, occluderRoot);

  const defaultDetector = createDetector({ scene }).detector;
  const matchingDetector = createDetector({
    scene,
    opacityThreshold: 0.25,
  }).detector;
  const lowerDetector = createDetector({
    scene,
    opacityThreshold: 0.24,
  }).detector;
  try {
    const [defaultResult, matchingResult, lowerResult] = await Promise.all([
      defaultDetector.runVisibleObjectsDetection(),
      matchingDetector.runVisibleObjectsDetection(),
      lowerDetector.runVisibleObjectsDetection(),
    ]);
    expect(
      nodeByName(defaultResult, "Occluded target").view?.inLineOfSight,
    ).toBe(false);
    expect(
      nodeByName(matchingResult, "Occluded target").view?.inLineOfSight,
    ).toBe(true);
    expect(nodeByName(lowerResult, "Occluded target").view?.inLineOfSight).toBe(
      false,
    );
  } finally {
    defaultDetector.dispose();
    matchingDetector.dispose();
    lowerDetector.dispose();
  }

  occluderRoot.remove(occluder);
  const ownedHelper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial(),
  );
  ownedHelper.position.z = 1;
  target.add(ownedHelper);
  const privateHelper = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.5),
    new THREE.MeshBasicMaterial(),
  );
  privateHelper.position.z = -1;
  privateHelper.userData.xrblocksPrivate = true;
  scene.add(privateHelper);
  const helperDetector = createDetector({ scene }).detector;
  try {
    const result = await helperDetector.runVisibleObjectsDetection();
    expect(nodeByName(result, "Occluded target").view?.inLineOfSight).toBe(
      true,
    );
  } finally {
    helperDetector.dispose();
  }
});

it("creates stable projected marks only for in-line-of-sight semantic nodes", async () => {
  const scene = new THREE.Scene();
  const left = new THREE.Group();
  const right = new THREE.Group();
  const hidden = new THREE.Group();
  left.name = "Left object";
  right.name = "Right object";
  hidden.name = "Hidden object";
  left.position.set(-1, 0.5, -3);
  right.position.set(1, -0.5, -4);
  hidden.position.set(0, 0, -2);
  hidden.visible = false;
  left.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.08, 8, 16)));
  right.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.6)));
  hidden.add(new THREE.Mesh(new THREE.SphereGeometry(0.2)));
  scene.add(left, right, hidden);
  const { detector } = createDetector({
    scene,
    image: "data:image/png;base64,source",
    capturedAt: 24.75,
  });

  try {
    const first = await detector.runSetOfMarkDetection();
    const second = await detector.runSetOfMarkDetection();
    const leftMark = first.marks.find((mark) => mark.name === "Left object")!;
    const rightMark = first.marks.find((mark) => mark.name === "Right object")!;

    expect(first.image).toBe("data:image/png;base64,source");
    expect(first.marks.map((mark) => mark.name).sort()).toEqual([
      "Left object",
      "Right object",
    ]);
    expectCoordinate(leftMark.x, 0.3333);
    expectCoordinate(leftMark.y, 0.4167);
    expectCoordinate(rightMark.x, 0.625);
    expectCoordinate(rightMark.y, 0.5625);
    expect(new Set(first.marks.map((mark) => mark.label)).size).toBe(2);
    expect(
      second.marks.map((mark) => ({ label: mark.label, name: mark.name })),
    ).toEqual(
      first.marks.map((mark) => ({ label: mark.label, name: mark.name })),
    );
  } finally {
    detector.dispose();
  }
});

it("projects semantic UI components and labels each visible component", async () => {
  const scene = new THREE.Scene();
  const caption = new UIText({ text: "Status text" });
  const panel = new UIPanel({ children: [caption] });
  const button = new UIButton({ label: "Start" });
  const image = new UIImage({ src: "avatar.png", ariaLabel: "Avatar image" });
  const card = new UICard({
    size: { width: 2, height: 1 },
    children: [button, image, panel],
  });
  card.position.z = -4;
  button.position.set(-0.5, 0.25, 0);
  image.position.set(0.5, 0.25, 0);
  panel.position.set(-0.5, -0.25, 0);
  caption.position.x = 0.3;
  scene.add(card);
  const { detector } = createDetector({ scene });

  try {
    const result = await detector.runContextDetection({
      semanticTree: true,
      visibleObjects: true,
      setOfMark: true,
    });
    const visible = result.visibleObjects!;
    const start = nodeByName(visible, "Start");
    const avatar = nodeByName(visible, "Avatar image");
    const panelNode = nodeByName(visible, "UIPanel");
    const status = nodeByName(visible, "Status text");

    for (const node of [start, avatar, panelNode, status]) {
      expect(node.view).toMatchObject({
        rendered: true,
        inFrame: true,
        inLineOfSight: true,
      });
    }
    expectCoordinate(start.view?.x, 0.4375);
    expectCoordinate(start.view?.y, 0.4688);
    expectCoordinate(avatar.view?.x, 0.5625);
    expectCoordinate(avatar.view?.y, 0.4688);
    expectCoordinate(panelNode.view?.x, 0.4375);
    expectCoordinate(panelNode.view?.y, 0.5313);
    expectCoordinate(status.view?.x, 0.475);
    expectCoordinate(status.view?.y, 0.5313);
    expect(result.setOfMark!.marks.map((mark) => mark.name)).toEqual([
      "UICard",
      "Start",
      "Avatar image",
      "UIPanel",
      "Status text",
    ]);
    expect(
      new Set(result.setOfMark!.marks.map((mark) => mark.label)).size,
    ).toBe(5);
  } finally {
    detector.dispose();
  }
});

it("derives visual products without modifying semantic results", async () => {
  const scene = new THREE.Scene();
  const container = new THREE.Group();
  const visibleProduct = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3));
  const hiddenProduct = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8));
  container.userData.semantic = { role: "group", name: "Semantic container" };
  visibleProduct.userData.semantic = {
    role: "object",
    name: "Visible product",
  };
  hiddenProduct.userData.semantic = { role: "object", name: "Hidden product" };
  container.position.z = -3;
  visibleProduct.position.x = -0.25;
  hiddenProduct.position.x = 0.25;
  hiddenProduct.visible = false;
  container.add(visibleProduct, hiddenProduct);
  scene.add(container);
  const { detector } = createDetector({ scene });

  try {
    const result = await detector.runContextDetection({
      semanticTree: true,
      visibleObjects: true,
      setOfMark: true,
    });
    const semantic = result.semanticTree!;
    const semanticBefore = JSON.parse(JSON.stringify(semantic));
    const visible = result.visibleObjects!;

    expect(semantic).toEqual(semanticBefore);
    expect(visible.rootIds).toEqual(semantic.rootIds);
    expect(Object.keys(visible.nodes)).toEqual(Object.keys(semantic.nodes));
    for (const [nodeId, semanticNode] of Object.entries(semantic.nodes)) {
      const { view, ...visibleSemanticData } = visible.nodes[nodeId];
      expect(view).toBeDefined();
      expect(visible.nodes[nodeId]).not.toBe(semanticNode);
      expect(visibleSemanticData).toEqual(semanticNode);
      expect("view" in semanticNode).toBe(false);
    }
    const semanticIds = new Set(Object.keys(semantic.nodes));
    expect(
      result.setOfMark!.marks.every((mark) => semanticIds.has(mark.nodeId)),
    ).toBe(true);
    expect(result.setOfMark!.marks.map((mark) => mark.name)).toEqual([
      "Semantic container",
      "Visible product",
    ]);
  } finally {
    detector.dispose();
  }
});

it("publishes one combined snapshot with the requested camera overlay", async () => {
  const scene = new THREE.Scene();
  const tracked = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2));
  tracked.name = "Tracked cube";
  tracked.position.z = -2;
  scene.add(tracked);
  const { detector } = createDetector({
    scene,
    image: "data:image/png;base64,capture",
    capturedAt: 42.125,
    deviceCamera: { loaded: true },
  });

  try {
    const result = await detector.runContextDetection({
      semanticTree: true,
      visibleObjects: true,
      setOfMark: true,
    });
    const semantic = result.semanticTree!;
    const mark = result.setOfMark!.marks[0];

    expect(result.visibleObjects!.snapshotId).toBe(semantic.snapshotId);
    expect(result.setOfMark!.snapshotId).toBe(semantic.snapshotId);
    expect(result.visibleObjects!.capturedAt).toBe(42.125);
    expect(result.setOfMark!.capturedAt).toBe(42.125);
    expect(mark.nodeId).toBe(semantic.rootIds[0]);
    expect(mark.name).toBe("Tracked cube");
    expectCoordinate(mark.x, 0.5);
    expectCoordinate(mark.y, 0.5);
    expect(detector.tree).toBe(semantic);
    expect(detector.visibleObjects).toBe(result.visibleObjects);
    expect(detector.setOfMark).toBe(result.setOfMark);
  } finally {
    detector.dispose();
  }
});

it("publishes visible objects without requesting an image", async () => {
  const scene = new THREE.Scene();
  const cylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.25, 0.4, 12),
  );
  cylinder.name = "Visible cylinder";
  cylinder.position.set(0.4, -0.2, -3);
  scene.add(cylinder);
  const { detector, screenshotSynthesizer } = createDetector({
    scene,
    image: "data:image/png;base64,unused",
    capturedAt: 64,
  });

  try {
    const visible = await detector.runVisibleObjectsDetection();
    const node = nodeByName(visible, "Visible cylinder");
    expect(node.view).toMatchObject({
      rendered: true,
      inFrame: true,
      inLineOfSight: true,
    });
    expectCoordinate(node.view?.x, 0.5667);
    expectCoordinate(node.view?.y, 0.5333);
    expect(visible.capturedAt).toBe(64);
    expect(detector.visibleObjects).toBe(visible);
    expect(screenshotSynthesizer.getScreenshot).not.toHaveBeenCalled();
  } finally {
    detector.dispose();
  }
});

it("shares concurrent Set-of-Mark captures", async () => {
  const scene = new THREE.Scene();
  const tracked = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2));
  tracked.name = "Concurrent target";
  tracked.position.z = -2;
  scene.add(tracked);
  const { detector, screenshotSynthesizer } = createDetector({
    scene,
    image: "data:image/png;base64,capture",
    capturedAt: 77,
  });

  try {
    const first = detector.runSetOfMarkDetection();
    const second = detector.runSetOfMarkDetection();
    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toBe(secondResult);
    expect(screenshotSynthesizer.getScreenshot).toHaveBeenCalledOnce();
    expect(firstResult.capturedAt).toBe(77);
  } finally {
    detector.dispose();
  }
});

it_session(
  "captures registered meshes and UI through the public Context facade",
  async (session) => {
    await session.stepFrame(2);
    const unlabeledImage = await session.getScreenshot({
      overlayOnCamera: false,
    });
    const result = await session.getSceneContext({
      semanticTree: true,
      visibleObjects: true,
      setOfMark: true,
    });
    const semantic = result.semanticTree as {
      snapshotId: string;
      capturedAt: number;
      nodes: Record<string, VisualNode>;
    };
    const visible = result.visibleObjects as typeof semantic;
    const setOfMark = result.setOfMark as {
      snapshotId: string;
      capturedAt: number;
      image: string;
      marks: Array<{
        label: string;
        nodeId: string;
        name: string;
        x: number;
        y: number;
      }>;
    };
    const expectedMarkNames = [
      "Session torus",
      "Session card",
      "Session button",
      "Session image",
      "UIPanel",
      "Session status",
    ];

    expect(visible.snapshotId).toBe(semantic.snapshotId);
    expect(setOfMark.snapshotId).toBe(semantic.snapshotId);
    expect(visible.capturedAt).toBe(semantic.capturedAt);
    expect(setOfMark.capturedAt).toBe(semantic.capturedAt);
    for (const name of expectedMarkNames) {
      expect(nodeByName(visible, name).view).toMatchObject({
        rendered: true,
        inFrame: true,
        inLineOfSight: true,
      });
    }
    expect(nodeByName(visible, "Session button").view!.x).not.toBe(
      nodeByName(visible, "Session image").view!.x,
    );
    expect(setOfMark.marks.map((mark) => mark.name).sort()).toEqual(
      [...expectedMarkNames].sort(),
    );
    expect(setOfMark.image).toMatch(/^data:image\/png;base64,/);
    expect(setOfMark.image).not.toBe(unlabeledImage);
    expect(new Set(setOfMark.marks.map((mark) => mark.label)).size).toBe(
      setOfMark.marks.length,
    );

    const visualJudgment = await judge({
      prompt:
        "Return a positive verdict only if this rendered XR scene has clearly visible Set-of-Mark labels confined to the blue torus and the compact card/UI region. Several labels may overlap inside the card because its button, image, panel, and status text are nested there. Return a negative verdict for a blank or unlabeled scene, labels detached from those two regions, or labels on simulator scenery, lights, background elements, helpers, or empty space.",
      evidence: [
        {
          type: "image",
          label: "Set-of-Mark context view",
          image: setOfMark.image,
        },
      ],
    });
    expect(visualJudgment.verdict, visualJudgment.reason).toBe(true);
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
