import { expect, it_session, judge } from "@xrblocks/devtools/test";

type CaptureState = {
  cameraLoaded: boolean;
  coalesced: boolean;
  error: string | null;
  expectedHeight: number;
  height: number;
  overlayCorner: number[];
  overlayImage: string;
  overlayPng: boolean;
  overlayResourcesStable: boolean;
  repeatedOverlayMatchesDimensions: boolean;
  repeatedOverlayPng: boolean;
  stateRestored: boolean;
  top: number[];
  bottom: number[];
  virtualCorner: number[];
  virtualImage: string;
  width: number;
};

it_session(
  "captures a fixed-width public PNG with the source aspect ratio and image orientation",
  async (session) => {
    const state = await captureState(session);

    expect(state.error).toBeNull();
    expect(state.width).toBe(1280);
    expect(state.height).toBe(state.expectedHeight);
    expect(state.top[0]).toBeGreaterThan(state.top[2] + 80);
    expect(state.bottom[2]).toBeGreaterThan(state.bottom[0] + 80);
    expect(state.virtualImage).toMatch(/^data:image\/png;base64,/);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "coalesces compatible public requests and restores renderer state",
  async (session) => {
    const state = await captureState(session);

    expect(state.coalesced).toBe(true);
    expect(state.stateRestored).toBe(true);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "captures the loaded device camera through the public overlay mode",
  async (session) => {
    const state = await captureState(session);

    expect(state.cameraLoaded).toBe(true);
    expect(state.overlayPng).toBe(true);
    expect(state.repeatedOverlayPng).toBe(true);
    expect(state.repeatedOverlayMatchesDimensions).toBe(true);
    expect(state.overlayResourcesStable).toBe(true);
    expect(state.overlayImage).toMatch(/^data:image\/png;base64,/);
    expect(
      colorDistance(state.overlayCorner, state.virtualCorner),
    ).toBeGreaterThan(20);

    const visualJudgment = await judge({
      prompt:
        "Return a positive verdict only if this screenshot combines a red upper rectangle and blue lower rectangle with a visible camera-image background. Allow antialiasing and small color differences. Return a negative verdict if the image is blank, either rectangle is missing, or the entire background is black.",
      evidence: [
        {
          type: "image",
          label: "Camera overlay screenshot",
          image: state.overlayImage,
        },
      ],
    });
    expect(visualJudgment.verdict, visualJudgment.reason).toBe(true);
    expectNoSessionErrors(session.diagnostics);
  },
);

async function captureState(session: {
  stepFrame(count: number): Promise<void>;
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<CaptureState> {
  let inspection: { state?: unknown } | undefined;
  for (let frame = 0; frame < 30; frame += 1) {
    await session.stepFrame(1);
    inspection = (await session.objects.inspect({
      tag: "screenshot-public-lifecycle",
    })) as { state?: { pending?: boolean } };
    if (inspection.state?.pending === false) break;
  }
  expect(inspection?.state).toBeDefined();
  expect((inspection!.state as { pending?: boolean }).pending).toBe(false);
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
