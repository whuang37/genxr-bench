import * as THREE from "three";
import * as xb from "xrblocks";

class MoveAndScaleModel extends xb.Script {
  constructor() {
    super();
    this.position.set(0, 1.25, -1.4);
    this.xb = {
      manipulation: { actions: { translate: true, scale: true } },
    };
    this.state = { events: [] };
    this.userData.xrblocksDevtools = {
      tag: "phase-model",
      state: this.state,
    };
    this.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x4285f4 }),
      ),
    );
  }

  onObjectManipulate(event) {
    if (event.phase !== "update")
      this.state.events.push(`${event.action}:${event.phase}`);
  }
}

class EvaluationApp extends xb.Script {
  init() {
    this.add(
      new THREE.HemisphereLight(0xffffff, 0x666666, 3),
      new MoveAndScaleModel(),
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  xb.add(new EvaluationApp());
  xb.init(new xb.Options());
});
