import * as xb from "xrblocks";

const card = new xb.UICard({
  size: { width: 0.6, height: 0.4 },
  manipulation: true,
  edge: true,
  style: {
    padding: 32,
    borderRadius: 64,
    backgroundColor: "#202124",
  },
  children: [new xb.UIText({ text: "Drag the highlighted edge" })],
});
card.position.set(0, 1.4, -1);

document.addEventListener("DOMContentLoaded", async () => {
  xb.add(card);
  await xb.init(new xb.Options());
});
