import { expect, it } from "@xrblocks/devtools/test";

import { getPlatform, makeCore } from "./fixtures/reference-space.ts";

it("configures the selected reference space before the first session uses it", async () => {
  const core = await makeCore({ referenceSpaceType: "local" });
  const platform = getPlatform();

  core.webXRSessionManager!.startSession();
  await platform.sessionStarted.promise;

  expect(platform.sessions).toHaveLength(1);
  expect(platform.sessions[0]?.requestedReferenceSpaces).toEqual(["local"]);
  await core.dispose();
});
