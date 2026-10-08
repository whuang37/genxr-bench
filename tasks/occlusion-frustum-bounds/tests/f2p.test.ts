import { expect, it_session } from "@xrblocks/devtools/test";

it_session(
  "keeps virtual content visible beyond every depth-image edge",
  async (session) => {
    await session.stepFrame(2);
    const inspection = await session.objects.inspect({
      tag: "occlusion-frustum-bounds",
    });

    const state = inspection.state as {
      outOfBoundsCoverages: number[];
      partialEdgeCoverage: number;
      transformedViewCoverage: number;
    };
    expect(state.outOfBoundsCoverages).toHaveLength(4);
    for (const coverage of state.outOfBoundsCoverages) {
      expect(coverage).toBeGreaterThan(0.65);
    }
    // The edge passes through this virtual plane. Some, but not all, pixels
    // must remain visible; this does not depend on a particular blur kernel.
    expect(state.partialEdgeCoverage).toBeGreaterThan(0.12);
    expect(state.partialEdgeCoverage).toBeLessThan(0.9);
    // A non-primary depth view can use a differently transformed projection.
    expect(state.transformedViewCoverage).toBeGreaterThan(0.65);
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
