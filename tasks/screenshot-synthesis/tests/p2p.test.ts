import { expect, it_session } from "@xrblocks/devtools/test";

it_session(
  "keeps normal Core rendering available while no screenshot result is required",
  async (session) => {
    await session.stepFrame(2);
    const inspection = await session.objects.inspect({
      tag: "screenshot-synthesis-basic-app",
    });

    expect(inspection.state).toMatchObject({
      error: null,
      renderedScene: true,
    });
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "keeps ordinary Script initialization and frame updates running",
  async (session) => {
    await session.stepFrame(3);
    const state = await lifecycleState(session);

    expect(state.initialized).toBe(1);
    expect(state.parented).toBe(true);
    expect(state.updates).toBeGreaterThanOrEqual(3);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "keeps public camera transforms and scene ownership unchanged",
  async (session) => {
    await session.stepFrame(2);
    const state = await lifecycleState(session);

    expect(state.cameraPosition).toEqual([0, 0, 3]);
    expect(state.parented).toBe(true);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "keeps unrelated ray selection working in the rendered scene",
  async (session, { primaryHand }) => {
    await session.stepFrame(2);
    expect(await rayTargetState(session)).toEqual({ ends: 0, starts: 0 });

    await session.gesture(primaryHand, "neutral");
    await session.pointTo(primaryHand, {
      tag: "screenshot-ordinary-ray-target",
    });
    await session.click(primaryHand);
    await session.stepFrame(2);

    expect(await rayTargetState(session)).toEqual({ ends: 1, starts: 1 });
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "keeps Core frames running after a screenshot request settles",
  async (session) => {
    let settled = await lifecycleState(session);
    for (let frame = 0; frame < 30 && !settled.screenshotSettled; frame += 1) {
      await session.stepFrame(1);
      settled = await lifecycleState(session);
    }
    expect(settled.screenshotSettled).toBe(true);
    const countAtSettlement = settled.updatesAtScreenshotSettlement;

    await session.stepFrame(3);
    const later = await lifecycleState(session);

    expect(later.updates).toBeGreaterThan(countAtSettlement);
    expectNoSessionErrors(session.diagnostics);
  },
);

async function lifecycleState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{
  cameraPosition: number[];
  initialized: number;
  parented: boolean;
  screenshotSettled: boolean;
  updates: number;
  updatesAtScreenshotSettlement: number;
}> {
  const inspection = (await session.objects.inspect({
    tag: "screenshot-render-lifecycle",
  })) as { state?: unknown };
  expect(inspection.state).toBeDefined();
  return inspection.state as {
    cameraPosition: number[];
    initialized: number;
    parented: boolean;
    screenshotSettled: boolean;
    updates: number;
    updatesAtScreenshotSettlement: number;
  };
}

async function rayTargetState(session: {
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}): Promise<{ ends: number; starts: number }> {
  const inspection = (await session.objects.inspect({
    tag: "screenshot-ordinary-ray-target",
  })) as { state?: unknown };
  expect(inspection.state).toBeDefined();
  return inspection.state as { ends: number; starts: number };
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
