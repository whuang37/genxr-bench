import * as THREE from "three";
import { afterEach, expect, it, it_session, vi } from "@xrblocks/devtools/test";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("recognizes the built-in templates across normalized directions and reports filtered or unknown results", async () => {
  const sources = await loadStrokeSources();
  const samples = {
    Triangle: polygon([
      [0, 0],
      [0.5, 1],
      [1, 0],
      [0, 0],
    ]),
    Rectangle: polygon([
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
      [0, 0],
    ]),
    Circle: circle(),
    V: polygon([
      [0, 1],
      [0.5, 0],
      [1, 1],
    ]),
    Caret: polygon([
      [0, 0],
      [1.5, 1],
      [3, 0],
    ]),
  };

  for (const [shape, points] of Object.entries(samples)) {
    expect((await recognizePublicStroke(sources, points)).recognizedShape).toBe(
      shape,
    );
  }

  const transformedTriangle = samples.Triangle.map(({ x, y }) => ({
    x: 10 + (x * Math.cos(0.7) - y * Math.sin(0.7)) * 3,
    y: -8 + (x * Math.sin(0.7) + y * Math.cos(0.7)) * 3,
  }));
  expect(
    (await recognizePublicStroke(sources, transformedTriangle)).recognizedShape,
  ).toBe("Triangle");
  expect(
    (await recognizePublicStroke(sources, [...samples.Rectangle].reverse()))
      .recognizedShape,
  ).toBe("Rectangle");

  const filtered = await recognizePublicStroke(sources, samples.Triangle, [
    "Circle",
  ]);
  expect(filtered.recognizedShape).toBe("Circle");
  expect(filtered.confidence).toBeGreaterThanOrEqual(0);
  expect(filtered.confidence).toBeLessThanOrEqual(1);

  await expect(
    recognizePublicStroke(sources, samples.Triangle, []),
  ).resolves.toEqual({
    recognizedShape: "Unknown",
    confidence: 0,
  });

  const degenerate = await recognizePublicStroke(
    sources,
    Array.from({ length: 16 }, (_, index) => ({ x: index, y: 0 })),
  );
  expect(["Unknown", ...Object.keys(samples)]).toContain(
    degenerate.recognizedShape,
  );
  expect(Number.isFinite(degenerate.confidence)).toBe(true);
  expect(degenerate.confidence).toBeGreaterThanOrEqual(0);
  expect(degenerate.confidence).toBeLessThanOrEqual(1);
});

it("records the hand that selected, delays sampling, projects a transformed stroke, and ends with a result", async () => {
  const { StrokeRecognitionOptions, StrokeRecognizer } =
    await loadStrokeSources();
  const state = strokeInput();
  const options = new StrokeRecognitionOptions({
    startDelay: 0.2,
    endDelay: 0,
  });
  const recognizer = new StrokeRecognizer();
  recognizer.init({ ...context(), options, user: state.user } as never);
  recognizer.activate();
  const events: Array<{
    type: string;
    point?: THREE.Vector3;
    result?: Result;
  }> = [];
  recognizer.addEventListener("unistrokestart", () =>
    events.push({ type: "start" }),
  );
  recognizer.addEventListener("unistrokeupdate", (event) =>
    events.push({ type: "update", point: event.detail.point.clone() }),
  );
  recognizer.addEventListener("unistrokeend", (event) =>
    events.push({ type: "end", result: event.detail.result }),
  );

  let nowMs = 0;
  vi.spyOn(Date, "now").mockImplementation(() => nowMs);
  state.selecting = true;
  state.hand = 0;
  recognizer.update();
  state.left.position.set(-4, -3, 2);
  nowMs = 250;
  recognizer.update();
  expect(events.at(-1)?.point).toEqual(new THREE.Vector3(-4, -3, 2));
  state.selecting = false;
  nowMs = 260;
  recognizer.update();
  events.splice(0);

  state.selecting = true;
  state.hand = 1;
  nowMs = 400;
  recognizer.update();
  nowMs = 500;
  recognizer.update();

  const transformed = new THREE.Group();
  transformed.position.set(2, -3, 5);
  transformed.rotation.set(0.4, -0.7, 0.2);
  transformed.scale.set(2, 1.5, 0.8);
  transformed.updateMatrixWorld(true);
  const points = polygon([
    [0, 0],
    [0.5, 1],
    [1, 0],
    [0, 0],
  ]).map(({ x, y }) =>
    new THREE.Vector3(x, y, 0).applyMatrix4(transformed.matrixWorld),
  );
  for (const [index, point] of points.entries()) {
    state.right.position.copy(point);
    nowMs = 610 + index * 10;
    recognizer.update();
  }
  state.selecting = false;
  nowMs += 20;
  recognizer.update();

  expect(events[0]).toEqual({ type: "start" });
  expect(events.filter((event) => event.type === "update")).toHaveLength(
    points.length,
  );
  expect(events[1].point).toEqual(points[0]);
  const end = events.at(-1);
  expect(end?.type).toBe("end");
  expect(end?.result?.recognizedShape).toBe("Triangle");
  expect(end?.result?.confidence).toBeGreaterThan(0);
  expect(end?.result?.confidence).toBeLessThanOrEqual(1);
});

it("falls back to camera-plane projection for a collinear world stroke", async () => {
  const { StrokeRecognitionOptions, StrokeRecognizer } =
    await loadStrokeSources();
  const state = strokeInput();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(4, 2, 6);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  const recognizer = new StrokeRecognizer();
  recognizer.init({
    scene: new THREE.Scene(),
    camera,
    options: new StrokeRecognitionOptions({ startDelay: 0, endDelay: 0 }),
    user: state.user,
  } as never);
  recognizer.activate();
  const endings: Array<Result | undefined> = [];
  recognizer.addEventListener("unistrokeend", (event) =>
    endings.push(event.detail.result),
  );
  let nowMs = 0;
  vi.spyOn(Date, "now").mockImplementation(() => nowMs);
  state.selecting = true;
  state.hand = 1;
  recognizer.update();
  for (let index = 0; index < 16; index += 1) {
    state.right.position.set(-1 + index / 8, index / 16, index / 12);
    nowMs = index + 1;
    recognizer.update();
  }
  state.selecting = false;
  nowMs += 1;
  recognizer.update();

  expect(endings).toHaveLength(1);
  expect(["Triangle", "Rectangle", "Circle", "V", "Caret"]).toContain(
    endings[0]?.recognizedShape,
  );
  expect(endings[0]?.confidence).toBeGreaterThanOrEqual(0);
  expect(endings[0]?.confidence).toBeLessThanOrEqual(1);
});

it("applies point and trailing-delay limits and clears empty source releases without a false result", async () => {
  const { StrokeRecognitionOptions, StrokeRecognizer } =
    await loadStrokeSources();
  const state = strokeInput();
  const options = new StrokeRecognitionOptions({
    startDelay: 0,
    endDelay: 0,
    maxPoints: 10,
  });
  const recognizer = new StrokeRecognizer();
  recognizer.init({ ...context(), options, user: state.user } as never);
  recognizer.activate();
  const endings: Array<Result | undefined> = [];
  recognizer.addEventListener("unistrokeend", (event) =>
    endings.push(event.detail.result),
  );
  let nowMs = 0;
  vi.spyOn(Date, "now").mockImplementation(() => nowMs);
  state.selecting = true;
  state.hand = 0;
  recognizer.update();
  for (const [index, point] of polygon([
    [0, 0],
    [0.5, 1],
    [1, 0],
    [0, 0],
  ]).entries()) {
    state.left.position.set(point.x, point.y, 0);
    nowMs = 1 + index * 10;
    recognizer.update();
  }
  state.selecting = false;
  nowMs = 200;
  recognizer.update();
  expect(endings).toEqual([undefined]);

  options.maxPoints = 100;
  options.endDelay = 0.1;
  state.selecting = true;
  state.jointAvailable = true;
  nowMs = 250;
  recognizer.update();
  for (const [index, point] of polygon([
    [0, 0],
    [0.5, 1],
    [1, 0],
    [0, 0],
  ]).entries()) {
    state.left.position.set(point.x, point.y, 0);
    nowMs = 251 + index * 10;
    recognizer.update();
  }
  state.selecting = false;
  nowMs = 320;
  recognizer.update();
  expect(endings).toEqual([undefined, undefined]);

  state.selecting = true;
  state.jointAvailable = false;
  nowMs = 450;
  recognizer.update();
  nowMs = 480;
  recognizer.update();
  state.selecting = false;
  nowMs = 500;
  recognizer.update();
  expect(endings).toEqual([undefined, undefined, undefined]);
});

it("activates and deactivates cleanly and falls back to the public built-in provider", async () => {
  const { StrokeRecognitionOptions, StrokeRecognizer } =
    await loadStrokeSources();
  const state = strokeInput();
  const options = new StrokeRecognitionOptions({ startDelay: 0, endDelay: 0 });
  options.providerConfig.provider = "future-provider" as never;
  options.providerConfig.onedollar.supportedShapes = ["Circle"];
  const recognizer = new StrokeRecognizer();
  recognizer.init({ ...context(), options, user: state.user } as never);
  const starts = vi.fn();
  const endings: Array<Result | undefined> = [];
  recognizer.addEventListener("unistrokestart", starts);
  recognizer.addEventListener("unistrokeend", (event) =>
    endings.push(event.detail.result),
  );
  let nowMs = 0;
  vi.spyOn(Date, "now").mockImplementation(() => nowMs);
  state.selecting = true;
  recognizer.update();
  expect(starts).not.toHaveBeenCalled();

  recognizer.activate();
  recognizer.update();
  for (const [index, point] of circle().entries()) {
    state.left.position.set(point.x, point.y, 0);
    nowMs = index + 1;
    recognizer.update();
  }
  state.selecting = false;
  nowMs += 1;
  recognizer.update();
  expect(starts).toHaveBeenCalledOnce();
  expect(endings).toHaveLength(1);
  expect(endings[0]?.recognizedShape).toBe("Circle");

  state.selecting = true;
  recognizer.update();
  recognizer.deactivate();
  state.selecting = false;
  nowMs += 1;
  recognizer.update();
  expect(endings).toHaveLength(1);
});

it_session(
  "records a real selected hand path and exposes its public event result",
  async (session, { primaryHand }) => {
    await session.stepFrame(3);
    expect(await strokeState(session)).toMatchObject({
      ready: true,
      starts: 0,
      ends: 0,
    });

    await session.gesture(primaryHand, "pinching");
    await session.startSelect(primaryHand);
    await session.stepFrame(3);
    await session.moveHand(primaryHand, { rightMeters: 0.14, upMeters: 0.1 });
    await session.moveHand(primaryHand, { rightMeters: 0.14, upMeters: -0.18 });
    await session.moveHand(primaryHand, { rightMeters: -0.28, upMeters: 0 });
    await session.endSelect(primaryHand);
    await session.gesture(primaryHand, "neutral");
    await session.stepFrame(3);

    const state = await strokeState(session);
    expect(state.starts).toBe(1);
    expect(state.updates).toBeGreaterThan(10);
    expect(state.ends).toBe(1);
    expect(state.result?.recognizedShape).toBe("Triangle");
    expect(state.result?.confidence).toBeGreaterThanOrEqual(0);
    expect(state.result?.confidence).toBeLessThanOrEqual(1);
    expectNoSessionErrors(session.diagnostics);
  },
);

type Result = { recognizedShape: string; confidence: number };

async function loadStrokeSources(): Promise<{
  StrokeRecognitionOptions: new (options?: unknown) => {
    providerConfig: {
      provider: string;
      onedollar: { supportedShapes: string[] };
    };
  };
  StrokeRecognizer: new () => {
    init(dependencies: unknown): void;
    activate(): void;
    deactivate(): void;
    update(): void;
    addEventListener(
      type: string,
      listener: (event: StrokeEvent) => void,
    ): void;
  };
}> {
  vi.stubGlobal("window", {
    location: { search: "" },
    addEventListener() {},
    removeEventListener() {},
  });
  const [{ StrokeRecognitionOptions }, { StrokeRecognizer }] =
    await Promise.all([
      import("@xrblocks/source/input/strokes/StrokeRecognitionOptions.ts"),
      import("@xrblocks/source/input/strokes/StrokeRecognition.ts"),
    ]);
  return { StrokeRecognitionOptions, StrokeRecognizer };
}

async function recognizePublicStroke(
  sources: Awaited<ReturnType<typeof loadStrokeSources>>,
  points: Point2D[],
  supportedShapes?: string[],
): Promise<Result> {
  const state = strokeInput();
  const options = new sources.StrokeRecognitionOptions({
    startDelay: 0,
    endDelay: 0,
  });
  if (supportedShapes !== undefined) {
    options.providerConfig.onedollar.supportedShapes = supportedShapes;
  }
  const recognizer = new sources.StrokeRecognizer();
  recognizer.init({ ...context(), options, user: state.user } as never);
  recognizer.activate();
  let result: Result | undefined;
  recognizer.addEventListener("unistrokeend", (event) => {
    result = event.detail.result;
  });

  let nowMs = 0;
  const clock = vi.spyOn(Date, "now").mockImplementation(() => nowMs);
  try {
    state.selecting = true;
    recognizer.update();
    for (const [index, point] of points.entries()) {
      state.left.position.set(point.x, point.y, 0);
      nowMs = index + 1;
      recognizer.update();
    }
    state.selecting = false;
    nowMs += 1;
    recognizer.update();
  } finally {
    clock.mockRestore();
  }

  expect(result).toBeDefined();
  return result!;
}

type Point2D = { x: number; y: number };
type StrokeEvent = { detail: { point?: THREE.Vector3; result?: Result } };

function context(supportedShapes?: string[]) {
  return {
    camera: new THREE.PerspectiveCamera(),
    scene: new THREE.Scene(),
    supportedShapes,
  };
}

function polygon(vertices: Array<[number, number]>, density = 5): Point2D[] {
  const points: Point2D[] = [];
  for (let edge = 1; edge < vertices.length; edge += 1) {
    const [fromX, fromY] = vertices[edge - 1];
    const [toX, toY] = vertices[edge];
    for (let step = 0; step < density; step += 1) {
      const t = step / density;
      points.push({
        x: fromX + (toX - fromX) * t,
        y: fromY + (toY - fromY) * t,
      });
    }
  }
  points.push({ x: vertices.at(-1)![0], y: vertices.at(-1)![1] });
  return points;
}

function circle(): Point2D[] {
  return Array.from({ length: 33 }, (_, index) => {
    const angle = (index / 32) * Math.PI * 2;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  });
}

function strokeInput() {
  const left = new THREE.Object3D();
  const right = new THREE.Object3D();
  const state: {
    selecting: boolean;
    hand: number;
    jointAvailable: boolean;
    left: THREE.Object3D;
    right: THREE.Object3D;
    user?: unknown;
  } = { selecting: false, hand: 0, jointAvailable: true, left, right };
  state.user = {
    isSelecting(hand?: number) {
      return state.selecting && (hand === undefined || hand === state.hand);
    },
    hands: {
      getJoint(_joint: string, hand: number) {
        if (!state.jointAvailable || hand !== state.hand) return undefined;
        return hand === 0 ? left : right;
      },
    },
  };
  return state as typeof state & { user: NonNullable<typeof state.user> };
}

async function strokeState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{
  ready: boolean;
  starts: number;
  updates: number;
  ends: number;
  result?: Result;
}> {
  const inspection = (await session.objects.inspect({
    tag: "stroke-recognizer",
  })) as {
    state?: unknown;
  };
  expect(inspection.state).toBeDefined();
  return inspection.state as {
    ready: boolean;
    starts: number;
    updates: number;
    ends: number;
    result?: Result;
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
