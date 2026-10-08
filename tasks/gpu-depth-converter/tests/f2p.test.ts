import { expect, it_session } from "@xrblocks/devtools/test";

interface ConverterState {
  error: string | null;
  firstScale: number;
  firstValues: number[];
  height: number;
  readbackBufferReused: boolean;
  renderTargetRestored: boolean;
  secondScale: number;
  secondValues: number[];
  width: number;
  xrDisabledDuringConversion: boolean;
  xrReenabled: boolean;
}

it_session(
  "converts native GPU depth into current float CPU depth",
  async (session) => {
    const state = await converterState(session);

    expect(state.error).toBeNull();
    expect(state.width).toBe(2);
    expect(state.height).toBe(2);
    expect(state.firstScale).toBeCloseTo(0.001);
    expect(state.firstValues).toHaveLength(4);
    expect(state.firstValues).toEqual(
      expect.arrayContaining([
        expect.closeTo(0.2, 4),
        expect.closeTo(0.4, 4),
        expect.closeTo(0.8, 4),
        expect.closeTo(1.6, 4),
      ]),
    );
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "refreshes a stable native depth stream without stale values",
  async (session) => {
    const state = await converterState(session);

    expect(state.error).toBeNull();
    expect(state.readbackBufferReused).toBe(true);
    expect(state.secondScale).toBeCloseTo(0.025);
    expect(state.secondValues).toHaveLength(4);
    expect(state.secondValues).toEqual(
      expect.arrayContaining([
        expect.closeTo(0.25, 4),
        expect.closeTo(0.5, 4),
        expect.closeTo(1, 4),
        expect.closeTo(2, 4),
      ]),
    );
    expect(state.secondValues).not.toEqual(state.firstValues);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "restores caller WebGL state around the conversion pass",
  async (session) => {
    const state = await converterState(session);

    expect(state.error).toBeNull();
    expect(state.xrDisabledDuringConversion, JSON.stringify(state)).toBe(true);
    expect(state.xrReenabled, JSON.stringify(state)).toBe(true);
    expect(state.renderTargetRestored, JSON.stringify(state)).toBe(true);
    expectNoSessionErrors(session.diagnostics);
  },
);

async function converterState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<ConverterState> {
  const inspection = (await session.objects.inspect({
    tag: "gpu-depth-converter",
  })) as { state?: unknown };
  expect(inspection.state).toBeDefined();
  return inspection.state as ConverterState;
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
