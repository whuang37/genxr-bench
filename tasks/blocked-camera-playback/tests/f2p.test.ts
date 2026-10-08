import { expect, it_session } from "@xrblocks/devtools/test";

it_session(
  "keeps the public camera ready when browser autoplay is rejected",
  async (session) => {
    await session.stepFrame(3);
    const inspection = await session.objects.inspect({
      tag: "blocked-camera-playback",
    });

    expect(inspection.state).toMatchObject({
      appReady: true,
      cameraAvailable: true,
      height: 480,
      loaded: true,
      state: "streaming",
      streamAttached: true,
      unhandledRejections: 0,
      width: 640,
    });
    expect(
      (inspection.state as { autoplayAttempts: number }).autoplayAttempts,
    ).toBeGreaterThan(0);
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
