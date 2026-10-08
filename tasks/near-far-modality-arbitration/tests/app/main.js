import * as THREE from "three";
import * as xb from "xrblocks";

class InteractiveTarget extends xb.Script {
  constructor(color, z, size) {
    super();
    this.position.set(0, 1.25, z);
    this.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(size, size, 0.08),
        new THREE.MeshStandardMaterial({ color }),
      ),
    );
  }

  onObjectTouchStart() {}

  onHoverEnter() {}
}

class EvaluationApp extends xb.Script {
  init() {
    this.add(
      new THREE.HemisphereLight(0xffffff, 0x666666, 3),
      new InteractiveTarget(0x4285f4, -0.8, 0.32),
      new InteractiveTarget(0xea4335, -1.4, 0.7),
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  xb.add(new EvaluationApp());
  xb.init(new xb.Options());
});
