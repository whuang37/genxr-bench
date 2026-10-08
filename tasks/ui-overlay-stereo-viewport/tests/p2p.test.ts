import { expect, it_session } from "@xrblocks/devtools/test";

it_session(
  "keeps ordinary mono screen-overlay screenshots working",
  async (session) => {
    const state = await stereoState(session);

    expect(state.error).toBeNull();
    expect(state.monoImage).toMatch(/^data:image\/png;base64,/);
    expect(state.monoRed[0]).toBeGreaterThan(state.monoRed[1] + 45);
    expect(state.monoRed[0]).toBeGreaterThan(state.monoRed[2] + 45);
    expectNoSessionErrors(session.diagnostics);
  },
);

it_session(
  "renders both synthetic views and restores ordinary renderer state",
  async (session) => {
    const state = await stereoState(session);

    expect(state.left.count).toBeGreaterThan(50);
    expect(state.right.count).toBeGreaterThan(50);
    expect(state.presentingDuringRead).toBe(true);
    expect(state.targetSelectedDuringRead).toBe(true);
    expect(state.restored).toBe(true);
    expectNoSessionErrors(session.diagnostics);
  },
);

async function stereoState(session: {
  stepFrame(count?: number): Promise<unknown>;
  objects: { inspect(target: { tag: string }): Promise<unknown> };
}) {
  let inspection: { state?: { pending?: boolean } } | undefined;
  for (let frame = 0; frame < 80; frame += 1) {
    inspection = (await session.objects.inspect({
      tag: "screen-overlay-stereo-result",
    })) as { state?: { pending?: boolean } };
    if (inspection.state?.pending === false) break;
    await session.stepFrame(1);
  }
  expect(inspection?.state).toBeDefined();
  expect(inspection!.state!.pending).toBe(false);
  return inspection!.state as {
    error: string | null;
    left: { count: number };
    monoImage: string;
    monoRed: number[];
    presentingDuringRead: boolean;
    restored: boolean;
    right: { count: number };
    targetSelectedDuringRead: boolean;
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
