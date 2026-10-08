import { expect, it_session } from "@xrblocks/devtools/test";

it_session(
  "preserves ordinary depth occlusion, layer filtering, and render cleanup",
  async (session) => {
    await session.stepFrame(2);
    const inspection = await session.objects.inspect({
      tag: "occlusion-frustum-bounds",
    });

    expect(inspection.state).toMatchObject({
      inBoundsBehindCoverage: expect.any(Number),
      inBoundsFrontCoverage: expect.any(Number),
      nonOccludableCoverage: expect.any(Number),
      resizedTargetCoverages: expect.any(Array),
      renderStateRestored: true,
    });
    const state = inspection.state as {
      inBoundsBehindCoverage: number;
      inBoundsFrontCoverage: number;
      nonOccludableCoverage: number;
      resizedTargetCoverages: number[];
    };
    expect(state.inBoundsBehindCoverage).toBeLessThan(0.15);
    expect(state.inBoundsFrontCoverage).toBeGreaterThan(0.5);
    expect(state.nonOccludableCoverage).toBeGreaterThan(0.65);
    expect(state.resizedTargetCoverages).toHaveLength(2);
    for (const coverage of state.resizedTargetCoverages) {
      expect(coverage).toBeLessThan(0.2);
    }
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
