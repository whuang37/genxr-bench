import * as THREE from "three";
import * as xb from "xrblocks";

class ManipulableModel extends xb.Script {
  constructor(color, x, tag) {
    super();
    this.position.set(x, 1.25, -1.4);
    this.userData.xrblocksDevtools = { tag };
    this.xb = { manipulation: { actions: { translate: true } } };
    this.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.12),
        new THREE.MeshStandardMaterial({ color }),
      ),
    );
    for (const [index, handleX] of [-0.22, 0.22].entries()) {
      const handle = new THREE.Mesh(
        new THREE.SphereGeometry(0.08),
        new THREE.MeshStandardMaterial({ color: 0xffffff }),
      );
      handle.position.x = handleX;
      handle.xb = { manipulationHandle: { action: "translate" } };
      handle.userData.xrblocksDevtools = { tag: `${tag}-handle-${index + 1}` };
      this.add(handle);
    }
  }

  onObjectManipulate() {}
}

class EvaluationApp extends xb.Script {
  init() {
    this.add(
      new THREE.HemisphereLight(0xffffff, 0x666666, 3),
      new ManipulableModel(0x4285f4, -0.3, "blue-model"),
      new ManipulableModel(0x34a853, 0.3, "green-model"),
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  xb.add(new EvaluationApp());
  xb.init(new xb.Options());
});
