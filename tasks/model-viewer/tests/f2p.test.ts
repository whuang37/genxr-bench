import * as THREE from "three";
import {
  afterEach,
  expect,
  it,
  it_session,
  judge,
  vi,
} from "@xrblocks/devtools/test";
import type { ModelViewer } from "@xrblocks/source/ui/model/ModelViewer.ts";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("aligns existing caller-owned content and records local bounds for every origin", async () => {
  const { ModelViewer } = await loadModelViewerSources();
  const cases = [
    {
      origin: "bottom-center" as const,
      position: [0, 2, 0],
      min: [-1, 0, -3],
      max: [1, 4, 3],
    },
    {
      origin: "center" as const,
      position: [0, 0, 0],
      min: [-1, -2, -3],
      max: [1, 2, 3],
    },
    {
      origin: "source" as const,
      position: [4, 5, 6],
      min: [3, 3, 3],
      max: [5, 7, 9],
    },
  ];

  for (const expected of cases) {
    const content = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 6));
    content.position.set(4, 5, 6);
    const viewer = new ModelViewer({
      origin: expected.origin,
      manipulation: false,
    });

    viewer.setContent(content);

    expectVector(content.position, expected.position);
    expectVector(viewer.boundingBox.min, expected.min);
    expectVector(viewer.boundingBox.max, expected.max);
    viewer.dispose();
  }
});

it("replaces caller-owned content without disposing its geometry or materials", async () => {
  const { ModelViewer } = await loadModelViewerSources();
  const firstGeometry = new THREE.BoxGeometry(1, 1, 1);
  const firstMaterial = new THREE.MeshBasicMaterial();
  const secondGeometry = new THREE.SphereGeometry(0.5);
  const secondMaterial = new THREE.MeshBasicMaterial();
  const first = new THREE.Mesh(firstGeometry, firstMaterial);
  const second = new THREE.Mesh(secondGeometry, secondMaterial);
  const disposals = [
    vi.spyOn(firstGeometry, "dispose"),
    vi.spyOn(firstMaterial, "dispose"),
    vi.spyOn(secondGeometry, "dispose"),
    vi.spyOn(secondMaterial, "dispose"),
  ];
  const viewer = new ModelViewer({ manipulation: false });

  viewer.setContent(first);
  viewer.setContent(second);
  expect(first.parent).toBeNull();
  expect(viewer.boundingBox.isEmpty()).toBe(false);
  viewer.dispose();

  expect(second.parent).toBeNull();
  for (const dispose of disposals) expect(dispose).not.toHaveBeenCalled();
});

it("loads transformed glTF sources before local bounds and viewer hierarchy scale", async () => {
  const { ModelViewer } = await loadModelViewerSources();
  installGltfFetch({
    "https://model-viewer.test/assets/asset.gltf": triangleGltfDocument(),
  });
  const viewer = new ModelViewer({ origin: "center", manipulation: false });

  await viewer.load({
    url: "asset.gltf",
    path: "https://model-viewer.test/assets/",
    scale: { x: 2, y: 1, z: 0.5 },
    rotation: { x: 0, y: Math.PI / 2, z: 0 },
  });

  expectVector(viewer.boundingBox.getSize(new THREE.Vector3()), [0, 0.6, 1.2]);

  const parent = new THREE.Group();
  parent.scale.setScalar(2);
  viewer.scale.setScalar(3);
  parent.add(viewer);
  parent.updateMatrixWorld(true);
  expectVector(
    new THREE.Box3().setFromObject(viewer).getSize(new THREE.Vector3()),
    [0, 3.6, 7.2],
  );
  await expect(viewer.load("models/readme.txt")).rejects.toThrow();

  const failedViewer = new ModelViewer({ manipulation: false });
  await expect(
    failedViewer.load("https://model-viewer.test/missing.gltf"),
  ).rejects.toThrow();
  expect(failedViewer.boundingBox.isEmpty()).toBe(true);
});

it("keeps only the latest public load and rejects loads after disposal", async () => {
  const { ModelViewer } = await loadModelViewerSources();
  const first = deferred<Response>();
  const second = deferred<Response>();
  installGltfFetch({
    "https://model-viewer.test/current.gltf": second.promise,
    "https://model-viewer.test/old.gltf": first.promise,
  });
  const viewer = new ModelViewer({ manipulation: false });

  const oldLoad = viewer.load("https://model-viewer.test/old.gltf").then(
    () => undefined,
    (error: unknown) => error,
  );
  const currentLoad = viewer
    .load("https://model-viewer.test/current.gltf")
    .then(
      () => undefined,
      (error: unknown) => error,
    );
  second.resolve(gltfResponse(triangleGltfDocument()));
  expect(await currentLoad).toBeUndefined();
  first.resolve(gltfResponse(triangleGltfDocument()));
  expect(await oldLoad).toBeInstanceOf(Error);
  expect(viewer.boundingBox.isEmpty()).toBe(false);
  expect(viewer.getObjectByName("Fixture_mesh")).toBeDefined();

  viewer.dispose();
  expect(viewer.getObjectByName("Fixture_mesh")).toBeUndefined();
  await expect(viewer.load("after-dispose.glb")).rejects.toThrow();
});

it("keeps public viewer manipulation available and applies shadow options to content", async () => {
  const { ModelViewer } = await loadModelViewerSources();
  installGltfFetch({
    "https://model-viewer.test/shadow.gltf": triangleGltfDocument(),
  });
  const viewer = new ModelViewer({
    occlusion: true,
    castShadow: false,
    receiveShadow: true,
  });
  await viewer.load("https://model-viewer.test/shadow.gltf");
  const mesh = viewer.getObjectByName("Fixture_mesh") as THREE.Mesh;

  expect(viewer.manipulation).toEqual({
    actions: { translate: true, rotate: true, scale: true },
    handle: { action: "rotate" },
  });
  expect(mesh.castShadow).toBe(false);
  expect(mesh.receiveShadow).toBe(true);

  viewer.manipulation = false;
  expect(viewer.manipulation).toBe(false);
  viewer.dispose();
  expect(viewer.getObjectByName("Fixture_mesh")).toBeUndefined();
});

it("autoplays, replays once, and advances loaded glTF animation through update", async () => {
  const { ModelViewer } = await loadModelViewerSources();
  installGltfFetch({
    "https://model-viewer.test/autoplay.gltf": animatedTriangleGltfDocument(),
    "https://model-viewer.test/manual.gltf": animatedTriangleGltfDocument(),
  });

  const autoplayViewer = new ModelViewer({ manipulation: false });
  await initialize(autoplayViewer, 0.5);
  await autoplayViewer.load("https://model-viewer.test/autoplay.gltf");
  autoplayViewer.update();
  expect(
    new THREE.Box3()
      .setFromObject(autoplayViewer)
      .getCenter(new THREE.Vector3()).x,
  ).toBeCloseTo(1);

  const manualViewer = new ModelViewer({
    autoplay: false,
    manipulation: false,
  });
  await initialize(manualViewer, 0.5);
  await manualViewer.load("https://model-viewer.test/manual.gltf");
  manualViewer.update();
  expect(
    new THREE.Box3().setFromObject(manualViewer).getCenter(new THREE.Vector3())
      .x,
  ).toBeCloseTo(0);
  manualViewer.playAnimation({ once: true });
  manualViewer.update();
  expect(
    new THREE.Box3().setFromObject(manualViewer).getCenter(new THREE.Vector3())
      .x,
  ).toBeCloseTo(1);
  manualViewer.update();
  expect(
    new THREE.Box3().setFromObject(manualViewer).getCenter(new THREE.Vector3())
      .x,
  ).toBeCloseTo(2);
});

it_session(
  "renders caller content, loads a local glTF fixture, and starts viewer manipulation",
  async (session, { primaryHand }) => {
    await session.stepFrame(3);
    const state = await viewerState(session);
    expect(state.contentAttached).toBe(true);
    expect(state.localLoaded).toBe(true);
    expect(state.localBounds[0]).toBeCloseTo(0.6);
    expect(state.localBounds[1]).toBeCloseTo(0.6);
    expect(state.localBounds[2]).toBeCloseTo(0);
    expect(await session.objects.findByTag("set-content-mesh")).toHaveLength(1);
    expect(await session.objects.findByTag("local-model-viewer")).toHaveLength(
      1,
    );
    await session.gesture(primaryHand, "neutral");
    await session.pointTo(primaryHand, { tag: "ordinary-ray-target" });
    await session.stepFrame(2);
    const beforeHover = await session.getScreenshot();
    await session.pointTo(primaryHand, { tag: "session-model-viewer" });
    await session.stepFrame(2);
    const afterHover = await session.getScreenshot();
    expect(afterHover).toMatch(/^data:image\/png;base64,/);
    expect(afterHover).not.toBe(beforeHover);
    expect((await viewerState(session)).hoverEnters).toBeGreaterThanOrEqual(1);

    await session.startSelect(primaryHand);
    await session.stepFrame(2);
    expect(
      (await viewerState(session)).manipulationStarts,
    ).toBeGreaterThanOrEqual(1);

    await session.endSelect(primaryHand);
    await session.stepFrame(2);
    expect(
      (await viewerState(session)).manipulationEnds,
    ).toBeGreaterThanOrEqual(1);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "loads and renders the sample GLB and glTF models from their pinned CDN sources",
  async (session, { primaryHand }) => {
    await session.gesture(primaryHand, "neutral");
    await session.pointTo(primaryHand, { tag: "cdn-load-target" });
    await session.click(primaryHand);
    const state = await waitForViewerState(
      session,
      (value) => value.cdnComplete,
    );
    expect(state.cdnModels).toHaveLength(2);
    expect(state.cdnModels.map(({ format }) => format)).toEqual([
      "glb",
      "gltf",
    ]);
    expect(state.cdnModels.map(({ resolvedUrl }) => resolvedUrl)).toEqual([
      "https://cdn.jsdelivr.net/gh/xrblocks/proprietary-assets@main/chess/chess_compressed.glb",
      "https://cdn.jsdelivr.net/gh/xrblocks/assets@main/models/Cat/cat.gltf",
    ]);
    for (const model of state.cdnModels) {
      expect(model.error).toBeNull();
      expect(model.loaded).toBe(true);
      expect(model.bounds).toHaveLength(3);
      expect(
        model.bounds.every((value) => Number.isFinite(value) && value > 0),
      ).toBe(true);
      expect(
        await session.objects.findByTag(`cdn-model-${model.format}`),
      ).toHaveLength(1);
      const inspection = (await session.objects.inspect({
        tag: `cdn-model-${model.format}`,
      })) as { visible?: boolean };
      expect(inspection.visible).toBe(true);
    }

    const screenshot = await session.getScreenshot();
    expect(screenshot).toMatch(/^data:image\/png;base64,/);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "keeps the inactive platform visually transparent from below and lets the model cast its own shadow",
  async (session) => {
    await session.stepFrame(8);
    const state = await viewerState(session);
    expect(state.undersideReady).toBe(true);
    expect(
      await session.objects.findByTag("underside-model-viewer"),
    ).toHaveLength(1);
    expect(
      await session.objects.findByTag("underside-shadow-receiver"),
    ).toHaveLength(1);
    await session.teleportTo(
      { tag: "underside-model-viewer" },
      { distance: 1.1, faceTarget: true },
    );
    await session.stepFrame(8);
    const screenshot = await session.getScreenshot();
    const visual = await judge({
      prompt:
        "This is an underside view of an orange ModelViewer object below a pale shadow receiver. Return a positive verdict only if the orange content is visible, there is no opaque rounded platform or slab under it while idle, and the receiver shows a localized shadow from the content rather than a large platform-shaped shadow. Allow ordinary simulator scenery and small WebGL differences.",
      evidence: [
        {
          type: "image",
          label: "Model viewer final view",
          image: screenshot,
        },
      ],
    });
    expect(visual.verdict, visual.reason).toBe(true);
    expectNoSessionErrors(session.diagnostics);
  },
);

async function loadModelViewerSources(): Promise<{
  ModelViewer: typeof ModelViewer;
}> {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const { ModelViewer } = await import(
    "@xrblocks/source/ui/model/ModelViewer.ts"
  );
  return { ModelViewer };
}

async function initialize(viewer: ModelViewer, delta = 0): Promise<void> {
  const registerHitSurface = vi.fn(() => vi.fn());
  const depth = { occludableShaders: new Set<unknown>() };
  await viewer.init({
    depth,
    interaction: { registerHitSurface },
    scene: new THREE.Scene(),
    renderer: undefined,
    registry: { get: vi.fn(), register: vi.fn() },
    timer: { getDelta: vi.fn(() => delta) },
  } as never);
}

type GltfDocument = Record<string, unknown>;

function installGltfFetch(
  documents: Record<string, GltfDocument | Promise<Response>>,
): void {
  const platformFetch = globalThis.fetch;
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
  vi.stubGlobal(
    "fetch",
    vi.fn(async (request: string | { url: string }) => {
      const url = typeof request === "string" ? request : request.url;
      if (url.startsWith("data:")) return platformFetch(request as Request);
      const document = documents[url];
      if (!document) return new Response("Not found", { status: 404 });
      return document instanceof Promise ? document : gltfResponse(document);
    }),
  );
}

function gltfResponse(document: GltfDocument): Response {
  return new Response(JSON.stringify(document), {
    headers: { "Content-Type": "model/gltf+json" },
  });
}

function triangleGltfDocument(): GltfDocument {
  return {
    asset: { version: "2.0" },
    buffers: [
      {
        uri: "data:application/octet-stream;base64,mpmZvgAAAAAAAAAAmpmZPgAAAAAAAAAAAAAAAJqZGT8AAAAA",
        byteLength: 36,
      },
    ],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [-0.3, 0, 0],
        max: [0.3, 0.6, 0],
      },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    nodes: [{ mesh: 0, name: "Fixture_mesh" }],
    scenes: [{ nodes: [0] }],
    scene: 0,
  };
}

function animatedTriangleGltfDocument(): GltfDocument {
  const document = triangleGltfDocument() as {
    accessors: Array<Record<string, unknown>>;
    bufferViews: Array<Record<string, unknown>>;
    buffers: Array<Record<string, unknown>>;
    nodes: Array<Record<string, unknown>>;
  };
  document.buffers[0] = {
    uri: "data:application/octet-stream;base64,mpmZvgAAAAAAAAAAmpmZPgAAAAAAAAAAAAAAAJqZGT8AAAAAAAAAAAAAgD8AAAAAAAAAAAAAAAAAAABAAAAAAAAAAAA=",
    byteLength: 68,
  };
  document.bufferViews.push(
    { buffer: 0, byteOffset: 36, byteLength: 8 },
    { buffer: 0, byteOffset: 44, byteLength: 24 },
  );
  document.accessors.push(
    {
      bufferView: 1,
      componentType: 5126,
      count: 2,
      type: "SCALAR",
      min: [0],
      max: [1],
    },
    { bufferView: 2, componentType: 5126, count: 2, type: "VEC3" },
  );
  document.nodes[0].name = "Animated_mesh";
  return {
    ...document,
    animations: [
      {
        samplers: [{ input: 1, output: 2, interpolation: "LINEAR" }],
        channels: [{ sampler: 0, target: { node: 0, path: "translation" } }],
      },
    ],
  };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason?: unknown): void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function expectVector(value: THREE.Vector3, expected: number[]): void {
  expect(value.x).toBeCloseTo(expected[0]);
  expect(value.y).toBeCloseTo(expected[1]);
  expect(value.z).toBeCloseTo(expected[2]);
}

async function viewerState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{
  contentAttached: boolean;
  cdnComplete: boolean;
  cdnModels: Array<{
    bounds: number[];
    error: string | null;
    format: string;
    loaded: boolean;
    resolvedUrl: string;
  }>;
  localLoaded: boolean;
  localBounds: number[];
  manipulationStarts: number;
  manipulationEnds: number;
  hoverEnters: number;
  undersideReady: boolean;
}> {
  const inspection = (await session.objects.inspect({
    tag: "session-model-viewer",
  })) as { state?: unknown };
  expect(inspection.state).toBeDefined();
  return inspection.state as {
    contentAttached: boolean;
    cdnComplete: boolean;
    cdnModels: Array<{
      bounds: number[];
      error: string | null;
      format: string;
      loaded: boolean;
      resolvedUrl: string;
    }>;
    localLoaded: boolean;
    localBounds: number[];
    manipulationStarts: number;
    manipulationEnds: number;
    hoverEnters: number;
    undersideReady: boolean;
  };
}

async function waitForViewerState(
  session: Parameters<typeof viewerState>[0] & {
    stepFrame(count?: number): Promise<unknown>;
  },
  ready: (state: Awaited<ReturnType<typeof viewerState>>) => boolean,
): Promise<Awaited<ReturnType<typeof viewerState>>> {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const state = await viewerState(session);
    if (ready(state)) return state;
    await session.stepFrame(1);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return viewerState(session);
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
