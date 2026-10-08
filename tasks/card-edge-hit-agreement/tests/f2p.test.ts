import { expect, it } from "@xrblocks/devtools/test";

import { mountedCard } from "./fixtures/card-edge.ts";

it("keeps the visible edge mapped after card layout changes", async () => {
  const { card, resize } = await mountedCard();

  card.style.borderRadius = 40;
  const resizedEdge = resize({ width: 0.9, height: 0.55 });

  expect(resizedEdge.parent).not.toBeNull();
});
