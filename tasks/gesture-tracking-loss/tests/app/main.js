import * as xb from "xrblocks";

const options = new xb.Options();
options.enableGestures();
options.gestures.setGestureEnabled("grab", true);

document.addEventListener("DOMContentLoaded", async () => {
  await xb.init(options);
});
