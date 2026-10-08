import { expect, it_session } from "@xrblocks/devtools/test";

it_session(
  "keeps screen overlay proportions in both synthetic WebXR eye views",
  async (session) => {
    const state = await stereoState(session);
    const leftRatio = state.left.width / state.left.height;
    const rightRatio = state.right.width / state.right.height;

    expect(state.error).toBeNull();
    expect(state.stereoImage).toMatch(/^data:image\/png;base64,/);
    expect(leftRatio).toBeGreaterThan(0.88);
    expect(leftRatio).toBeLessThan(1.12);
    expect(rightRatio).toBeGreaterThan(0.88);
    expect(rightRatio).toBeLessThan(1.12);
    expect(Math.abs(state.left.centerX - state.right.centerX)).toBeLessThan(
      0.02,
    );
    expect(Math.abs(state.left.centerY - state.right.centerY)).toBeLessThan(
      0.02,
    );

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
    left: MarkerBounds;
    right: MarkerBounds;
    stereoImage: string;
  };
}

interface MarkerBounds {
  centerX: number;
  centerY: number;
  count: number;
  height: number;
  width: number;
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
