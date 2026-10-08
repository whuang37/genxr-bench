import * as THREE from "three";
import { expect, it } from "@xrblocks/devtools/test";

import {
  controller,
  inputAt,
  mountedCard,
  update,
} from "./fixtures/card-edge.ts";

it("keeps straight-side edge translation available", async () => {
  const { card, edgeSurface, interaction } = await mountedCard();
  const source = controller();
  const straightBand = new THREE.Vector2(0.5, 0.95);

  attemptTranslation(interaction, source, edgeSurface, straightBand);

  expect(card.phases).toContain("start");
});

it("does not start edge translation from the card interior or outside", async () => {
  for (const uv of [
    new THREE.Vector2(0.5, 0.5),
    new THREE.Vector2(1.05, 0.5),
    new THREE.Vector2(0.99, 0.99),
  ]) {
    const { card, edgeSurface, interaction } = await mountedCard();
    const source = controller();
    attemptTranslation(interaction, source, edgeSurface, uv);
    expect(card.phases).toEqual([]);
  }
});

function attemptTranslation(
  interaction: Awaited<ReturnType<typeof mountedCard>>["interaction"],
  source: ReturnType<typeof controller>,
  surface: THREE.Object3D,
  uv: THREE.Vector2,
): void {
  update(interaction, inputAt(source, false, surface, uv));
  update(interaction, inputAt(source, true, surface, uv));
  update(interaction, inputAt(source, false, surface, uv));
}
