import { expect, it_session } from "@xrblocks/devtools/test";

interface Bounds {
  centerX: number;
  centerY: number;
  count: number;
  height: number;
  width: number;
}

interface ImageSamples {
  background: number[];
  blackCenter: number[];
  height: number;
  redBounds: Bounds;
  redMarker: number[];
  transparentCorner: number[];
  whiteMarker: number[];
  width: number;
  yellowBounds: Bounds;
}

interface ImageComparison {
  differingPixelRatio: number;
  dimensionMatch: boolean;
  maxChannelDelta: number;
  meanChannelDelta: number;
}

interface CaptureState {
  error: string | null;
  hiddenScreen: ImageSamples;
  readdedScreen: ImageSamples;
  reappearedScreen: ImageSamples;
  removedScreen: ImageSamples;
  repeatedScreenParity: ImageComparison;
  screenComposite: ImageSamples;
  screenCompositeImage: string;
  screenCompositing: string;
  screenPointerEvents: string;
  screenSource: ImageSamples;
  texturesStable: boolean;
  worldOnly: ImageSamples;
}

it_session(
  "matches screen-blend output and preserves transparent regions",
  async (session) => {
    const state = await captureState(session);
    const composite = state.screenComposite;
    const source = state.screenSource;
    const world = state.worldOnly;
    const expectedRed = screenBlend(world.redMarker, source.redMarker);

    expect(state.error).toBeNull();
    expect(state.screenCompositeImage).toMatch(/^data:image\/png;base64,/);
    expect(colorDistance(composite.redMarker, expectedRed)).toBeLessThan(28);
    expect(
      colorDistance(composite.blackCenter, world.blackCenter),
    ).toBeLessThan(12);
    expect(
      colorDistance(composite.transparentCorner, world.transparentCorner),
    ).toBeLessThan(12);
    for (let channel = 0; channel < 3; channel += 1) {
      expect(composite.whiteMarker[channel]).toBeGreaterThan(
        world.whiteMarker[channel],
      );
    }
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "clears screen-overlay pixels before every rendered frame",
  async (session) => {
    const state = await captureState(session);

    expect(state.repeatedScreenParity.dimensionMatch).toBe(true);
    expect(state.repeatedScreenParity.differingPixelRatio).toBeLessThan(0.001);
    expect(state.repeatedScreenParity.meanChannelDelta).toBeLessThan(0.1);
    expect(
      colorDistance(
        state.screenComposite.blackCenter,
        state.worldOnly.blackCenter,
      ),
    ).toBeLessThan(12);
    expect(state.texturesStable).toBe(true);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "removes hidden and detached overlays without leaving stale pixels",
  async (session) => {
    const state = await captureState(session);
    const expectedRed = screenBlend(
      state.worldOnly.redMarker,
      state.screenSource.redMarker,
    );

    expect(
      colorDistance(state.hiddenScreen.redMarker, state.worldOnly.redMarker),
    ).toBeLessThan(12);
    expect(
      colorDistance(state.removedScreen.redMarker, state.worldOnly.redMarker),
    ).toBeLessThan(12);
    expect(
      colorDistance(state.reappearedScreen.redMarker, expectedRed),
    ).toBeLessThan(28);
    expect(
      colorDistance(state.readdedScreen.redMarker, expectedRed),
    ).toBeLessThan(28);
    expect(
      colorDistance(
        state.readdedScreen.blackCenter,
        state.worldOnly.blackCenter,
      ),
    ).toBeLessThan(12);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "keeps screen-overlay geometry centered and undistorted",
  async (session) => {
    const state = await captureState(session);
    const bounds = state.screenComposite.redBounds;

    expect(bounds.count).toBeGreaterThan(100);
    expect(bounds.width / bounds.height).toBeGreaterThan(0.95);
    expect(bounds.width / bounds.height).toBeLessThan(1.05);
    expect(Math.abs(bounds.centerX - 0.75)).toBeLessThan(0.02);
    expect(Math.abs(bounds.centerY - 0.25)).toBeLessThan(0.02);
    expect(
      colorDistance(
        state.screenComposite.transparentCorner,
        state.worldOnly.transparentCorner,
      ),
    ).toBeLessThan(12);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "keeps screen-composited overlay trees outside pointer interaction",
  async (session, { primaryHand }) => {
    const state = await captureState(session);
    expect(state.screenCompositing).toBe("screen");
    expect(state.screenPointerEvents).toBe("none");

    await session.gesture(primaryHand, "neutral");
    await session.pointTo(primaryHand, {
      tag: "screen-composite-underlay-target",
    });
    await session.click(primaryHand);
    await session.stepFrame(2);

    const target = (await session.objects.inspect({
      tag: "screen-composite-underlay-target",
    })) as { state?: { ends: number; starts: number } };
    expect(target.state).toEqual({ ends: 1, starts: 1 });
    expectNoSessionErrors(session.diagnostics);
  },
);

function screenBlend(world: number[], source: number[]): number[] {
  return world
    .slice(0, 3)
    .map((value, index) =>
      Math.round(255 - ((255 - value) * (255 - source[index])) / 255),
    );
}

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

function colorDistance(first: number[], second: number[]): number {
  return Math.sqrt(
    first.slice(0, 3).reduce((sum, value, index) => {
      const difference = value - second[index];
      return sum + difference * difference;
    }, 0),
  );
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
