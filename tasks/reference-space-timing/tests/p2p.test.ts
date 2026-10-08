import { expect, it } from "@xrblocks/devtools/test";
import { vi } from "vitest";

import { getPlatform, makeCore } from "./fixtures/reference-space.ts";

it("keeps local-floor as the default across normal session restarts", async () => {
  const core = await makeCore({
    requiredFeatures: ["hand-tracking"],
    optionalFeatures: ["depth-sensing"],
  });
  const platform = getPlatform();

  core.webXRSessionManager!.startSession();
  await vi.waitFor(() => {
    expect(platform.sessions).toHaveLength(1);
    expect(core.webXRSessionManager!.currentSession).toBeDefined();
  });
  await core.webXRSessionManager!.endSession();
  core.webXRSessionManager!.startSession();
  await vi.waitFor(() => {
    expect(platform.sessions).toHaveLength(2);
    expect(core.webXRSessionManager!.currentSession).toBeDefined();
  });

  expect(
    platform.sessions.map((session) => session.requestedReferenceSpaces[0]),
  ).toEqual(["local-floor", "local-floor"]);
  expect(platform.sessionOptions[0]?.requiredFeatures).toContain(
    "hand-tracking",
  );
  expect(platform.sessionOptions[0]?.optionalFeatures).toContain(
    "depth-sensing",
  );
  await core.dispose();
});
