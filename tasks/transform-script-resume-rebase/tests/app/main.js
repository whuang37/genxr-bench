import * as THREE from "three";
import * as xb from "xrblocks";

class EvaluationApp extends xb.Script {
  init() {
    this.add(new THREE.HemisphereLight(0xffffff, 0x666666, 3));
    const card = new xb.UICard({
      size: { width: 360, height: 180 },
      pixelSize: 0.001,
      manipulation: true,
      children: [new xb.UIText({ text: "Follow me" })],
    });
    card.position.set(0, 1.45, -1.2);
    card.userData.xrblocksDevtools = { tag: "follow-card" };
    card.add(
      new xb.FollowHead({
        offset: new THREE.Vector3(0, -0.15, -1.2),
        smoothing: 1,
      }),
    );
    this.add(card);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  xb.add(new EvaluationApp());
  const options = new xb.Options();
  options.simulator.defaultMode = xb.SimulatorMode.POSE;
  xb.init(options);
});
