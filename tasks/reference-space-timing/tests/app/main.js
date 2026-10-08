import * as xb from "xrblocks";

const marker = new xb.Script();
marker.userData.xrblocksDevtools = {
  tag: "reference-space-marker",
  state: { ready: true },
};
xb.add(marker);

const options = new xb.Options();
options.referenceSpaceType = "local";
options.webxrRequiredFeatures = ["local-floor"];
options.webxrOptionalFeatures = ["anchors"];
await xb.init(options);
