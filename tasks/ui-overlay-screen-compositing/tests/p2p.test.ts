import { expect, it_session } from "@xrblocks/devtools/test";

interface Bounds {
  centerX: number;
  centerY: number;
  count: number;
}

interface CaptureState {
  directImage: string;
  directSamples: {
    background: number[];
    cyanBounds: Bounds;
    height: number;
    magentaBounds: Bounds;
    width: number;
    yellowBounds: Bounds;
  };
  directCompositing: string;
  error: string | null;
  explicitDirectCompositing: string;
}

it_session(
  "renders ordinary direct overlays with expected colors and positions",
  async (session) => {
    const state = await captureState(session);
    const samples = state.directSamples;

    expect(state.error).toBeNull();
    expect(state.directImage).toMatch(/^data:image\/png;base64,/);
    expect(samples.width).toBeGreaterThan(0);
    expect(samples.height).toBeGreaterThan(0);
    expectColorNear(samples.background, [48, 64, 80], 24);
    expectBoundsNear(samples.cyanBounds, 0.586, 0.424);
    expectBoundsNear(samples.magentaBounds, 0.395, 0.576);
    expectBoundsNear(samples.yellowBounds, 0.653, 0.634);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "keeps direct compositing as the default and explicit mode",
  async (session) => {
    const state = await captureState(session);

    expect(state.error).toBeNull();
    expect(state.directCompositing).toBe("direct");
    expect(state.explicitDirectCompositing).toBe("direct");
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "keeps direct overlays interactive",
  async (session, { primaryHand }) => {
    await captureState(session);
    await session.gesture(primaryHand, "neutral");
    await session.pointTo(primaryHand, {
      tag: "direct-overlay-button",
    });
    await session.click(primaryHand);
    await session.stepFrame(2);

    const interaction = (await session.objects.inspect({
      tag: "direct-overlay-button",
    })) as { state?: { clicks: number } };
    expect(interaction.state).toEqual({ clicks: 1 });
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session("keeps normal Core frame updates running", async (session) => {
  await session.stepFrame(3);
  const before = await lifecycleState(session);
  expect(before.initialized).toBe(1);

  await session.stepFrame(3);
  const after = await lifecycleState(session);
  expect(after.updates).toBeGreaterThan(before.updates);
  expectNoSessionErrors(session.diagnostics);
});

async function captureState(session: {
  stepFrame(count?: number): Promise<unknown>;
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<CaptureState> {
  let inspection: { state?: { pending?: boolean } } | undefined;
  for (let frame = 0; frame < 160; frame += 1) {
    inspection = (await session.objects.inspect({
      tag: "screen-composite-capture",
    })) as { state?: { pending?: boolean } };
    if (inspection.state?.pending === false) break;
    await session.stepFrame(1);
  }
  expect(inspection?.state).toBeDefined();
  expect(inspection!.state!.pending).toBe(false);
  return inspection!.state as CaptureState;
}

async function lifecycleState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}) {
  const inspection = (await session.objects.inspect({
    tag: "screen-composite-lifecycle",
  })) as { state?: unknown };
  expect(inspection.state).toBeDefined();
  return inspection.state as { initialized: number; updates: number };
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

function expectColorNear(
  actual: number[],
  expected: number[],
  tolerance: number,
): void {
  for (let channel = 0; channel < 3; channel += 1) {
    expect(Math.abs(actual[channel] - expected[channel])).toBeLessThan(
      tolerance,
    );
  }
}

function expectBoundsNear(
  bounds: Bounds,
  expectedCenterX: number,
  expectedCenterY: number,
): void {
  expect(bounds.count).toBeGreaterThan(50);
  expect(Math.abs(bounds.centerX - expectedCenterX)).toBeLessThan(0.025);
  expect(Math.abs(bounds.centerY - expectedCenterY)).toBeLessThan(0.025);
}
